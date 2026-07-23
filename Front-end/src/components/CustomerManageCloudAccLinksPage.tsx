import { apiFetch } from "../lib/api"
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
// The UI stores provider keys in the database format, while the backend route uses
// google-drive for readability; the helper keeps that translation in one place.
const providerPath = (provider: string) => provider === "google_drive" ? "google-drive" : provider
const providerLabel = (provider?: string) => provider ? providerLabels[provider]?.label ?? provider : "Cloud provider"

/**
 * This page provides persisted cloud links,
 * free/premium provider limits, and OAuth connection entry points for every supported provider.
 */
type Props = {
    user: UserAccount
}

function CustomerManageCloudAccLinks({ user }: Props) {
    const [links, setLinks] = useState<CloudStorageLink[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<CloudStorageLink | null>(null)
    const [showActivateConfirm, setShowActivateConfirm] = useState<CloudStorageLink | null>(null)
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<CloudStorageLink | null>(null)
    const [changingActiveLinkID, setChangingActiveLinkID] = useState<number | null>(null)
    const [selectedProvider, setSelectedProvider] = useState("")
    const [usage, setUsage] = useState<CloudStorageUsage | null>(null)
    const [providerLimit, setProviderLimit] = useState(user.isSubscribed ? 5 : 1)
    const [providerConfigured, setProviderConfigured] = useState<Record<string, boolean>>({})
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
    const [driveLoading, setDriveLoading] = useState(false)

    const fetchLinks = async () => {
        try {
            setLoading(true)

            const response = await apiFetch("/cloud-storage/links", {
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
            const response = await apiFetch("/cloud-storage/usage", {
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
            const response = await apiFetch("/cloud-storage/providers", {
                credentials: "include"
            })
            if (response.ok) {
                const data = await response.json()
                setProviderLimit(Number(data.providerLimit ?? (user.isSubscribed ? 5 : 1)))
                setProviderConfigured(data.configured ?? {})
            }
        } catch (err) {
            console.error("Failed to fetch cloud provider info")
        }
    }

    // Only StealthSync-tagged encrypted objects are returned by the active provider integration.
    // The same endpoint shape is used for Google Drive, Dropbox, and OneDrive.
    const fetchActiveProviderFiles = async (provider = activeCloudLink?.provider) => {
        if (!provider) {
            setDriveFiles([])
            return
        }
        try {
            setDriveLoading(true)
            const response = await apiFetch(
                `/cloud-storage/${providerPath(provider)}/files`,
                { credentials: "include" }
            )
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.message ?? `Failed to load ${providerLabel(provider)} files`)
            }
            const files = await response.json() as GoogleDriveFile[]
            setDriveFiles(files.filter(file => file.envelopeVersion === 2))
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to load ${providerLabel(provider)} files`)
        } finally {
            setDriveLoading(false)
        }
    }

    useEffect(() => {
        fetchLinks()
        fetchUsage()
        fetchProviderInfo()
    }, [user.userID, user.isSubscribed])

    useEffect(() => {
        const url = new URL(window.location.href)
        const oauthStatus = url.searchParams.get("oauth")
        if (!oauthStatus) return
        const provider = url.searchParams.get("provider") ?? "cloud provider"
        if (oauthStatus === "connected") {
            toast.success(`${providerLabel(provider)} connected successfully`)
        } else if (oauthStatus === "cancelled") {
            toast.error(`${providerLabel(provider)} authorization was cancelled`)
        } else {
            toast.error(`${providerLabel(provider)} authorization failed`)
        }
        url.searchParams.delete("oauth")
        url.searchParams.delete("provider")
        url.searchParams.delete("account")
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    }, [])

    const handleSetActive = async (linkID: number) => {
        const selectedLink = links.find(link => link.linkID === linkID)
        try {
            setChangingActiveLinkID(linkID)
            const response = await apiFetch(
                `/cloud-storage/links/${linkID}/activate`,
                {
                    method: "POST",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to set active cloud account")
                return
            }

            await fetchLinks()
            if (selectedLink?.provider) {
                await fetchActiveProviderFiles(selectedLink.provider)
            }
            toast.success("Cloud account set as active successfully")

        } catch (err) {
            toast.error("Server connection failed")
        } finally {
            setChangingActiveLinkID(null)
            setShowActivateConfirm(null)
        }
    }

    const handleRemove = async (linkID: number) => {
        const removedLink = links.find(link => link.linkID === linkID)
        try {
            const response = await apiFetch(
                `/cloud-storage/links/${linkID}`,
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
            if (removedLink?.provider === activeCloudLink?.provider) {
                setDriveFiles([])
            }
            setShowRemoveConfirm(null)
            toast.success("Cloud account removed successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleDeactivate = async (linkID: number) => {
        try {
            setChangingActiveLinkID(linkID)
            const response = await apiFetch(
                `/cloud-storage/links/${linkID}/deactivate`,
                {
                    method: "POST",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to deactivate cloud account")
                return
            }

            await fetchLinks()
            setDriveFiles([])
            toast.success("Cloud account deactivated")

        } catch (err) {
            toast.error("Server connection failed")
        } finally {
            setChangingActiveLinkID(null)
            setShowDeactivateConfirm(null)
        }
    }

    // OAuth continues in the same browser tab and the backend callback redirects to the configured frontend URL.
    const beginProviderConnection = async (provider: string) => {
        const response = await apiFetch(
            `/cloud-storage/${providerPath(provider)}/auth`,
            { credentials: "include" }
        )
        if (!response.ok) {
            const data = await response.json().catch(() => null)
            throw new Error(data?.message ?? "Failed to initiate cloud account connection")
        }

        const data = await response.json()
        if (!data.authUrl) throw new Error("The OAuth authorization URL was not returned.")
        window.location.assign(data.authUrl)
    }

    const handleReconnect = async (linkID: number) => {
        const link = links.find(item => item.linkID === linkID)
        if (!link) return
        try {
            await beginProviderConnection(link.provider)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to reconnect cloud account")
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

    const handleProviderDelete = async (file: GoogleDriveFile) => {
        const provider = file.provider ?? activeCloudLink?.provider
        if (!provider) {
            toast.error("Activate a cloud provider before deleting files")
            return
        }
        try {
            // Hide the row only after the provider confirms deletion, so a failed API
            // request never makes a still-existing remote file disappear locally.
            const response = await apiFetch(
                `/cloud-storage/${providerPath(provider)}/files/${encodeURIComponent(file.fileId)}`,
                { method: "DELETE", credentials: "include" }
            )
            if (!response.ok) throw new Error(`${providerLabel(provider)} delete failed`)
            setDriveFiles(current => current.filter(item => item.fileId !== file.fileId))
            toast.success(`Encrypted file deleted from ${providerLabel(provider)}`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Cloud file delete failed")
        }
    }

    const linkedProviders = links.map(l => l.provider)
    const unlinkableProviders = availableProviders.filter(p => !linkedProviders.includes(p))
    const providerLimitReached = linkedProviders.length >= providerLimit
    const activeCloudLink = links.find(link => link.isActive && link.status === "connected") ?? null
    const activeProviderName = providerLabel(activeCloudLink?.provider)

    // Refresh the file panel whenever the active provider changes, so the page
    // no longer shows Google Drive-only results after Dropbox or OneDrive is activated.
    useEffect(() => {
        if (activeCloudLink) {
            void fetchActiveProviderFiles(activeCloudLink.provider)
        } else {
            setDriveFiles([])
        }
    }, [activeCloudLink?.linkID, activeCloudLink?.provider])

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
                Linked providers: {linkedProviders.length}/{providerLimit}. Only one account can be active at a time; the active account is the default upload destination.
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
                    <div style={{ fontSize: 40 }} className="mb-2">Cloud</div>
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
                                        {link.accountEmail} | Linked{" "}
                                        {new Date(link.linkedAt).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>

                            <div className="d-flex gap-2 flex-shrink-0">
                                {!link.isActive && link.status === "connected" && (
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => setShowActivateConfirm(link)}
                                    >
                                        Activate
                                    </button>
                                )}
                                {link.isActive && link.status === "connected" && (
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setShowDeactivateConfirm(link)}
                                    >
                                        Deactivate
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
            <div className="border-top mt-4 pt-4">
                <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                    <div>
                        <h6 className="mb-1">{activeProviderName} encrypted files</h6>
                        <small className="text-muted">
                            Files are encrypted locally before upload and decrypted locally after download. Use Encrypt and Upload File for new uploads.
                        </small>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => void fetchActiveProviderFiles()}
                            disabled={!activeCloudLink || driveLoading}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {!activeCloudLink ? (
                    <div className="alert alert-secondary py-2 mb-0" style={{ fontSize: 13 }}>
                        Activate a linked cloud provider above to view its encrypted files.
                    </div>
                ) : driveLoading ? (
                    <p className="text-muted mb-0">Loading {activeProviderName} files...</p>
                ) : driveFiles.length === 0 ? (
                    <div className="border rounded p-3 text-muted" style={{ fontSize: 13 }}>
                        No StealthSync encrypted files are stored in this {activeProviderName} account yet.
                    </div>
                ) : (
                    <div className="list-group">
                        {driveFiles.map(file => (
                            <div key={file.fileId} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                                <div style={{ minWidth: 0 }}>
                                    <div className="fw-medium text-truncate">{file.envelopeVersion === 2 ? "Encrypted file" : file.originalName}</div>
                                    <small className="text-muted">
                                        {formatBytes(file.fileSize)} | {file.encMethod}
                                        {file.modifiedAt ? ` | ${new Date(file.modifiedAt).toLocaleString()}` : ""}
                                    </small>
                                    <div><small className="text-muted text-break">{file.fileName}</small></div>
                                </div>
                                <div className="d-flex gap-2 flex-shrink-0">
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleProviderDelete(file)}>
                                        Delete
                                    </button>
                                </div>
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
                            Select a provider then click Connect. This tab will continue to the provider and return after approval.
                        </p>

                        {providerLimitReached && (
                            <div className="alert alert-warning py-2" style={{ fontSize: 12 }}>
                                Your current plan can link up to {providerLimit} provider{providerLimit === 1 ? "" : "s"}.
                            </div>
                        )}

                        {unlinkableProviders.map(p => {
                            const configured = providerConfigured[p] === true
                            return (
                                <div
                                    key={p}
                                    className={`d-flex align-items-center justify-content-between border rounded p-2 mb-2 ${selectedProvider === p ? "border-primary bg-primary bg-opacity-10" : ""} ${configured ? "" : "opacity-75"}`}
                                    onClick={() => configured && setSelectedProvider(p)}
                                    style={{ cursor: configured ? "pointer" : "not-allowed" }}
                                >
                                    <div className="d-flex align-items-center gap-2">
                                        <img src={providerLabels[p]?.icon} alt="" style={{ width: 20, height: 20 }} />
                                        <span>{providerLabels[p]?.label}</span>
                                    </div>
                                    {!configured ? (
                                        <span className="badge bg-warning text-dark">Setup required</span>
                                    ) : selectedProvider === p ? (
                                        <span className="text-primary">Selected</span>
                                    ) : null}
                                </div>
                            )
                        })}

                        {selectedProvider && (
                            <div className="alert alert-info py-2 mt-2 mb-0" style={{ fontSize: 12 }}>
                                Clicking Connect will continue to {providerLabels[selectedProvider]?.label} in this tab.
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
                                disabled={!selectedProvider || providerLimitReached || providerConfigured[selectedProvider] !== true}
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activating one provider automatically deactivates the currently active provider. */}
            {showActivateConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
                    onClick={() => changingActiveLinkID === null && setShowActivateConfirm(null)}
                >
                    <div className="card p-4" style={{ width: 420 }} onClick={event => event.stopPropagation()}>
                        <h6>Activate Cloud Account?</h6>
                        <p className="text-muted mb-4">
                            Activate <strong>{providerLabel(showActivateConfirm.provider)}</strong> ({showActivateConfirm.accountEmail})?
                            Any other active cloud account will be deactivated automatically.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary" onClick={() => setShowActivateConfirm(null)} disabled={changingActiveLinkID !== null}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleSetActive(showActivateConfirm.linkID)} disabled={changingActiveLinkID !== null}>
                                {changingActiveLinkID !== null ? "Activating..." : "Yes, Activate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeactivateConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
                    onClick={() => changingActiveLinkID === null && setShowDeactivateConfirm(null)}
                >
                    <div className="card p-4" style={{ width: 420 }} onClick={event => event.stopPropagation()}>
                        <h6>Deactivate Cloud Account?</h6>
                        <p className="text-muted mb-4">
                            Deactivate <strong>{providerLabel(showDeactivateConfirm.provider)}</strong> ({showDeactivateConfirm.accountEmail})?
                            Upload and download actions will remain unavailable until a provider is activated.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary" onClick={() => setShowDeactivateConfirm(null)} disabled={changingActiveLinkID !== null}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => handleDeactivate(showDeactivateConfirm.linkID)} disabled={changingActiveLinkID !== null}>
                                {changingActiveLinkID !== null ? "Deactivating..." : "Yes, Deactivate"}
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
