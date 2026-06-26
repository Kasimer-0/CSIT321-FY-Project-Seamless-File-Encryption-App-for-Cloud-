import { apiFetch } from "../lib/api"
import { useEffect, useState } from "react"
import type { EncryptionKeyRecord } from "../Type"
import toast from "react-hot-toast"

function CustomerEncryptFile() {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [droppedFileUri, setDroppedFileUri] = useState("")
    const [droppedFileName, setDroppedFileName] = useState("")
    const [droppedFileSize, setDroppedFileSize] = useState(0)
    const [uploading, setUploading] = useState(false)
    const [privacyWarnings, setPrivacyWarnings] = useState<string[]>([])
    const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false)
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [selectedKeyID, setSelectedKeyID] = useState<number | null>(null)
    const [keyPassword, setKeyPassword] = useState("")
    const [keyLoading, setKeyLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const fetchKeys = async () => {
            try {
                const response = await apiFetch("http://localhost:8080/encryption-keys", { credentials: "include" })
                if (!response.ok) throw new Error("Unable to load keys")
                const records = await response.json() as EncryptionKeyRecord[]
                const activeKeys = records.filter(key => key.status === "active")
                if (cancelled) return
                setKeys(activeKeys)
                if (activeKeys.length > 0) setSelectedKeyID(activeKeys[0].keyID)
            } catch {
                if (!cancelled) toast.error("Encryption keys could not be loaded")
            } finally {
                if (!cancelled) setKeyLoading(false)
            }
        }

        void fetchKeys()
        return () => {
            cancelled = true
        }
    }, [])

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

        // JavaFX WebView exposes dragged files as zero-byte file:// placeholders.
        if (file.size === 0 && file.name.startsWith("file:")) {
            try {
                const response = await apiFetch("http://localhost:8080/cloud-storage/google-drive/local-file-info", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fileUri: file.name })
                })
                if (!response.ok) throw new Error("Unable to inspect dropped file")
                const info = await response.json() as { fileName: string; fileSize: number; fileUri: string }
                setSelectedFile(file)
                setDroppedFileUri(info.fileUri)
                setDroppedFileName(info.fileName)
                setDroppedFileSize(info.fileSize)
            } catch {
                clearSelection()
                toast.error("The dropped file could not be read. Use Browse if the problem continues.")
            }
            return
        }

        clearSelection()
        setSelectedFile(file)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            clearSelection()
            setSelectedFile(file)
        }
    }

    // Run the privacy user-story check before encryption/upload.
    // Only a bounded text sample is inspected; binary/unreadable files safely produce an empty sample.
    const scanForSensitiveData = async (file: File) => {
        let sample = ""
        try {
            sample = (await file.text()).slice(0, 20000)
        } catch {
            sample = ""
        }
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

    const handleUpload = async (skipPrivacyScan = false) => {
        if (!selectedFile) return
        if (!selectedKeyID) {
            toast.error("Create and select an active encryption key first")
            return
        }
        if (!keyPassword.trim()) {
            toast.error("Enter the selected key password")
            return
        }

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

            // Browse uploads real bytes as multipart data. JavaFX drag and drop
            // supplies only a file URI, so that path uses the native bridge.
            const uploadName = droppedFileName || selectedFile.name.replace(/^.*[\/]/, "")
            const passwordForRequest = keyPassword.trim()
            let response: Response
            if (droppedFileUri) {
                response = await apiFetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload-path`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fileUri: droppedFileUri, keyID: selectedKeyID, keyPassword: passwordForRequest })
                })
            } else {
                const formData = new FormData()
                formData.append("file", selectedFile, uploadName)
                formData.append("keyID", String(selectedKeyID))
                formData.append("keyPassword", passwordForRequest)
                response = await apiFetch(`http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload`, {
                    method: "POST",
                    credentials: "include",
                    body: formData
                })
            }

            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to encrypt and upload file")
                return
            }

            toast.success(`${uploadName}.stealthsync.enc uploaded to the configured Google Drive folder`)
            clearSelection()
            setKeyPassword("")
            setPrivacyWarnings([])

        } catch {
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

            <div className="card p-3 mb-4">
                <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-5">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Encryption Key</label>
                        <select
                            className="form-select"
                            value={selectedKeyID ?? ""}
                            onChange={e => setSelectedKeyID(e.target.value ? Number(e.target.value) : null)}
                            disabled={keyLoading || keys.length === 0}
                        >
                            <option value="">{keyLoading ? "Loading keys..." : "Select key"}</option>
                            {keys.map(key => (
                                <option key={key.keyID} value={key.keyID}>{key.keyName} ({key.fingerprint})</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-12 col-md-5">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Key Password</label>
                        <input
                            className="form-control"
                            type="password"
                            value={keyPassword}
                            onChange={e => setKeyPassword(e.target.value)}
                            placeholder="Password for selected key"
                        />
                    </div>
                    <div className="col-12 col-md-2">
                        <button
                            className="btn btn-primary w-100"
                            onClick={() => handleUpload()}
                            disabled={!selectedFile || uploading || !selectedKeyID || !keyPassword.trim()}
                        >
                            {uploading ? "Uploading..." : "Encrypt"}
                        </button>
                    </div>
                </div>
                {!keyLoading && keys.length === 0 && (
                    <small className="text-muted mt-2 d-block">Create an active encryption key before uploading.</small>
                )}
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border rounded p-5 text-center mb-4 ${dragOver ? "border-primary bg-primary bg-opacity-10" : "border-secondary"}`}
                style={{ borderStyle: "dashed", borderWidth: 2, cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <div style={{ fontSize: 40 }} className="mb-2">File</div>
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
                        <div className="fw-medium" style={{ fontSize: 14 }}>{droppedFileName || selectedFile.name}</div>
                        <small className="text-muted">{formatFileSize(droppedFileUri ? droppedFileSize : selectedFile.size)}</small>
                    </div>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={clearSelection}
                    >
                        Clear
                    </button>
                </div>
            )}

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