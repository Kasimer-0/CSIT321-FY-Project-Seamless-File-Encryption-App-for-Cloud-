import { useState, useEffect } from "react"
import type { EncryptedFile } from "../Type"
import toast from "react-hot-toast"

function CustomerDecryptFile() {
    const [files, setFiles] = useState<EncryptedFile[]>([])
    const [downloading, setDownloading] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

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
                `http://localhost:8080/files/${file.fileID}/decrypt-download`,
                {
                    method: "GET",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to decrypt and download file")
                return
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = file.fileName
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success(`${file.fileName} decrypted and downloaded successfully`)

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
                Files stored in your cloud storage that is set as active link. Click to decrypt and download to your device.
            </p>

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

                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDecryptDownload(file)}
                                disabled={downloading === file.fileID}
                            >
                                {downloading === file.fileID ? "Decrypting..." : "⬇ Decrypt & Download"}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}

export default CustomerDecryptFile