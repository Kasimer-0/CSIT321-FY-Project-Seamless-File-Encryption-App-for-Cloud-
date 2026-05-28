import { useState } from "react"
import toast from "react-hot-toast"

function CustomerEncryptFile() {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) setSelectedFile(file)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setSelectedFile(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)

        try {
            const formData = new FormData()
            formData.append("file", selectedFile)

            const response = await fetch("http://localhost:8080/files/encrypt-upload", {
                method: "POST",
                credentials: "include",
                body: formData
            })

            if (!response.ok) {
                toast.error("Failed to encrypt and upload file")
                return
            }

            toast.success(`${selectedFile.name} encrypted and uploaded successfully`)
            setSelectedFile(null)

        } catch (err) {
            toast.error("Server connection failed")
        } finally {
            setUploading(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <>
            <h5 className="mb-1">Encrypt and Upload</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                Drop a file below to encrypt and upload it to your cloud storage that is set as active link.
            </p>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border rounded p-5 text-center mb-4 ${dragOver ? "border-primary bg-primary bg-opacity-10" : "border-secondary"}`}
                style={{ borderStyle: "dashed", borderWidth: 2, cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <div style={{ fontSize: 40 }} className="mb-2">📂</div>
                <div className="fw-medium mb-1">Drop your file here</div>
                <small className="text-muted">or click to browse</small>
                <input
                    id="fileInput"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileInput}
                />
            </div>

            {/* Selected File Info */}
            {selectedFile && (
                <div className="border rounded p-3 mb-4 d-flex align-items-center justify-content-between">
                    <div>
                        <div className="fw-medium" style={{ fontSize: 14 }}>{selectedFile.name}</div>
                        <small className="text-muted">{formatFileSize(selectedFile.size)}</small>
                    </div>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedFile(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
            >
                {uploading ? "Encrypting and Uploading..." : "Encrypt and Upload"}
            </button>
        </>
    )
}

export default CustomerEncryptFile