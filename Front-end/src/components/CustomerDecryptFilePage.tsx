import { apiFetch } from "../lib/api"
import { useEffect, useState } from "react"
import type { EncryptedFile, GoogleDriveFile, UserAccount } from "../Type"

type Props = {
    user: UserAccount
}

type SavedFileResult = {
    savedPath: string
}

type EncryptionKeyRecord = {
    keyID: number
    keyName: string
}

function CustomerDecryptFile({ user }: Props) {
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
    const [localFiles, setLocalFiles] = useState<EncryptedFile[]>([])
    const [keyMap, setKeyMap] = useState<Record<number, string>>({}) // Lookup dictionary for keyID -> keyName
    const [driveError, setDriveError] = useState("")
    const [loading, setLoading] = useState(true)
    const [downloadingDriveFile, setDownloadingDriveFile] = useState<string | null>(null)
    const [downloadingLocalFile, setDownloadingLocalFile] = useState<number | null>(null)
    const [lastSavedPath, setLastSavedPath] = useState("")

    const [fileToDelete, setFileToDelete] = useState<EncryptedFile | null>(null)
    const [driveFileToDecrypt, setDriveFileToDecrypt] = useState<GoogleDriveFile | null>(null)
    const [localFileToDecrypt, setLocalFileToDecrypt] = useState<EncryptedFile | null>(null)

    // Password verification states
    const [keyPassword, setKeyPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")

    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerLocalBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    useEffect(() => {
        let cancelled = false

        const fetchAllData = async () => {
            setLoading(true)
            setDriveError("")

            try {
                // Fetch drive files, local files, and user's encryption keys simultaneously
                const [driveResponse, localResponse, keysResponse] = await Promise.all([
                    apiFetch("http://localhost:8080/cloud-storage/google-drive/files", {
                        credentials: "include"
                    }),
                    apiFetch("http://localhost:8080/files", { credentials: "include" }),
                    apiFetch("http://localhost:8080/encryption-keys", { credentials: "include" })
                ])

                if (cancelled) return

                // 1. Process Encryption Keys Map
                if (keysResponse.ok) {
                    const keysData = await keysResponse.json() as EncryptionKeyRecord[]
                    const mapping: Record<number, string> = {}
                    keysData.forEach(k => {
                        mapping[k.keyID] = k.keyName
                    })
                    setKeyMap(mapping)
                }

                // 2. Process Google Drive Files
                if (driveResponse.ok) {
                    setDriveFiles(await driveResponse.json())
                } else {
                    const error = await driveResponse.json().catch(() => null)
                    setDriveFiles([])
                    setDriveError(error?.message ?? "Unable to fetch cloud files.")
                }

                // 3. Process Local Files
                if (localResponse.ok) {
                    setLocalFiles(await localResponse.json())
                } else {
                    setLocalFiles([])
                }
            } catch {
                if (!cancelled) {
                    setDriveFiles([])
                    setLocalFiles([])
                    setDriveError("Failed to synchronize application data.")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void fetchAllData()
        return () => {
            cancelled = true
        }
    }, [user.userID])

    const closeDecryptModals = () => {
        setDriveFileToDecrypt(null)
        setLocalFileToDecrypt(null)
        setKeyPassword("")
        setPasswordError("")
    }

    const getKeyDisplayName = (keyID: number | undefined) => {
        if (!keyID) return "Default Master Key"
        return keyMap[keyID] ?? `Key #${keyID}`
    }

    const executeDriveDecrypt = async () => {
        if (!driveFileToDecrypt) return
        if (!keyPassword.trim()) {
            setPasswordError("Password is required to unlock this key.")
            return
        }

        const targetFile = driveFileToDecrypt
        const passwordToSend = keyPassword
        closeDecryptModals()
        setDownloadingDriveFile(targetFile.fileId)
        
        try {
            const response = await apiFetch(
                `http://localhost:8080/cloud-storage/google-drive/files/${encodeURIComponent(targetFile.fileId)}/decrypt-save`,
                { 
                    method: "POST", 
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyPassword: passwordToSend })
                }
            )
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                triggerLocalBanner(error?.message ?? "Decryption failed. Invalid credentials.", "error")
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            triggerLocalBanner("File decrypted and downloaded successfully.", "success")
        } catch {
            triggerLocalBanner("Decryption failed due to network issues.", "error")
        } finally {
            setDownloadingDriveFile(null)
        }
    }

    const executeLocalDecrypt = async () => {
        if (!localFileToDecrypt) return
        if (!keyPassword.trim()) {
            setPasswordError("Password is required to unlock this key.")
            return
        }

        const targetFile = localFileToDecrypt
        const passwordToSend = keyPassword
        closeDecryptModals()
        setDownloadingLocalFile(targetFile.fileID)
        
        try {
            const response = await apiFetch(`http://localhost:8080/files/${targetFile.fileID}/decrypt-save`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyPassword: passwordToSend })
            })
            if (!response.ok) {
                triggerLocalBanner("Decryption failed. Invalid credentials.", "error")
                return
            }

            const result = await response.json() as SavedFileResult
            setLastSavedPath(result.savedPath)
            triggerLocalBanner("File decrypted and downloaded successfully.", "success")
        } catch {
            triggerLocalBanner("Decryption failed.", "error")
        } finally {
            setDownloadingLocalFile(null)
        }
    }

    const executeDeleteFile = async () => {
        if (!fileToDelete) return
        try {
            const response = await apiFetch(`http://localhost:8080/files/${fileToDelete.fileID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) {
                triggerLocalBanner("Failed to delete file.", "error")
                return
            }
            setLocalFiles(current => current.filter(item => item.fileID !== fileToDelete.fileID))
            triggerLocalBanner("File deleted successfully.", "success")
        } catch {
            triggerLocalBanner("Failed to delete file.", "error")
        } finally {
            setFileToDelete(null)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="w-100 text-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="border-bottom border-secondary pb-2 mb-4">
                <h5 className="text-white fw-bold mb-1" style={{ fontSize: "1.25rem", letterSpacing: "0.5px" }}>
                    File Decryption & Download
                </h5>
                <p className="text-light-50 opacity-75 mb-0" style={{ fontSize: "0.85rem" }}>
                    Decrypt and extract your files securely back into your native target environment.
                </p>
            </div>

            {localBanner && (
                <div 
                    className={`status-banner ${localBanner.type === "error" ? "bg-danger bg-opacity-20 border border-danger text-danger" : "bg-success bg-opacity-20 border border-success text-white"} mb-3 py-2 px-3 rounded small d-flex align-items-center gap-2 fw-medium`} 
                    style={{ fontSize: "0.85rem" }}
                >
                    <span className="p-1 rounded-circle bg-current" style={{ width: "6px", height: "6px" }}></span>
                    <span>{localBanner.msg}</span>
                </div>
            )}

            {lastSavedPath && (
                <div className="border border-success bg-dark p-3 rounded mb-4 small" style={{ backgroundColor: "#1c1f22" }}>
                    <div className="text-success fw-bold mb-1" style={{ fontSize: "0.9rem" }}>File Directory:</div>
                    <span className="text-white text-break d-block mt-1" style={{ fontSize: "0.85rem" }}>{lastSavedPath}</span>
                </div>
            )}

            <h6 className="text-info fw-bold tracking-wider mb-2" style={{ fontSize: "1.05rem", letterSpacing: "0.5px" }}>
                Linked Cloud Storage Platform
            </h6>
            
            {loading ? (
                <div className="text-white opacity-75 p-3 bg-dark rounded mb-4 fw-medium" style={{ fontSize: "0.85rem", backgroundColor: "#212529" }}>  
                    Scanning...
                </div>
            ) : driveError ? (
                <div className="bg-danger bg-opacity-10 border border-danger text-danger mb-4 py-2 px-3 rounded small fw-medium" style={{ fontSize: "0.85rem" }}>
                    {driveError}
                </div>
            ) : driveFiles.length === 0 ? (
                <div className="text-muted text-center py-5 bg-dark rounded mb-4 border border-dashed border-secondary small fw-medium" style={{ backgroundColor: "#212529", borderColor: "#495057" }}>
                    No encrypted files found in cloud storage.
                </div>
            ) : (
                <div className="d-flex flex-column gap-2 mb-4" style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {driveFiles.map(file => (
                        <div key={file.fileId} className="p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ backgroundColor: "#1c1f22", borderColor: "#343a40" }}>
                            <div className="min-w-0 d-flex align-items-center gap-2">
                                <span className="badge bg-info text-dark px-2 py-1 fw-bold" style={{ fontSize: "10px", borderRadius: "3px" }}>CLOUD</span>
                                <div className="text-truncate ps-1">
                                    <div className="fw-bold text-truncate text-white" style={{ fontSize: "0.95rem" }}>{file.originalName}</div>
                                    <div className="text-white opacity-75 mt-1" style={{ fontSize: "0.8rem" }}>
                                        {formatFileSize(file.fileSize)} | Key: <span className="text-info fw-medium">{getKeyDisplayName((file as any).keyID)}</span> {file.modifiedAt ? ` | ${new Date(file.modifiedAt).toLocaleDateString()}` : ""}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn btn-sm btn-info text-dark px-3 flex-shrink-0 fw-bold"
                                style={{ fontSize: "0.85rem", backgroundColor: "#06b6d4", borderColor: "#06b6d4" }}
                                onClick={() => setDriveFileToDecrypt(file)}
                                disabled={downloadingDriveFile === file.fileId}
                            >
                                {downloadingDriveFile === file.fileId ? "Decrypting..." : "Decrypt & Download"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && localFiles.length > 0 && (
                <div className="mt-4">
                    <h6 className="text-secondary fw-bold tracking-wider mb-2" style={{ fontSize: "1.05rem", letterSpacing: "0.5px" }}>
                        Files Encrypted & Uploaded
                    </h6>
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {localFiles.map(file => (
                            <div key={file.fileID} className="p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ backgroundColor: "#1c1f22", borderColor: "#343a40" }}>
                                <div className="min-w-0 d-flex align-items-center gap-2">
                                    <span className="badge bg-secondary text-white text-uppercase px-2 py-1 fw-bold" style={{ fontSize: "10px", borderRadius: "3px" }}>{file.fileType}</span>
                                    <div className="text-truncate ps-1">
                                        <div className="fw-bold text-truncate text-white" style={{ fontSize: "0.95rem" }}>{file.fileName}</div>
                                        <div className="text-white opacity-75 mt-1" style={{ fontSize: "0.8rem" }}>
                                            {formatFileSize(file.fileSize)} | Key: <span className="text-secondary fw-medium">{getKeyDisplayName(file.keyID)}</span> | {new Date(file.uploadedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 flex-shrink-0">
                                    <button
                                        className="btn btn-sm btn-info text-dark px-3 fw-bold"
                                        style={{ fontSize: "0.85rem", backgroundColor: "#06b6d4", borderColor: "#06b6d4" }}
                                        onClick={() => setLocalFileToDecrypt(file)}
                                        disabled={downloadingLocalFile === file.fileID}
                                    >
                                        {downloadingLocalFile === file.fileID ? "Decrypting..." : "Decrypt & Download"}
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-outline-danger px-3 fw-medium" 
                                        style={{ fontSize: "0.85rem" }}
                                        onClick={() => setFileToDelete(file)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cloud Decryption Dialog */}
            {driveFileToDecrypt && (
                <dialog open className="premium-modal-backdrop" onClick={closeDecryptModals}>
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#06b6d4", marginBottom: "15px" }}></div>
                        
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                            Confirm Cloud Decryption
                        </h4>
                        
                        <p style={{ color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1rem" }}>
                            Unlock <span className="text-white fw-semibold">{driveFileToDecrypt.originalName}</span> via key <span className="text-info fw-semibold">"{getKeyDisplayName((driveFileToDecrypt as any).keyID)}"</span>.
                        </p>

                        <div className="mb-3">
                            <label className="form-label text-light-50 small mb-1 opacity-75">Key Password</label>
                            <input 
                                type="password" 
                                className="form-control bg-dark border-secondary text-white small" 
                                placeholder="Enter encryption key password"
                                value={keyPassword}
                                onChange={e => { setKeyPassword(e.target.value); setPasswordError(""); }}
                            />
                            {passwordError && <div className="text-danger small mt-1">{passwordError}</div>}
                        </div>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button 
                                className="btn fw-semibold px-4 py-2 border border-secondary text-white bg-transparent rounded" 
                                style={{ fontSize: "0.9rem" }}
                                onClick={closeDecryptModals}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm btn-info text-dark fw-bold px-4 rounded" 
                                style={{ backgroundColor: "#06b6d4", borderColor: "#06b6d4", fontSize: "0.9rem" }}
                                onClick={executeDriveDecrypt}
                            >
                                Decrypt
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Local Decryption Dialog */}
            {localFileToDecrypt && (
                <dialog open className="premium-modal-backdrop" onClick={closeDecryptModals}>
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#06b6d4", marginBottom: "15px" }}></div>
                        
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                            Confirm Vault Decryption
                        </h4>
                        
                        <p style={{ color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1rem" }}>
                            Unlock <span className="text-white fw-semibold">{localFileToDecrypt.fileName}</span> via key <span className="text-secondary fw-semibold">"{getKeyDisplayName(localFileToDecrypt.keyID)}"</span>.
                        </p>

                        <div className="mb-3">
                            <label className="form-label text-light-50 small mb-1 opacity-75">Key Password</label>
                            <input 
                                type="password" 
                                className="form-control bg-dark border-secondary text-white small" 
                                placeholder="Enter encryption key password"
                                value={keyPassword}
                                onChange={e => { setKeyPassword(e.target.value); setPasswordError(""); }}
                            />
                            {passwordError && <div className="text-danger small mt-1">{passwordError}</div>}
                        </div>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button 
                                className="btn fw-semibold px-4 py-2 border border-secondary text-white bg-transparent rounded" 
                                style={{ fontSize: "0.9rem" }}
                                onClick={closeDecryptModals}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm btn-info text-dark fw-bold px-4 rounded" 
                                style={{ backgroundColor: "#06b6d4", borderColor: "#06b6d4", fontSize: "0.9rem" }}
                                onClick={executeLocalDecrypt}
                            >
                                Decrypt
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Deletion Dialog */}
            {fileToDelete && (
                <dialog open className="premium-modal-backdrop" onClick={() => setFileToDelete(null)}>
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#ef4444", marginBottom: "15px" }}></div>
                        
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                            Confirm Deletion
                        </h4>
                        
                        <p style={{ color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
                            Are you sure you want to delete <span className="text-white fw-semibold">{fileToDelete.fileName}</span>? This action will permanently wipe its data from the system.
                        </p>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button 
                                className="btn fw-semibold px-4 py-2 border border-secondary text-white bg-transparent rounded" 
                                style={{ fontSize: "0.9rem" }}
                                onClick={() => setFileToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm btn-danger fw-bold px-4 rounded" 
                                style={{ fontSize: "0.9rem" }}
                                onClick={executeDeleteFile}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerDecryptFile
