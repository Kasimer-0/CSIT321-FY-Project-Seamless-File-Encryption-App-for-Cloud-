import { apiFetch } from "../lib/api"
import { useEffect, useMemo, useState } from "react"
import type { CloudStorageLink, EncryptedFile, EncryptionKeyRecord, GoogleDriveFile, UserAccount } from "../Type"
import toast from "react-hot-toast"

type Props = {
    user: UserAccount
}

type SavedFileResult = {
    savedPath: string
}

type CloudProviderFile = GoogleDriveFile & {
    provider: string
    providerLabel: string
}

function CustomerDecryptFile({ user }: Props) {
    const [driveFiles, setDriveFiles] = useState<CloudProviderFile[]>([])
    const [localFiles, setLocalFiles] = useState<EncryptedFile[]>([])
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [keyPasswords, setKeyPasswords] = useState<Record<string, string>>({})
    const [driveError, setDriveError] = useState("")
    const [loading, setLoading] = useState(true)
    const [downloadingDriveFile, setDownloadingDriveFile] = useState<string | null>(null)
    const [downloadingLocalFile, setDownloadingLocalFile] = useState<number | null>(null)
    const [lastSavedPath, setLastSavedPath] = useState("")

    const keyByID = useMemo(() => new Map(keys.map(key => [key.keyID, key])), [keys])
    const providerPath = (provider: string) => provider === "google_drive" ? "google-drive" : provider
    const providerLabel = (provider: string) => {
        if (provider === "google_drive") return "Google Drive"
        if (provider === "dropbox") return "Dropbox"
        if (provider === "onedrive") return "OneDrive"
        return provider
    }

    useEffect(() => {
        let cancelled = false

        const fetchFiles = async () => {
            setLoading(true)
            setDriveError("")

            try {
                // Cloud uploads can now live in Google Drive, Dropbox, or OneDrive.
                // Local database records are still loaded for old prototype files.
                const [linksResponse, localResponse, keyResponse] = await Promise.all([
                    apiFetch("http://localhost:8080/cloud-storage/links", { credentials: "include" }),
                    apiFetch("http://localhost:8080/files", { credentials: "include" }),
                    apiFetch("http://localhost:8080/encryption-keys", { credentials: "include" })
                ])

                if (cancelled) return

                if (linksResponse.ok) {
                    const links = await linksResponse.json() as CloudStorageLink[]
                    const connectedProviders = Array.from(new Set(
                        links
                            .filter(link => link.status === "connected")
                            .map(link => link.provider)
                    ))
                    const providerResults = await Promise.all(connectedProviders.map(async provider => {
                        try {
                            const response = await apiFetch(`http://localhost:8080/cloud-storage/${providerPath(provider)}/files`, {
                                credentials: "include"
                            })
                            if (!response.ok) {
                                const error = await response.json().catch(() => null)
                                throw new Error(error?.message ?? `${providerLabel(provider)} files could not be loaded.`)
                            }
                            const files = await response.json() as GoogleDriveFile[]
                            return {
                                files: files.map(file => ({
                                    ...file,
                                    provider,
                                    providerLabel: providerLabel(provider)
                                })),
                                error: ""
                            }
                        } catch (error) {
                            return {
                                files: [] as CloudProviderFile[],
                                error: error instanceof Error ? error.message : `${providerLabel(provider)} files could not be loaded.`
                            }
                        }
                    }))
                    const loadedFiles = providerResults.flatMap(result => result.files)
                    const loadErrors = providerResults.map(result => result.error).filter(Boolean)
                    setDriveFiles(loadedFiles)
                    if (loadedFiles.length === 0 && loadErrors.length > 0) {
                        setDriveError(loadErrors.join(" "))
                    }
                } else {
                    const error = await linksResponse.json().catch(() => null)
                    setDriveFiles([])
                    setDriveError(error?.message ?? "Cloud files could not be loaded.")
                }

                if (localResponse.ok) {
                    setLocalFiles(await localResponse.json())
                } else {
                    setLocalFiles([])
                }

                if (keyResponse.ok) {
                    setKeys(await keyResponse.json())
                } else {
                    setKeys([])
                }
            } catch {
                if (!cancelled) {
                    setDriveFiles([])
                    setLocalFiles([])
                    setKeys([])
                    setDriveError("Server connection failed.")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void fetchFiles()
        return () => {
            cancelled = true
        }
    }, [user.userID])

    const passwordFor = (fieldKey: string) => keyPasswords[fieldKey] ?? ""

    const updatePassword = (fieldKey: string, value: string) => {
        setKeyPasswords(current => ({ ...current, [fieldKey]: value }))
    }

    const driveRequiresPassword = (file: CloudProviderFile) => Boolean(file.keyID)

    const localRequiresPassword = (file: EncryptedFile) => file.keyID != null && keyByID.has(file.keyID)

    const clearPassword = (fieldKey: string) => {
        setKeyPasswords(current => {
            const next = { ...current }
            delete next[fieldKey]
            return next
        })
    }

    const decryptDriveFile = async (file: CloudProviderFile) => {
        const fieldKey = `${file.provider}:${file.fileId}`
        const keyPassword = passwordFor(fieldKey).trim()
        if (driveRequiresPassword(file) && !keyPassword) {
            toast.error("Enter the password for this file's encryption key")
            return
        }

        setDownloadingDriveFile(file.fileId)
        try {
            // JavaFX WebView cannot reliably save browser Blob downloads. The backend
            // decrypts locally, writes the plaintext to Downloads, and returns its path.
            const response = await apiFetch(
                `http://localhost:8080/cloud-storage/${providerPath(file.provider)}/files/${encodeURIComponent(file.fileId)}/decrypt-save`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ keyPassword })
                }
            )
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? `Failed to decrypt and save the ${file.providerLabel} file`)
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            clearPassword(fieldKey)
            toast.success(`${file.originalName} saved to ${result.savedPath}`)
        } catch {
            toast.error("Server connection failed")
        } finally {
            setDownloadingDriveFile(null)
        }
    }

    const decryptLocalFile = async (file: EncryptedFile) => {
        const fieldKey = `local:${file.fileID}`
        const keyPassword = passwordFor(fieldKey).trim()
        if (localRequiresPassword(file) && !keyPassword) {
            toast.error("Enter the password for this file's encryption key")
            return
        }

        setDownloadingLocalFile(file.fileID)
        try {
            const response = await apiFetch(`http://localhost:8080/files/${file.fileID}/decrypt-save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ keyPassword })
            })
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to decrypt and save the local file")
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            clearPassword(fieldKey)
            toast.success(`${file.fileName} saved to ${result.savedPath}`)
        } catch {
            toast.error("Server connection failed")
        } finally {
            setDownloadingLocalFile(null)
        }
    }

    const removeLocalFile = async (file: EncryptedFile) => {
        // Local records use a separate endpoint so this action cannot remove a remote cloud object.
        const response = await apiFetch(`http://localhost:8080/files/${file.fileID}`, {
            method: "DELETE",
            credentials: "include"
        })
        if (!response.ok) {
            toast.error("Failed to delete the local encrypted record")
            return
        }
        setLocalFiles(current => current.filter(item => item.fileID !== file.fileID))
        toast.success(`${file.fileName} deleted`)
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const driveKeyLabel = (file: CloudProviderFile) => {
        if (file.keyName) return `${file.keyName}${file.keyFingerprint ? ` (${file.keyFingerprint})` : ""}`
        if (file.keyID) return `Key #${file.keyID}`
        return "Legacy vault key"
    }

    const localKeyLabel = (file: EncryptedFile) => {
        const key = keyByID.get(file.keyID)
        if (key) return `${key.keyName} (${key.fingerprint})`
        return "Legacy vault key"
    }

    return (
        <>
            <h5 className="mb-1">Decrypt and Download</h5>
            <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                Encrypted files from your linked Google Drive, Dropbox, and OneDrive accounts.
            </p>

            {lastSavedPath && (
                <div className="alert alert-success py-2" role="status">
                    <div className="fw-semibold">Decrypted file saved successfully</div>
                    <code style={{ overflowWrap: "anywhere" }}>{lastSavedPath}</code>
                </div>
            )}

            <h6 className="mb-2">Cloud provider files</h6>
            {loading ? (
                <p className="text-muted" style={{ fontSize: 13 }}>Loading files...</p>
            ) : driveError ? (
                <div className="alert alert-warning py-2" style={{ fontSize: 13 }}>{driveError}</div>
            ) : driveFiles.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>No encrypted cloud files found.</p>
            ) : (
                <ul className="list-group mb-4" style={{ maxHeight: 420, overflowY: "auto" }}>
                    {driveFiles.map(file => {
                        const fieldKey = `${file.provider}:${file.fileId}`
                        return (
                            <li key={`${file.provider}:${file.fileId}`} className="list-group-item">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex align-items-center gap-3 min-w-0">
                                        <span className="badge bg-primary" style={{ fontSize: 10, minWidth: 72 }}>{file.providerLabel}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="fw-medium text-break" style={{ fontSize: 14 }}>{file.originalName}</div>
                                            <small className="text-muted">
                                                {formatFileSize(file.fileSize)} | {file.encMethod ?? "AES-GCM"} | {driveKeyLabel(file)}
                                                {file.modifiedAt ? ` | ${new Date(file.modifiedAt).toLocaleDateString()}` : ""}
                                            </small>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-outline-primary btn-sm flex-shrink-0"
                                        onClick={() => decryptDriveFile(file)}
                                        disabled={downloadingDriveFile === file.fileId}
                                    >
                                        {downloadingDriveFile === file.fileId ? "Decrypting..." : "Decrypt & Download"}
                                    </button>
                                </div>
                                {driveRequiresPassword(file) && (
                                    <input
                                        className="form-control form-control-sm mt-2"
                                        type="password"
                                        value={passwordFor(fieldKey)}
                                        onChange={e => updatePassword(fieldKey, e.target.value)}
                                        placeholder="Password for this encryption key"
                                    />
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            {!loading && localFiles.length > 0 && (
                <>
                    <h6 className="mb-2">Legacy local files</h6>
                    <ul className="list-group" style={{ maxHeight: 300, overflowY: "auto" }}>
                        {localFiles.map(file => {
                            const fieldKey = `local:${file.fileID}`
                            return (
                                <li key={file.fileID} className="list-group-item">
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <span className="badge bg-secondary" style={{ fontFamily: "monospace", fontSize: 10, minWidth: 40 }}>
                                                {file.fileType.toUpperCase()}
                                            </span>
                                            <div>
                                                <div className="fw-medium" style={{ fontSize: 14 }}>{file.fileName}</div>
                                                <small className="text-muted">
                                                    {formatFileSize(file.fileSize)} | {file.encMethod} | {localKeyLabel(file)} | {new Date(file.uploadedAt).toLocaleDateString()}
                                                </small>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 flex-shrink-0">
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => decryptLocalFile(file)}
                                                disabled={downloadingLocalFile === file.fileID}
                                            >
                                                {downloadingLocalFile === file.fileID ? "Decrypting..." : "Decrypt & Download"}
                                            </button>
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => removeLocalFile(file)}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {localRequiresPassword(file) && (
                                        <input
                                            className="form-control form-control-sm mt-2"
                                            type="password"
                                            value={passwordFor(fieldKey)}
                                            onChange={e => updatePassword(fieldKey, e.target.value)}
                                            placeholder="Password for this encryption key"
                                        />
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </>
            )}
        </>
    )
}

export default CustomerDecryptFile
