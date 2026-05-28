import { useState, useEffect } from "react"
import type { CloudStorageLink } from "../Type"
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

function CustomerManageCloudAccLinks() {
    const [links, setLinks] = useState<CloudStorageLink[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<CloudStorageLink | null>(null)
    const [selectedProvider, setSelectedProvider] = useState("")

    const fetchLinks = async () => {
        try {
            setLoading(true)

            const response = await fetch("http://localhost:8080/cloud-storage/links", {
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

    useEffect(() => {
        fetchLinks()
    }, [])

    
    /*uncomment when Electron code is done
    useEffect(() => {
        window.electronAPI.onOAuthComplete(() => {
            fetchLinks()
        })
    }, [])
    */

    const handleSetActive = async (linkID: number) => {
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
            toast.success("Cloud account set as active successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleRemove = async (linkID: number) => {
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
            setShowRemoveConfirm(null)
            toast.success("Cloud account removed successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleReconnect = async (linkID: number) => {
        try {
            const response = await fetch(
                `http://localhost:8080/cloud-storage/links/${linkID}/reconnect`,
                {
                    method: "PATCH",
                    credentials: "include"
                }
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
            const response = await fetch(
                `http://localhost:8080/cloud-storage/auth/${selectedProvider}`,
                { credentials: "include" }
            )

            if (!response.ok) {
                toast.error("Failed to initiate cloud account connection")
                return
            }

            /*uncomment when Electron code is done
            const data = await response.json()
            window.electronAPI.openExternal(data.authUrl)
            */
            
            // after OAuth completes backend saves the token in CloudStorageLink entity token attirbute

            setShowAddModal(false)
            setSelectedProvider("")
            toast.success("Cloud account connected successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const linkedProviders = links.map(l => l.provider)
    const unlinkableProviders = availableProviders.filter(p => !linkedProviders.includes(p))

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="mb-1">Cloud Storage Accounts</h5>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Link your cloud storage accounts. Only one can be active at a time.
                    </p>
                </div>
                <button
                    className="btn btn-primary flex-shrink-0"
                    onClick={() => setShowAddModal(true)}
                    disabled={unlinkableProviders.length === 0}
                >
                    + Link Account
                </button>
            </div>

            {loading ? (
                <p className="text-muted" style={{ fontSize: 13 }}>Loading accounts...</p>
            ) : links.length === 0 ? (
                <div className="text-center py-5">
                    <div style={{ fontSize: 40 }} className="mb-2">☁️</div>
                    <p className="text-muted">No cloud storage accounts linked yet.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
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
                                {link.status === "expired" && (
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
                                disabled={!selectedProvider}
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