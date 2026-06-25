import { useState } from "react"
import type { UserAccount } from "../Type"

type Props = { user: UserAccount }

function CustomerEncryptFile({ user }: Props) {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [droppedFileUri, setDroppedFileUri] = useState("")
    const [droppedFileName, setDroppedFileName] = useState("")
    const [droppedFileSize, setDroppedFileSize] = useState(0)
    const [uploading, setUploading] = useState(false)
    const [privacyWarnings, setPrivacyWarnings] = useState<string[]>([])
    const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false)
    
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerLocalBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    const clearSelection = () => {
        setSelectedFile(null)
        setDroppedFileUri("")
        setDroppedFileName("")
        setDroppedFileSize(0)
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return

        if (file.size === 0 && file.name.startsWith("file:")) {
            try {
                const response = await fetch("http://localhost:8080/cloud-storage/google-drive/local-file-info", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fileUri: file.name })
                })
                if (!response.ok) throw new Error()
                const info = await response.json() as { fileName: string; fileSize: number; fileUri: string }
                setSelectedFile(file)
                setDroppedFileUri(info.fileUri)
                setDroppedFileName(info.fileName)
                setDroppedFileSize(info.fileSize)
            } catch {
                clearSelection()
                triggerLocalBanner("Failed to retrieve file information.", "error")
            }
            return
        }
        clearSelection()
        setSelectedFile(file)
    }

    const scanForSensitiveData = async (file: File) => {
        let sample = ""
        try { sample = (await file.text()).slice(0, 20000) } catch { sample = "" }
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
            if (!skipPrivacyScan) {
                const warnings = await scanForSensitiveData(selectedFile)
                if (warnings.length > 0) {
                    setPrivacyWarnings(warnings)
                    setShowPrivacyConfirm(true)
                    setUploading(false)
                    return
                }
            }

            const uploadName = droppedFileName || selectedFile.name.replace(/^.*[\\/]/, "")
            let response: Response
            
            if (droppedFileUri) {
                response = await fetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload-path?ownerID=${user.userID}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fileUri: droppedFileUri })
                })
            } else {
                const formData = new FormData()
                formData.append("file", selectedFile, uploadName)
                response = await fetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload?ownerID=${user.userID}`, {
                    method: "POST",
                    credentials: "include",
                    body: formData
                })
            }

            if (!response.ok) throw new Error()
            triggerLocalBanner(`SUCCESS: ${uploadName}.enc securely encrypted.`, "success")
            clearSelection()
            setPrivacyWarnings([])
        } catch {
            triggerLocalBanner("FAIL: Failed to upload file.", "error")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="border-bottom border-secondary pb-2 mb-4">
                <h5 className="text-white fw-bold mb-1" style={{ fontSize: "1.25rem", letterSpacing: "0.5px" }}>
                    File Encryption & Upload
                </h5>
                <p className="text-light-50 opacity-75 mb-0" style={{ fontSize: "0.85rem" }}>
                    Encrypt and upload your files onto your cloud storage platform.
                </p>
            </div>

            {localBanner && (
                <div className={`status-banner ${localBanner.type === "error" ? "status-error" : "status-success"} mb-3 py-2 px-3 rounded fw-medium`} style={{ fontSize: "0.85rem" }}>
                    {localBanner.msg}
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="border rounded mb-4 cursor-pointer d-flex flex-column align-items-center justify-content-center"
                style={{ 
                    transition: "all 0.2s ease",
                    backgroundColor: dragOver ? "#2d3139" : "#212529",
                    borderColor: dragOver ? "#06b6d4" : "#495057",
                    borderStyle: "dashed",
                    minHeight: "280px",
                    padding: "3rem 1.5rem"
                }}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <div className="fw-semibold text-light" style={{ fontSize: "1rem", letterSpacing: "0.5px" }}>
                    DRAG & DROP FILE HERE
                </div>
                <div className="text-light opacity-75 mt-2" style={{ fontSize: "0.85rem" }}>
                    or click to browse local storage filesystem
                </div>
                <input id="fileInput" type="file" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) { clearSelection(); setSelectedFile(f) }
                }} />
            </div>

            {selectedFile && (
                <div className="p-3 border rounded mb-4" style={{ backgroundColor: "#1c1f22", borderColor: "#343a40" }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <div className="fw-bold text-white" style={{ fontSize: "0.95rem" }}>
                                {droppedFileName || selectedFile.name}
                            </div>
                            <div className="text-info fw-medium mt-1" style={{ fontSize: "0.8rem" }}>
                                File Size (Bytes): <span className="text-white opacity-75">{droppedFileUri ? droppedFileSize : selectedFile.size}</span>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger fw-medium px-3" onClick={clearSelection}>
                            Remove File
                        </button>
                    </div>
                </div>
            )}

            <button 
                className="sidebar-nav-item w-100 border-0 py-2 fw-bold d-flex align-items-center justify-content-center rounded" 
                style={{ 
                    backgroundColor: (!selectedFile || uploading) ? "#2a2e33" : "#06b6d4", 
                    color: (!selectedFile || uploading) ? "#6c757d" : "#ffffff",
                    cursor: (!selectedFile || uploading) ? "not-allowed" : "pointer",
                    fontSize: "0.9rem"
                }}
                onClick={() => handleUpload()} 
                disabled={!selectedFile || uploading}
            >
                {uploading ? "Encrypting..." : "Encrypt & Upload"}
            </button>

            {showPrivacyConfirm && (
                <dialog open className="premium-modal-backdrop" onClick={() => setShowPrivacyConfirm(false)}>
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#f59e0b", marginBottom: "15px" }}></div>
                        
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                            !Sensitive Data Detected!
                        </h4>
                        
                        <p className="text-muted my-3" style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>
                            Sensitive data has been detected in the file you are trying to encrypt and upload. Please review the warnings below.:
                        </p>
                        
                        <ul className="text-warning my-3 ps-0" style={{ listStyleType: "none" }}>
                            {privacyWarnings.map(w => (
                                <li key={w} className="p-2 mb-2 rounded border-start border-warning" style={{ backgroundColor: "#1c1f22", fontSize: "0.85rem" }}>
                                    ⚠️ {w}
                                </li>
                            ))}
                        </ul>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button className="btn fw-medium text-muted bg-transparent border-0" onClick={() => setShowPrivacyConfirm(false)}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm btn-warning fw-bold px-3 text-dark" 
                                onClick={() => { 
                                    setShowPrivacyConfirm(false); 
                                    handleUpload(true); 
                                }}
                            >
                                Encrypt & Upload Anyway
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerEncryptFile;