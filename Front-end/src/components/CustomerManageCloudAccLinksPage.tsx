import { useState, useEffect } from "react"
import type { CloudStorageLink, CloudStorageUsage, GoogleDriveFile, UserAccount } from "../Type"
import toast from "react-hot-toast"

import googleDriveIcon from "../assets/googledrive.png"
import dropboxIcon from "../assets/dropbox.png"
import onedriveIcon from "../assets/onedrive.png"

const providerLabels: Record<string, { label: string; icon: string }> = {
    google_drive: { label: "Google Drive", icon: googleDriveIcon },
    dropbox: { label: "Dropbox", icon: dropboxIcon },
    onedrive: { label: "OneDrive", icon: onedriveIcon },
}

const availableProviders = ["google_drive", "dropbox", "onedrive"]

/**
 * Codex integration note: this page extends the teammate's cloud-link UI with persisted provider links,
 * free/premium provider limits, and the complete Google Drive OAuth/encrypted-file workflow.
 * Dropbox and OneDrive remain visible prototype providers; only Google Drive performs real remote I/O.
 */
type Props = {
    user: UserAccount
}

function CustomerManageCloudAccLinks({ user }: Props) {
    const [links, setLinks] = useState<CloudStorageLink[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<CloudStorageLink | null>(null)
    const [selectedProvider, setSelectedProvider] = useState("")
    const [usage, setUsage] = useState<CloudStorageUsage | null>(null)
    const [providerLimit, setProviderLimit] = useState(user.isSubscribed ? 5 : 1)
    const [driveConfigured, setDriveConfigured] = useState(false)
    const [driveConnected, setDriveConnected] = useState(false)
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
    const [driveLoading, setDriveLoading] = useState(false)
    const [driveUploading, setDriveUploading] = useState(false)

    const fetchLinks = async () => {
        try {
            setLoading(true)

            const response = await fetch(`http://localhost:8080/cloud-storage/links?ownerID=${user.userID}`, {
                credentials: "include"
            })

            if (!response.ok) {
                console.error("Failed to fetch cloud storage links")
                return
            }

            const data = await response.json()
            setLinks(data)

        } catch (err) {
            console.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    const fetchUsage = async () => {
        try {
            const response = await fetch("http://localhost:8080/cloud-storage/usage", {
                credentials: "include"
            })
            if (response.ok) {
                setUsage(await response.json())
            }
        } catch (err) {
            console.error("Failed to fetch cloud storage usage")
        }
    }

    // The backend owns the 1-provider free / 5-provider premium rule, so the UI reads the effective limit.
    const fetchProviderInfo = async () => {
        try {
            const response = await fetch(`http://localhost:8080/cloud-storage/providers?ownerID=${user.userID}`, {
                credentials: "include"
            })
            if (response.ok) {
                const data = await response.json()
                setProviderLimit(Number(data.providerLimit ?? (user.isSubscribed ? 5 : 1)))
            }
        } catch (err) {
            console.error("Failed to fetch cloud provider info")
        }
    }

    // Check OAuth configuration and connection independently to distinguish setup errors from an unlinked account.
    const fetchDriveStatus = async () => {
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/google-drive/status?ownerID=${user.userID}`,
                { credentials: "include" }
            )
            if (response.ok) {
                const data = await response.json()
                const connected = Boolean(data.connected)
                setDriveConfigured(Boolean(data.configured))
                setDriveConnected(connected)
                return connected
            }
        } catch (err) {
            console.error("Failed to fetch Google Drive status")
        }
        return false
    }

    // Only StealthSync-tagged encrypted objects are returned by the backend Drive integration.
    const fetchDriveFiles = async () => {
        try {
            setDriveLoading(true)
            const response = await fetch(
                `http://localhost:8080/cloud-storage/google-drive/files?ownerID=${user.userID}`,
                { credentials: "include" }
            )
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.message ?? "Failed to load Google Drive files")
            }
            setDriveFiles(await response.json())
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load Google Drive files")
        } finally {
            setDriveLoading(false)
        }
    }

    useEffect(() => {
        fetchLinks()
        fetchUsage()
        fetchProviderInfo()
        fetchDriveStatus().then(connected => {
            if (connected) void fetchDriveFiles()
        })
    }, [user.userID, user.isSubscribed])

    const handleSetActive = async (linkID: number) => {
        const selectedLink = links.find(link => link.linkID === linkID)
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/links/${linkID}/set-active`,
                {
                    method: "PATCH",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to set active cloud account")
                return
            }

            await fetchLinks()
            if (selectedLink?.provider === "google_drive") {
                await fetchDriveStatus()
                await fetchDriveFiles()
            }
            toast.success("Cloud account set as active successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleRemove = async (linkID: number) => {
        const removedLink = links.find(link => link.linkID === linkID)
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/links/${linkID}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to remove cloud account")
                return
            }

            await fetchLinks()
            if (removedLink?.provider === "google_drive") {
                setDriveConnected(false)
                setDriveFiles([])
            }
            setShowRemoveConfirm(null)
            toast.success("Cloud account removed successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleDeactivate = async (linkID: number) => {
        const selectedLink = links.find(link => link.linkID === linkID)
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/links/${linkID}/deactivate`,
                {
                    method: "PATCH",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to deactivate cloud account")
                return
            }

            await fetchLinks()
            if (selectedLink?.provider === "google_drive") {
                setDriveConnected(false)
            }
            toast.success("Cloud account deactivated")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    // Poll the local callback result because Google completes authorization in the system browser,
    // outside the packaged JavaFX desktop window.
    const waitForGoogleConnection = async () => {
        for (let attempt = 0; attempt < 45; attempt += 1) {
            await new Promise(resolve => window.setTimeout(resolve, 2000))
            if (await fetchDriveStatus()) {
                await fetchLinks()
                await fetchDriveFiles()
                toast.success("Google Drive connected successfully")
                return
            }
        }
        toast.error("Google Drive authorization was not completed. Try Connect again.")
    }

    // Google Drive starts real OAuth; Dropbox and OneDrive intentionally use prototype link records.
    const beginProviderConnection = async (provider: string) => {
        const response = await fetch(
            `http://localhost:8080/cloud-storage/auth/${provider}?ownerID=${user.userID}`,
            { credentials: "include" }
        )
        if (!response.ok) {
            const data = await response.json().catch(() => null)
            throw new Error(data?.message ?? "Failed to initiate cloud account connection")
        }

        const data = await response.json()
        if (provider === "google_drive") {
            if (!data.openedExternal && data.authUrl) {
                window.open(data.authUrl, "_blank", "noopener,noreferrer")
            }
            toast.success("Google authorization opened in your browser")
            void waitForGoogleConnection()
        } else {
            await fetchLinks()
            toast.success(`${providerLabels[provider]?.label ?? provider} connected in prototype mode`)
        }
    }

    const handleReconnect = async (linkID: number) => {
        const link = links.find(item => item.linkID === linkID)
        if (link?.provider === "google_drive") {
            try {
                await beginProviderConnection("google_drive")
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to reconnect Google Drive")
            }
            return
        }

        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/links/${linkID}/reconnect`,
                { method: "PATCH", credentials: "include" }
            )
            if (!response.ok) {
                toast.error("Failed to reconnect cloud account")
                return
            }
            await fetchLinks()
            toast.success("Cloud account reconnected successfully")
        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleAddAccount = async () => {
        if (!selectedProvider) return
        try {
            await beginProviderConnection(selectedProvider)
            setShowAddModal(false)
            setSelectedProvider("")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Server connection failed")
        }
    }

    // Send plaintext only to the local backend; encryption occurs before the resulting bytes leave for Drive.
    const handleDriveUpload = async (file: File) => {
        const formData = new FormData()
        formData.append("file", file)
        try {
            setDriveUploading(true)
            const response = await fetch(
                `http://localhost:8080/cloud-storage/google-drive/files/encrypt-upload?ownerID=${user.userID}`,
                { method: "POST", credentials: "include", body: formData }
            )
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.message ?? "Google Drive upload failed")
            }
            await fetchDriveFiles()
            toast.success(`${file.name} encrypted and uploaded to Google Drive`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Google Drive upload failed")
        } finally {
            setDriveUploading(false)
        }
    }

    // The backend downloads and decrypts the remote object; the UI only saves the returned plaintext blob.
    const handleDriveDownload = async (file: GoogleDriveFile) => {
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/google-drive/files/${encodeURIComponent(file.fileId)}/decrypt-download?ownerID=${user.userID}`,
                { credentials: "include" }
            )
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.message ?? "Google Drive download failed")
            }
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = file.originalName
            anchor.click()
            URL.revokeObjectURL(url)
            toast.success(`${file.originalName} decrypted successfully`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Google Drive download failed")
        }
    }

    const linkedProviders = links.map(l => l.provider)
    const unlinkableProviders = availableProviders.filter(p => !linkedProviders.includes(p))
    const providerLimitReached = linkedProviders.length >= providerLimit

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="mb-1">Cloud Storage Accounts</h5>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Supports Google Drive, Dropbox, and OneDrive. {user.isSubscribed ? "Premium users can link up to 5 providers." : "Free tier can link 1 provider."}
                    </p>
                </div>
                <button
                    className="btn btn-primary flex-shrink-0"
                    onClick={() => setShowAddModal(true)}
                    disabled={unlinkableProviders.length === 0 || providerLimitReached}
                >
                    + Link Account
                </button>
            </div>

            <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
                Linked providers: {linkedProviders.length}/{providerLimit}. Available providers: Google Drive, Dropbox, OneDrive.
            </div>

            {usage && (
                <div className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between">
                        <span className="fw-semibold">Cloud Storage Usage</span>
                        <span className="text-muted" style={{ fontSize: 13 }}>{usage.fileCount} encrypted files</span>
                    </div>
                    <div className="progress mt-2" style={{ height: 8 }}>
                        <div
                            className="progress-bar"
                            style={{ width: `${Math.min(100, (usage.usedBytes / usage.totalBytes) * 100)}%` }}
                        />
                    </div>
                    <small className="text-muted">
                        {formatBytes(usage.usedBytes)} used of {formatBytes(usage.totalBytes)}.
                    </small>
                </div>
            )}

            {loading ? (
                <p className="text-muted" style={{ fontSize: 13 }}>Loading accounts...</p>
            ) : links.length === 0 ? (
                <div className="text-center py-5">
                    <div style={{ fontSize: 40 }} className="mb-2">☁️</div>
                    <p className="text-muted">No cloud storage accounts linked yet.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)} disabled={providerLimitReached}>
                        Link your first account
                    </button>
                </div>
            ) : (
                <ul className="list-group">
                    {links.map(link => (
                        <li
                            key={link.linkID}
                            className="list-group-item d-flex justify-content-between align-items-center gap-3"
                            style={{
                                borderLeftWidth: link.isActive ? 4 : 1,
                                borderLeftColor: link.isActive ? "var(--bs-primary)" : undefined,
                            }}
                        >
                            <div className="d-flex gap-3 align-items-center" style={{ minWidth: 0 }}>
                                <img
                                    src={providerLabels[link.provider]?.icon}
                                    alt=""
                                    style={{ width: 28, height: 28, flexShrink: 0 }}
                                />
                                <div style={{ minWidth: 0 }}>
                                    <div className="fw-medium d-flex gap-2 align-items-center flex-wrap">
                                        {providerLabels[link.provider]?.label}
                                        {link.isActive && (
                                            <span className="badge bg-success">Active</span>
                                        )}
                                        {link.status === "expired" && (
                                            <span className="badge bg-warning text-dark">Expired</span>
                                        )}
                                    </div>
                                    <small className="text-muted text-truncate d-block">
                                        {link.accountEmail} · Linked{" "}
                                        {new Date(link.linkedAt).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>

                            <div className="d-flex gap-2 flex-shrink-0">
                                {!link.isActive && link.status === "connected" && (
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleSetActive(link.linkID)}
                                    >
                                        Set Active
                                    </button>
                                )}
                                {link.isActive && !(link.provider === "google_drive" && !driveConnected) && (
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => handleDeactivate(link.linkID)}
                                    >
                                        Deactivate
                                    </button>
                                )}
                                {(link.status === "expired" || (link.provider === "google_drive" && !driveConnected)) && (
                                    <button
                                        className="btn btn-outline-warning btn-sm"
                                        onClick={() => handleReconnect(link.linkID)}
                                    >
                                        Reconnect
                                    </button>
                                )}
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => setShowRemoveConfirm(link)}
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="border-top mt-4 pt-4">
                <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                    <div>
                        <h6 className="mb-1">Google Drive encrypted files</h6>
                        <small className="text-muted">
                            Files are encrypted locally before upload and decrypted locally after download.
                        </small>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={fetchDriveFiles}
                            disabled={!driveConnected || driveLoading}
                        >
                            Refresh
                        </button>
                        <label className={`btn btn-primary btn-sm mb-0 ${!driveConnected || driveUploading ? "disabled" : ""}`}>
                            {driveUploading ? "Encrypting..." : "Encrypt & upload"}
                            <input
                                type="file"
                                className="d-none"
                                disabled={!driveConnected || driveUploading}
                                onChange={event => {
                                    const file = event.target.files?.[0]
                                    if (file) void handleDriveUpload(file)
                                    event.currentTarget.value = ""
                                }}
                            />
                        </label>
                    </div>
                </div>

                {!driveConfigured ? (
                    <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 13 }}>
                        Google Drive OAuth is not configured on this installation. Add the Google client ID and secret described in README.
                    </div>
                ) : !driveConnected ? (
                    <div className="alert alert-secondary py-2 mb-0" style={{ fontSize: 13 }}>
                        Link Google Drive above to upload and decrypt Drive files.
                    </div>
                ) : driveLoading ? (
                    <p className="text-muted mb-0">Loading Google Drive files...</p>
                ) : driveFiles.length === 0 ? (
                    <div className="border rounded p-3 text-muted" style={{ fontSize: 13 }}>
                        No StealthSync encrypted files are stored in this Google Drive account yet.
                    </div>
                ) : (
                    <div className="list-group">
                        {driveFiles.map(file => (
                            <div key={file.fileId} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                                <div style={{ minWidth: 0 }}>
                                    <div className="fw-medium text-truncate">{file.originalName}</div>
                                    <small className="text-muted">
                                        {formatBytes(file.fileSize)}{file.modifiedAt ? ` · ${new Date(file.modifiedAt).toLocaleString()}` : ""}
                                    </small>
                                </div>
                                <button
                                    className="btn btn-outline-primary btn-sm flex-shrink-0"
                                    onClick={() => handleDriveDownload(file)}
                                >
                                    Decrypt & download
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add cloud account link */}
            {showAddModal && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
                    onClick={() => { setShowAddModal(false); setSelectedProvider("") }}
                >
                    <div className="card p-4" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
                        <h6 className="mb-1">Link Cloud Storage Account</h6>
                        <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                            Select a provider then click Connect. A browser window will open for you to log in and approve access.
                        </p>

                        {providerLimitReached && (
                            <div className="alert alert-warning py-2" style={{ fontSize: 12 }}>
                                Your current plan can link up to {providerLimit} provider{providerLimit === 1 ? "" : "s"}.
                            </div>
                        )}

                        {unlinkableProviders.map(p => (
                            <div
                                key={p}
                                className={`d-flex align-items-center justify-content-between border rounded p-2 mb-2 ${selectedProvider === p ? "border-primary bg-primary bg-opacity-10" : ""}`}
                                onClick={() => setSelectedProvider(p)}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <img src={providerLabels[p]?.icon} alt="" style={{ width: 20, height: 20 }} />
                                    <span>{providerLabels[p]?.label}</span>
                                </div>
                                {selectedProvider === p && <span className="text-primary">✓</span>}
                            </div>
                        ))}

                        {selectedProvider && (
                            <div className="alert alert-info py-2 mt-2 mb-0" style={{ fontSize: 12 }}>
                                Clicking Connect will open a browser window to log in to {providerLabels[selectedProvider]?.label}.
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setShowAddModal(false); setSelectedProvider("") }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddAccount}
                                disabled={!selectedProvider || providerLimitReached}
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove account confirmation prompt */}
            {showRemoveConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
                    onClick={() => setShowRemoveConfirm(null)}
                >
                    <div className="card p-4" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
                        <h6>Remove Account?</h6>
                        <p className="text-muted">
                            Remove <strong>{showRemoveConfirm.accountEmail}</strong>? Your files in cloud storage will not be deleted.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-secondary" onClick={() => setShowRemoveConfirm(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleRemove(showRemoveConfirm.linkID)}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CustomerManageCloudAccLinks
