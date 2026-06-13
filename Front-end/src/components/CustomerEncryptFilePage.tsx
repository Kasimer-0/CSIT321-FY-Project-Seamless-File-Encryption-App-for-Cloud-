import { useState } from "react"
import toast from "react-hot-toast"

function CustomerEncryptFile() {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [privacyWarnings, setPrivacyWarnings] = useState<string[]>([])
    const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false)

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

    // Codex integration note: run the privacy user-story check before encryption/upload.
    // Only a bounded text sample is inspected; binary/unreadable files safely produce an empty sample.
    const scanForSensitiveData = async (file: File) => {
        let sample = ""
        try {
            sample = (await file.text()).slice(0, 20000)
        } catch {
            sample = ""
        }
        const response = await fetch("http://localhost:8080/privacy/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ filename: file.name, sample })
        })
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data.warnings) ? data.warnings : []
    }

    const handleUpload = async (skipPrivacyScan = false) => {
        if (!selectedFile) return

        setUploading(true)

        try {
            // A warning pauses the upload for explicit confirmation rather than silently blocking the file.
            if (!skipPrivacyScan) {
                const warnings = await scanForSensitiveData(selectedFile)
                if (warnings.length > 0) {
                    setPrivacyWarnings(warnings)
                    setShowPrivacyConfirm(true)
                    return
                }
            }

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
            setPrivacyWarnings([])

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
                onClick={() => handleUpload()}
                disabled={!selectedFile || uploading}
            >
                {uploading ? "Encrypting and Uploading..." : "Encrypt and Upload"}
            </button>

            {showPrivacyConfirm && selectedFile && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }} onClick={() => setShowPrivacyConfirm(false)}>
                    <div className="card p-4" style={{ width: 420 }} onClick={event => event.stopPropagation()}>
                        <h6 className="mb-1">Sensitive Data Warning</h6>
                        <p className="text-muted mb-2" style={{ fontSize: 14 }}>
                            This file may contain sensitive data. Review before encrypting and uploading.
                        </p>
                        <ul className="mb-3" style={{ fontSize: 13 }}>
                            {privacyWarnings.map(warning => <li key={warning}>{warning}</li>)}
                        </ul>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary" onClick={() => setShowPrivacyConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setShowPrivacyConfirm(false)
                                    handleUpload(true)
                                }}
                            >
                                Encrypt Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
export default CustomerEncryptFile
