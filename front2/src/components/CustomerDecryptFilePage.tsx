import { useEffect, useState } from "react"
import type { EncryptedFile, GoogleDriveFile, UserAccount } from "../Type"

type Props = {
    user: UserAccount
}

type SavedFileResult = {
    savedPath: string
}

function CustomerDecryptFile({ user }: Props) {
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
    const [localFiles, setLocalFiles] = useState<EncryptedFile[]>([])
    const [driveError, setDriveError] = useState("")
    const [loading, setLoading] = useState(true)
    const [downloadingDriveFile, setDownloadingDriveFile] = useState<string | null>(null)
    const [downloadingLocalFile, setDownloadingLocalFile] = useState<number | null>(null)
    const [lastSavedPath, setLastSavedPath] = useState("")

    // Local runtime status banner for toast-free dynamic messaging
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerLocalBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    useEffect(() => {
        let cancelled = false

        const fetchFiles = async () => {
            setLoading(true)
            setDriveError("")

            try {
                // Uploads are stored in Google Drive, while early prototype records remain
                // in the local database. Load both sources so users can find every file here.
                const [driveResponse, localResponse] = await Promise.all([
                    fetch(`http://localhost:8080/cloud-storage/google-drive/files?ownerID=${user.userID}`, {
                        credentials: "include"
                    }),
                    fetch("http://localhost:8080/files", { credentials: "include" })
                ])

                if (cancelled) return

                if (driveResponse.ok) {
                    setDriveFiles(await driveResponse.json())
                } else {
                    const error = await driveResponse.json().catch(() => null)
                    setDriveFiles([])
                    setDriveError(error?.message ?? "REMOTE_DRIVE_FAIL: Unable to communicate with remote storage container.")
                }

                if (localResponse.ok) {
                    setLocalFiles(await localResponse.json())
                } else {
                    setLocalFiles([])
                }
            } catch {
                if (!cancelled) {
                    setDriveFiles([])
                    setLocalFiles([])
                    setDriveError("GATEWAY_DISCONNECT: Remote cloud metadata link down.")
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

    const decryptDriveFile = async (file: GoogleDriveFile) => {
        setDownloadingDriveFile(file.fileId)
        try {
            // JavaFX WebView cannot reliably save browser Blob downloads. The backend
            // decrypts locally, writes the plaintext to Downloads, and returns its path.
            const response = await fetch(
                `http://localhost:8080/cloud-storage/google-drive/files/${encodeURIComponent(file.fileId)}/decrypt-save?ownerID=${user.userID}`,
                { method: "POST", credentials: "include" }
            )
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                triggerLocalBanner(error?.message ?? "DECRYPT_ERR: Check key validity map allocation.", "error")
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            triggerLocalBanner(`SUCCESS: Decrypted ${file.originalName}`, "success")
        } catch {
            triggerLocalBanner("TRANSMIT_FAIL: Pipeline closed during stream extraction.", "error")
        } finally {
            setDownloadingDriveFile(null)
        }
    }

    const decryptLocalFile = async (file: EncryptedFile) => {
        setDownloadingLocalFile(file.fileID)
        try {
            const response = await fetch(`http://localhost:8080/files/${file.fileID}/decrypt-save`, {
                method: "POST",
                credentials: "include"
            })
            if (!response.ok) {
                triggerLocalBanner("DECRYPT_ERR: Legacy decryption routing handler failed.", "error")
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            triggerLocalBanner(`SUCCESS: Saved plaintext to cache registry link.`, "success")
        } catch {
            triggerLocalBanner("NETWORK_ERR: Encryption pipeline block allocation dead.", "error")
        } finally {
            setDownloadingLocalFile(null)
        }
    }

    const removeLocalFile = async (file: EncryptedFile) => {
        try {
            const response = await fetch(`http://localhost:8080/files/${file.fileID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) {
                triggerLocalBanner("PURGE_ERR: Could not release index pointer record.", "error")
                return
            }
            setLocalFiles(current => current.filter(item => item.fileID !== file.fileID))
            triggerLocalBanner("SUCCESS: Decrypted index record purged successfully.", "success")
        } catch {
            triggerLocalBanner("CONNECTION_FAIL: Command rejected by backend manager.", "error")
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div>
            {/* Header section */}
            <div className="border-bottom border-muted pb-2 mb-4">
                <h5 className="workspace-section-heading mb-0">DECRYPT_&_EXTRACT_OPERATIONS</h5>
                <p className="text-muted font-monospace fs-8 mb-0">PULL_CIPHERTEXT_STREAMS_AND_REVERT_TO_PLAINTEXT</p>
            </div>

            {/* Local Component Alert Diagnostics */}
            {localBanner && (
                <div className={`status-banner ${localBanner.type === "error" ? "status-error" : "status-success"} mb-3 py-2 px-3 rounded font-monospace fs-8 d-flex align-items-center gap-2`}>
                    <span className="status-indicator-dot"></span>
                    <span className="status-text text-white">{localBanner.msg}</span>
                </div>
            )}

            {/* File Path Directory Manifest Output */}
            {lastSavedPath && (
                <div className="border border-emerald bg-dark-panel p-3 rounded mb-4 font-monospace fs-8">
                    <div className="text-emerald fw-semibold mb-1">↳ CRYPTO_PIPELINE_OUTPUT_PATH:</div>
                    <code className="text-white style-text-break d-block">{lastSavedPath}</code>
                </div>
            )}

            {/* Google Drive Managed Content Container */}
            <h6 className="font-monospace text-cyan tracking-wider fs-7 mb-2">CLOUD_STORAGE_INDEX (GOOGLE_DRIVE)</h6>
            {loading ? (
                <div className="text-muted font-monospace fs-8 p-3 bg-dark-panel rounded mb-4 animation-pulse">SCANNING_REMOTE_DIRECTORY...</div>
            ) : driveError ? (
                <div className="status-banner status-error mb-4 py-2 px-3 rounded font-monospace fs-8">{driveError}</div>
            ) : driveFiles.length === 0 ? (
                <div className="text-muted font-monospace text-center py-3 bg-dark-panel rounded mb-4 fs-8 border border-dashed border-muted">NO_ENCRYPTED_OBJECTS_FOUND_IN_CLOUD_TARGET</div>
            ) : (
                <div className="d-flex flex-column gap-2 mb-4" style={{ maxHeight: 260, overflowY: "auto" }}>
                    {driveFiles.map(file => (
                        <div key={file.fileId} className="p-2.5 border rounded bg-workspace-card d-flex align-items-center justify-content-between gap-3 font-monospace fs-7">
                            <div className="min-w-0 d-flex align-items-center gap-2">
                                <span className="badge bg-cyan text-dark fs-9 px-2 py-1">DRIVE_NODE</span>
                                <div className="text-truncate">
                                    <div className="table-primary-text fw-semibold text-truncate">{file.originalName}</div>
                                    <div className="text-muted fs-8">
                                        {formatFileSize(file.fileSize)} | REF: {file.fileId.slice(0, 8)}... {file.modifiedAt ? ` | ${new Date(file.modifiedAt).toLocaleDateString()}` : ""}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="sidebar-nav-item w-auto px-3 py-1 font-monospace fs-8 bg-cyan text-white border-0 flex-shrink-0"
                                onClick={() => decryptDriveFile(file)}
                                disabled={downloadingDriveFile === file.fileId}
                            >
                                {downloadingDriveFile === file.fileId ? "DECRYPTING..." : "REVERT_&_SAVE"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Legacy Database Records Pipeline */}
            {!loading && localFiles.length > 0 && (
                <div className="mt-4">
                    <h6 className="font-monospace text-muted tracking-wider fs-7 mb-2">LEGACY_LOCAL_DB_RECORDS</h6>
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                        {localFiles.map(file => (
                            <div key={file.fileID} className="p-2.5 border rounded bg-workspace-card d-flex align-items-center justify-content-between gap-3 font-monospace fs-7">
                                <div className="min-w-0 d-flex align-items-center gap-2">
                                    <span className="badge bg-secondary text-white fs-9 px-2 py-1 uppercase">{file.fileType}</span>
                                    <div className="text-truncate">
                                        <div className="table-primary-text fw-semibold text-truncate">{file.fileName}</div>
                                        <div className="text-muted fs-8">
                                            {formatFileSize(file.fileSize)} | ALGO: {file.encMethod} | {new Date(file.uploadedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 flex-shrink-0">
                                    <button
                                        className="sidebar-nav-item w-auto px-3 py-1 font-monospace fs-8 bg-cyan text-white border-0"
                                        onClick={() => decryptLocalFile(file)}
                                        disabled={downloadingLocalFile === file.fileID}
                                    >
                                        {downloadingLocalFile === file.fileID ? "EXTRACTING..." : "DECRYPT"}
                                    </button>
                                    <button 
                                        className="btn-workspace-action font-monospace text-danger border-danger fs-8 px-2 py-1" 
                                        onClick={() => removeLocalFile(file)}
                                    >
                                        PURGE
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerDecryptFile