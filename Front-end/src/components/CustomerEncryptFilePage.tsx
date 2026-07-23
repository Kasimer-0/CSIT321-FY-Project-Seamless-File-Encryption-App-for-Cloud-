import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { CloudStorageLink, EncryptionKeyRecord } from "../Type"
import { apiFetch } from "../lib/api"
import { encryptFileInBrowser } from "../crypto/fileEncryption"
import { deriveAndVerifyClientKey, KEY_SCHEME_V2, requireClientKeyMetadata } from "../crypto/keyDerivation"
import { scanFileLocally } from "../security/privacyScanner"

function providerPath(provider?: string) {
    return provider === "google_drive" ? "google-drive" : provider ?? "google-drive"
}

function providerLabel(provider?: string) {
    if (provider === "google_drive") return "Google Drive"
    if (provider === "dropbox") return "Dropbox"
    if (provider === "onedrive") return "OneDrive"
    return "the active cloud provider"
}

function CustomerEncryptFile() {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [privacyWarnings, setPrivacyWarnings] = useState<string[]>([])
    const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false)
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [selectedKeyID, setSelectedKeyID] = useState<number | null>(null)
    const [keyPassword, setKeyPassword] = useState("")
    const [loading, setLoading] = useState(true)
    const [activeCloudLink, setActiveCloudLink] = useState<CloudStorageLink | null>(null)

    const selectedKey = useMemo(
        () => keys.find(key => key.keyID === selectedKeyID) ?? null,
        [keys, selectedKeyID]
    )

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [keyResponse, linkResponse] = await Promise.all([
                    apiFetch("/encryption-keys"),
                    apiFetch("/cloud-storage/links")
                ])
                if (!keyResponse.ok || !linkResponse.ok) throw new Error("Unable to load encryption setup.")
                const allKeys = await keyResponse.json() as EncryptionKeyRecord[]
                const links = await linkResponse.json() as CloudStorageLink[]
                if (cancelled) return
                // New uploads use browser-derived V2 keys only; legacy keys remain visible on the key page.
                const activeKeys = allKeys.filter(key => key.status === "active" && key.keyScheme === KEY_SCHEME_V2)
                setKeys(activeKeys)
                setSelectedKeyID(activeKeys[0]?.keyID ?? null)
                setActiveCloudLink(links.find(link => link.status === "connected" && link.isActive) ?? null)
            } catch (error) {
                if (!cancelled) toast.error(error instanceof Error ? error.message : "Unable to load encryption setup.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => { cancelled = true }
    }, [])

    const chooseFile = (file?: File) => {
        if (!file) return
        if (file.size === 0 && file.name.startsWith("file:")) {
            toast.error("This browser cannot read the dropped file. Use Browse instead.")
            return
        }
        setSelectedFile(file)
        setPrivacyWarnings([])
    }

    const upload = async (privacyConfirmed = false) => {
        if (!selectedFile || !selectedKey || !activeCloudLink || !keyPassword.trim()) {
            toast.error("Select a file, active V2 key, key password, and active cloud provider.")
            return
        }
        setUploading(true)
        try {
            if (!privacyConfirmed) {
                const warnings = await scanFileLocally(selectedFile)
                if (warnings.length > 0) {
                    setPrivacyWarnings(warnings)
                    setShowPrivacyConfirm(true)
                    return
                }
            }

            // Password verification and file encryption happen before any network request.
            const key = await deriveAndVerifyClientKey(
                keyPassword,
                requireClientKeyMetadata(selectedKey)
            )
            const encrypted = await encryptFileInBrowser(selectedFile, key)
            const form = new FormData()
            form.append("file", encrypted.blob, encrypted.objectName)
            form.append("objectName", encrypted.objectName)
            form.append("plaintextSize", String(encrypted.plaintextSize))
            const response = await apiFetch(
                `/cloud-storage/${providerPath(activeCloudLink.provider)}/files/upload-ciphertext`,
                { method: "POST", body: form }
            )
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                throw new Error(error?.message ?? "Encrypted upload failed.")
            }
            toast.success(`Encrypted ciphertext uploaded to ${providerLabel(activeCloudLink.provider)}`)
            setSelectedFile(null)
            setKeyPassword("")
            setPrivacyWarnings([])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Encrypted upload failed.")
        } finally {
            setUploading(false)
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    return <>
        <h5 className="mb-1">Encrypt and Upload</h5>
        <p className="text-muted mb-3" style={{ fontSize: 13 }}>
            Files are encrypted in this browser before ciphertext is sent to the active cloud provider.
        </p>
        <p className="text-muted mb-3" style={{ fontSize: 13 }}>
            Destination: {activeCloudLink
                ? `${providerLabel(activeCloudLink.provider)} (${activeCloudLink.accountEmail})`
                : "No active cloud provider"}
        </p>

        {!activeCloudLink && <div className="alert alert-warning py-2">Activate a linked cloud account first.</div>}
        {!loading && keys.length === 0 && <div className="alert alert-warning py-2">Create an active browser-derived key first.</div>}

        <div className="card p-3 mb-4">
            <div className="row g-2 align-items-end">
                <div className="col-12 col-md-5">
                    <label className="form-label mb-1">Encryption Key</label>
                    <select className="form-select" value={selectedKeyID ?? ""}
                        onChange={event => setSelectedKeyID(event.target.value ? Number(event.target.value) : null)}
                        disabled={loading || keys.length === 0}>
                        <option value="">{loading ? "Loading keys..." : "Select key"}</option>
                        {keys.map(key => <option key={key.keyID} value={key.keyID}>
                            {key.keyName} ({key.algorithm}, {key.fingerprint})
                        </option>)}
                    </select>
                </div>
                <div className="col-12 col-md-5">
                    <label className="form-label mb-1">Key Password</label>
                    <input className="form-control" type="password" value={keyPassword}
                        onChange={event => setKeyPassword(event.target.value)}
                        autoComplete="off" placeholder="Used locally only" />
                </div>
                <div className="col-12 col-md-2">
                    <button className="btn btn-primary w-100" onClick={() => void upload()}
                        disabled={!selectedFile || !selectedKey || !activeCloudLink || !keyPassword || uploading}>
                        {uploading ? "Encrypting..." : "Encrypt & Upload"}
                    </button>
                </div>
            </div>
        </div>

        <div className={`border rounded p-5 text-center mb-4 ${dragOver ? "border-primary bg-primary bg-opacity-10" : "border-secondary"}`}
            style={{ borderStyle: "dashed", borderWidth: 2, cursor: "pointer" }}
            onDragOver={event => { event.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={event => { event.preventDefault(); setDragOver(false); chooseFile(event.dataTransfer.files?.[0]) }}
            onClick={() => document.getElementById("v2FileInput")?.click()}>
            <div className="fw-medium mb-1">Drop a file here</div>
            <small className="text-muted">or click to browse</small>
            <input id="v2FileInput" type="file" hidden onChange={event => chooseFile(event.target.files?.[0])} />
        </div>

        {selectedFile && <div className="border rounded p-3 mb-4 d-flex justify-content-between align-items-center">
            <div><div className="fw-medium">{selectedFile.name}</div><small className="text-muted">{formatSize(selectedFile.size)}</small></div>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedFile(null)}>Clear</button>
        </div>}

        {showPrivacyConfirm && selectedFile && <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
            <div className="card p-4" style={{ width: 420 }}>
                <h6>Privacy Warning</h6>
                <p className="text-muted">A local rule-based scan found possible sensitive data:</p>
                <ul>{privacyWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setShowPrivacyConfirm(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => { setShowPrivacyConfirm(false); void upload(true) }}>Encrypt Anyway</button>
                </div>
            </div>
        </div>}
    </>
}

export default CustomerEncryptFile
