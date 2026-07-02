import { apiFetch } from "../lib/api"
import { useState, useEffect } from "react"
import type { UserAccount, EncryptionKeyRecord } from "../Type"

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
    
    const [showUploadConfirm, setShowUploadConfirm] = useState(false)

    const [activeKeys, setActiveKeys] = useState<EncryptionKeyRecord[]>([])
    const [selectedKeyId, setSelectedKeyId] = useState<string>("")
    const [loadingKeys, setLoadingKeys] = useState(true)

    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerLocalBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    useEffect(() => {
        const fetchActiveKeys = async () => {
            try {
                setLoadingKeys(true)
                const params = new URLSearchParams({ ownerID: String(user.userID) })
                const res = await apiFetch(`http://localhost:8080/encryption-keys?${params.toString()}`, {
                    credentials: "include"
                })
                if (res.ok) {
                    const allKeys: EncryptionKeyRecord[] = await res.json()
                    const filtered = allKeys.filter(k => k.status === "active")
                    setActiveKeys(filtered)
                } else {
                    triggerLocalBanner("Failed to fetch active encryption keys.", "error")
                }
            } catch {
                triggerLocalBanner("Failed to fetch active encryption keys.", "error")
            } finally {
                setLoadingKeys(false)
            }
        }
        fetchActiveKeys()
    }, [user.userID])

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
                const response = await apiFetch("http://localhost:8080/cloud-storage/google-drive/local-file-info", {
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
        const response = await apiFetch("http://localhost:8080/privacy/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ filename: file.name, sample })
        })
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data.warnings) ? data.warnings : []
    }

    const initiateUploadSequence = async () => {
        if (!selectedFile || !selectedKeyId) return
        
        const warnings = await scanForSensitiveData(selectedFile)
        if (warnings.length > 0) {
            setPrivacyWarnings(warnings)
            setShowPrivacyConfirm(true)
            return
        }

        setShowUploadConfirm(true)
    }

    const handleUpload = async () => {
        if (!selectedFile || !selectedKeyId) return
        setUploading(true)
        setShowUploadConfirm(false)

        try {
            const uploadName = droppedFileName || selectedFile.name.replace(/^.*[\\/]/, "")
            let response: Response
            
            if (droppedFileUri) {
                response = await apiFetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload-path?ownerID=${user.userID}&keyID=${selectedKeyId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fileUri: droppedFileUri })
                })
            } else {
                const formData = new FormData()
                formData.append("file", selectedFile, uploadName)
                response = await apiFetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload?ownerID=${user.userID}&keyID=${selectedKeyId}`, {
                    method: "POST",
                    credentials: "include",
                    body: formData
                })
            }

            if (!response.ok) throw new Error()
            triggerLocalBanner(`SUCCESS: ${uploadName}.enc securely uploaded.`, "success")
            clearSelection()
            setPrivacyWarnings([])
        } catch {
            triggerLocalBanner("FAIL: Failed to upload file.", "error")
        } finally {
            setUploading(false)
        }
    }

    const canProceed = selectedFile && selectedKeyId && !uploading
    
    // FIX: Safely casting keyID to string to clean up the type mismatch error
    const activeKeyObject = activeKeys.find(k => String(k.keyID) === selectedKeyId)

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
                    minHeight: "240px",
                    padding: "2.5rem 1.5rem"
                }}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <div className="fw-semibold text-light" style={{ fontSize: "1rem", letterSpacing: "0.5px" }}>
                    DRAG & DROP FILE HERE
                </div>
                <div className="text-light opacity-75 mt-2" style={{ fontSize: "0.85rem" }}>
                    or click to browse local storage filesystem
                </div>
                
                {/* FIX: Handled the text reset and decoupled selection cleanup */}
                <input 
                    id="fileInput" 
                    type="file" 
                    style={{ display: "none" }} 
                    onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                            setDroppedFileUri("")
                            setDroppedFileName("")
                            setDroppedFileSize(0)
                            setSelectedFile(f)
                        }
                        e.target.value = "" // Ensures selecting the same file back-to-back triggers onChange
                    }} 
                />
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

            <div className="p-3 border rounded mb-4 text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
                <label className="form-label small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: "12px", letterSpacing: "0.5px", color: "#06b6d4" }}>
                    Select an Encryption Key
                </label>
                
                {loadingKeys ? (
                    <div className="text-muted py-1" style={{ fontSize: "13px" }}>
                        <div className="spinner-border spinner-border-sm text-cyan me-2" role="status"></div>
                        Fetching active encryption keys...
                    </div>
                ) : activeKeys.length === 0 ? (
                    <div className="p-2 rounded border border-danger text-danger text-center fw-medium mb-1" style={{ fontSize: "13px", backgroundColor: "rgba(244,63,94,0.06)" }}>
                        No active keys found. Please Create and Activate an Encryption Key.
                    </div>
                ) : (
                    <div>
                        <select 
                            className="form-select text-white border-secondary p-2 custom-target-key-dropdown" 
                            style={{ backgroundColor: "#0b0c10", fontSize: "14px", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}
                            value={selectedKeyId} 
                            onChange={e => setSelectedKeyId(e.target.value)}
                        >
                            <option value="" style={{ color: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif" }}>-- Choose an Encryption Key --</option>
                            {activeKeys.map(key => (
                                <option 
                                    key={key.keyID} 
                                    value={String(key.keyID)}
                                    style={{ color: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif" }}
                                >
                                    {key.keyName} [{key.algorithm}] ({key.fingerprint?.slice(0, 12) || "No Fp"}...)
                                </option>
                            ))}
                        </select>
                        <p className="small mt-2 mb-0" style={{ fontSize: "12px", color: "#a1a1aa" }}>
                            The selected encryption key will be used to encrypt your file.
                        </p>
                    </div>
                )}
            </div>

            <button 
                className="sidebar-nav-item w-100 border-0 py-2 fw-bold d-flex align-items-center justify-content-center rounded" 
                style={{ 
                    backgroundColor: !canProceed ? "#2a2e33" : "#06b6d4", 
                    color: !canProceed ? "#6c757d" : "#ffffff",
                    cursor: !canProceed ? "not-allowed" : "pointer",
                    fontSize: "0.9rem"
                }}
                onClick={initiateUploadSequence} 
                disabled={!canProceed}
            >
                {uploading ? "Encrypting..." : "Encrypt & Upload"}
            </button>

            {showUploadConfirm && (
                <dialog open className="premium-modal-backdrop" onClick={() => setShowUploadConfirm(false)}>
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#06b6d4", marginBottom: "15px" }}></div>
                        
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                            Confirm Encryption & Upload
                        </h4>
                        
                        <p className="my-3" style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "#a1a1aa" }}>
                            You are about to encrypt and upload your file. The selected encryption key will be used for this process, and the file will be uploaded to your linked cloud storage account.
                        </p>

                        <div className="p-3 mb-3 rounded border" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontSize: "0.85rem" }}>
                            <div className="mb-1 text-white"><span style={{ color: "#a1a1aa" }}>File Asset:</span> {droppedFileName || selectedFile?.name}</div>
                            <div className="text-white"><span style={{ color: "#a1a1aa" }}>Signing Key:</span> {activeKeyObject ? `${activeKeyObject.keyName} (${activeKeyObject.algorithm})` : "None Selected"}</div>
                        </div>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button className="btn fw-medium text-muted bg-transparent border-0" onClick={() => setShowUploadConfirm(false)}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm fw-bold px-3 text-white" 
                                style={{ backgroundColor: "#06b6d4" }}
                                onClick={handleUpload}
                            >
                                Encrypt & Upload
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

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
                                    setShowUploadConfirm(true); 
                                }}
                            >
                                Proceed to Confirmation
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerEncryptFile
