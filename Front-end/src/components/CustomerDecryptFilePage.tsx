import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { CloudProviderStatus, CloudStorageLink, EncryptionKeyRecord, GoogleDriveFile, UserAccount } from "../Type"
import { apiFetch } from "../lib/api"
import { decryptFileInBrowser, saveDecryptedFile } from "../crypto/fileEncryption"
import { deriveAndVerifyClientKey, requireClientKeyMetadata } from "../crypto/keyDerivation"
import { formatCloudFileUploadTime, sortCloudFilesNewestFirst } from "../lib/cloudFiles"
import { cloudProviderKeys, reconnectRequiredProviders } from "../lib/cloudProviderStatus"

type Props = { user: UserAccount }
type ProviderFile = GoogleDriveFile & { provider: string; providerLabel: string }

function providerPath(provider: string) {
    return provider === "google_drive" ? "google-drive" : provider
}

function providerLabel(provider: string) {
    if (provider === "google_drive") return "Google Drive"
    if (provider === "dropbox") return "Dropbox"
    if (provider === "onedrive") return "OneDrive"
    return provider
}

function CustomerDecryptFile({ user }: Props) {
    const [files, setFiles] = useState<ProviderFile[]>([])
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [passwords, setPasswords] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [downloading, setDownloading] = useState("")
    const [providersNeedingReconnect, setProvidersNeedingReconnect] = useState<CloudProviderStatus[]>([])
    const keyByFingerprint = useMemo(
        () => new Map(keys.map(key => [key.fingerprint, key])),
        [keys]
    )

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const [linksResponse, keysResponse] = await Promise.all([
                    apiFetch("/cloud-storage/links"),
                    apiFetch("/encryption-keys")
                ])
                if (!linksResponse.ok || !keysResponse.ok) throw new Error("Cloud files could not be loaded.")
                const links = await linksResponse.json() as CloudStorageLink[]
                const loadedKeys = await keysResponse.json() as EncryptionKeyRecord[]
                const statusResults = await Promise.all(cloudProviderKeys.map(async provider => {
                    try {
                        const response = await apiFetch(`/cloud-storage/${providerPath(provider)}/status`)
                        return response.ok ? await response.json() as CloudProviderStatus : null
                    } catch {
                        return null
                    }
                }))
                const statuses = Object.fromEntries(
                    statusResults.filter((status): status is CloudProviderStatus => status !== null)
                        .map(status => [status.provider, status])
                )
                const providers = [...new Set(links.filter(link => link.status === "connected").map(link => link.provider))]
                const results = await Promise.all(providers.map(async provider => {
                    const response = await apiFetch(`/cloud-storage/${providerPath(provider)}/files`)
                    if (!response.ok) return [] as ProviderFile[]
                    const providerFiles = await response.json() as GoogleDriveFile[]
                    return providerFiles
                        .filter(file => file.envelopeVersion === 2)
                        .map(file => ({ ...file, provider, providerLabel: providerLabel(provider) }))
                }))
                if (cancelled) return
                setFiles(sortCloudFilesNewestFirst(results.flat()))
                setKeys(loadedKeys)
                setProvidersNeedingReconnect(reconnectRequiredProviders(statuses))
                setError("")
            } catch (caught) {
                if (!cancelled) setError(caught instanceof Error ? caught.message : "Cloud files could not be loaded.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => { cancelled = true }
    }, [user.userID])

    const decrypt = async (file: ProviderFile) => {
        const field = `${file.provider}:${file.fileId}`
        const password = passwords[field] ?? ""
        const key = file.keyFingerprint ? keyByFingerprint.get(file.keyFingerprint) : null
        if (!key || !password.trim()) {
            toast.error(key ? "Enter the key password." : "The matching encryption key is not available on this account.")
            return
        }
        setDownloading(field)
        try {
            // A wrong password fails locally, before the ciphertext download request is made.
            const derivedKey = await deriveAndVerifyClientKey(password, requireClientKeyMetadata(key))
            const response = await apiFetch(
                `/cloud-storage/${providerPath(file.provider)}/files/${encodeURIComponent(file.fileId)}/download-ciphertext`
            )
            if (!response.ok) {
                const responseError = await response.json().catch(() => null)
                throw new Error(responseError?.message ?? "Ciphertext download failed.")
            }
            const decrypted = await decryptFileInBrowser(await response.arrayBuffer(), derivedKey)
            saveDecryptedFile(decrypted.blob, decrypted.metadata.filename)
            setPasswords(current => {
                const next = { ...current }
                delete next[field]
                return next
            })
            toast.success(`${decrypted.metadata.filename} decrypted locally`)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to decrypt this file.")
        } finally {
            setDownloading("")
        }
    }

    const formatSize = (bytes: number) => bytes < 1024
        ? `${bytes} B`
        : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

    return <>
        <h5 className="mb-1">Decrypt and Download</h5>
        <p className="text-muted mb-3" style={{ fontSize: 13 }}>
            Ciphertext is downloaded from your cloud account and decrypted inside this browser.
        </p>
        {providersNeedingReconnect.map(status => (
            <div key={status.provider} className="alert alert-warning py-2">
                {providerLabel(status.provider)} is disconnected, but StealthSync still has {status.ownedEncryptedFileCount}{" "}
                encrypted file record{status.ownedEncryptedFileCount === 1 ? "" : "s"} for this account.
                Reconnect the same account under Cloud Storage Links before downloading.
            </div>
        ))}
        {loading ? <p className="text-muted">Loading encrypted files...</p>
            : error ? <div className="alert alert-warning py-2">{error}</div>
                : files.length === 0 ? <p className="text-muted">No browser-encrypted V2 cloud files found.</p>
                    : <ul className="list-group" style={{ maxHeight: 520, overflowY: "auto" }}>
                        {files.map(file => {
                            const field = `${file.provider}:${file.fileId}`
                            const key = file.keyFingerprint ? keyByFingerprint.get(file.keyFingerprint) : null
                            return <li key={field} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start gap-3">
                                    <div className="d-flex gap-3 align-items-start min-w-0">
                                        <span className="badge bg-primary" style={{ minWidth: 72 }}>{file.providerLabel}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="fw-medium text-break">Encrypted file</div>
                                            <small className="text-muted">
                                                {formatSize(file.fileSize)} | {file.encMethod} | Fingerprint {file.keyFingerprint ?? "unknown"}
                                            </small>
                                            <div><small className="text-info">{formatCloudFileUploadTime(file)}</small></div>
                                            <div><small className="text-muted text-break">Cloud object: {file.fileName}</small></div>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline-primary btn-sm flex-shrink-0"
                                        onClick={() => void decrypt(file)} disabled={!key || downloading === field}>
                                        {downloading === field ? "Decrypting..." : "Decrypt & Download"}
                                    </button>
                                </div>
                                {key ? <input className="form-control form-control-sm mt-2" type="password"
                                    autoComplete="off" value={passwords[field] ?? ""}
                                    onChange={event => setPasswords(current => ({ ...current, [field]: event.target.value }))}
                                    placeholder={`Password for ${key.keyName}`} />
                                    : <div className="alert alert-warning py-1 mt-2 mb-0">Matching key metadata is unavailable.</div>}
                            </li>
                        })}
                    </ul>}
    </>
}

export default CustomerDecryptFile
