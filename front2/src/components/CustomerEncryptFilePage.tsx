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
    
    // Local runtime status banner
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
                triggerLocalBanner("FILE_ACCESS_ERR: Could not resolve bridge path.", "error")
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
            triggerLocalBanner(`SUCCESS: ${uploadName}.enc securely vaulted.`, "success")
            clearSelection()
            setPrivacyWarnings([])
        } catch {
            triggerLocalBanner("UPLOAD_FAIL: Secure encryption pipeline error.", "error")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div>
            <div className="border-bottom border-muted pb-2 mb-4">
                <h5 className="workspace-section-heading mb-0">VAULT_ENCRYPTION_ENGINE</h5>
                <p className="text-muted font-monospace fs-8 mb-0">STAGE_LOCAL_ASSETS_FOR_CLOUD_STEALTH_SYNC</p>
            </div>

            {localBanner && (
                <div className={`status-banner ${localBanner.type === "error" ? "status-error" : "status-success"} mb-3 py-2 px-3 rounded font-monospace fs-8`}>
                    {localBanner.msg}
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-dashed rounded p-4 text-center mb-4 cursor-pointer ${dragOver ? "border-cyan bg-dark-panel" : "border-muted"}`}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <div className="font-monospace fs-7 text-muted">DROP_ASSET_TO_INITIALIZE_VAULTING</div>
                <input id="fileInput" type="file" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) { clearSelection(); setSelectedFile(f) }
                }} />
            </div>

            {selectedFile && (
                <div className="bg-workspace-card p-3 border rounded mb-4 font-monospace fs-8">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <div className="fw-semibold">{droppedFileName || selectedFile.name}</div>
                            <div className="text-muted">SIZE_BYTES: {droppedFileUri ? droppedFileSize : selectedFile.size}</div>
                        </div>
                        <button className="btn-workspace-action" onClick={clearSelection}>REMOVE</button>
                    </div>
                </div>
            )}

            <button 
                className="sidebar-nav-item w-100 bg-cyan text-white border-0 py-2 font-monospace fs-7" 
                onClick={() => handleUpload()} 
                disabled={!selectedFile || uploading}
            >
                {uploading ? "VAULTING_ASSET..." : "COMMIT_TO_ENCRYPTED_VAULT"}
            </button>

            {/* Modal remains for privacy intervention */}
            {showPrivacyConfirm && (
                <div className="modal-overlay">
                    <div className="workspace-modal p-4">
                        <h6 className="font-monospace text-danger">PRIVACY_SCAN_ALERT</h6>
                        <p className="fs-8">System identified potential sensitive markers:</p>
                        <ul className="fs-8">{privacyWarnings.map(w => <li key={w}>{w}</li>)}</ul>
                        <div className="d-flex gap-2 justify-content-end">
                            <button className="btn-workspace-action" onClick={() => setShowPrivacyConfirm(false)}>CANCEL</button>
                            <button className="btn-workspace-action bg-danger text-white" onClick={() => { setShowPrivacyConfirm(false); handleUpload(true) }}>ENCRYPT_ANYWAY</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerEncryptFile