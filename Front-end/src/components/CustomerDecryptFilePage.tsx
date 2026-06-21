import { useState, useEffect } from "react"
import type { EncryptedFile } from "../Type"
import toast from "react-hot-toast"

function CustomerDecryptFile() {
    const [files, setFiles] = useState<EncryptedFile[]>([])
    const [downloading, setDownloading] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastSavedPath, setLastSavedPath] = useState("")

    // Local records and Drive files have separate delete endpoints so this
    // legacy page cannot accidentally remove a remote object.
    const removeFile = async (file: EncryptedFile) => {
        const response = await fetch(`http://localhost:8080/files/${file.fileID}`, {
            method: "DELETE",
            credentials: "include"
        })
        if (!response.ok) {
            toast.error("Failed to delete the local encrypted record")
            return
        }
        setFiles(current => current.filter(item => item.fileID !== file.fileID))
        toast.success(`${file.fileName} deleted`)
    }

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await fetch("http://localhost:8080/files", {
                    credentials: "include"
                })

                if (!response.ok) {
                    console.error("Failed to fetch files")
                    return
                }

                const data = await response.json()
                setFiles(data)

            } catch (err) {
                console.error("Failed to fetch files")
            } finally {
                setLoading(false)
            }
        }
        fetchFiles()
    }, [])

    const handleDecryptDownload = async (file: EncryptedFile) => {
        setDownloading(file.fileID)

        try {
            const response = await fetch(
                `http://localhost:8080/files/${file.fileID}/decrypt-save`,
                {
                    method: "POST",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to decrypt and save file")
                return
            }

            // The backend writes the file because JavaFX WebView cannot reliably
            // persist a browser Blob download in the desktop application.
            const result = await response.json() as { savedPath: string }
            setLastSavedPath(result.savedPath)
            toast.success(`${file.fileName} saved to ${result.savedPath}`)

        } catch (err) {
            toast.error("Server connection failed")
        } finally {
            setDownloading(null)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <>
            <h5 className="mb-1">Decrypt and Download</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                Legacy encrypted records stored locally by StealthSync. Cloud files are managed under Cloud Storage Link.
            </p>
            {lastSavedPath && (
                <div className="alert alert-success py-2" role="status">
                    <div className="fw-semibold">Decrypted file saved successfully</div>
                    <code style={{ overflowWrap: "anywhere" }}>{lastSavedPath}</code>
                </div>
            )}

            {loading ? (
                <p className="text-muted" style={{ fontSize: 13 }}>Loading files...</p>
            ) : files.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>No encrypted files found in your cloud storage.</p>
            ) : (
                <ul className="list-group" style={{ maxHeight: 620, overflowY: "auto" }}>
                    {files.map(file => (
                        <li
                            key={file.fileID}
                            className="list-group-item d-flex align-items-center justify-content-between"
                        >
                            <div className="d-flex align-items-center gap-3">
                                <span
                                    className="badge bg-secondary"
                                    style={{ fontFamily: "monospace", fontSize: 10, minWidth: 40 }}
                                >
                                    {file.fileType.toUpperCase()}
                                </span>
                                <div>
                                    <div className="fw-medium" style={{ fontSize: 14 }}>{file.fileName}</div>
                                    <small className="text-muted">
                                        {formatFileSize(file.fileSize)} · {file.encMethod} · {new Date(file.uploadedAt).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleDecryptDownload(file)}
                                    disabled={downloading === file.fileID}
                                >
                                    {downloading === file.fileID ? "Decrypting..." : "⬇ Decrypt & Download"}
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => removeFile(file)}>
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}

export default CustomerDecryptFile