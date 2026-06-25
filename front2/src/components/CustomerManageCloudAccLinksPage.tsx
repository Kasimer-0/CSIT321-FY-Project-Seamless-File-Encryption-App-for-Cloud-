import { useState, useEffect } from "react"
import type { CloudStorageLink, CloudStorageUsage, GoogleDriveFile, UserAccount } from "../Type"

// Mock imports for icons
const providerLabels: Record<string, { label: string; icon: string }> = {
    google_drive: { label: "GOOGLE_DRIVE", icon: "/assets/googledrive.png" },
    dropbox: { label: "DROPBOX", icon: "/assets/dropbox.png" },
    onedrive: { label: "ONEDRIVE", icon: "/assets/onedrive.png" },
}

const availableProviders = ["google_drive", "dropbox", "onedrive"]

type Props = { user: UserAccount }

function CustomerManageCloudAccLinks({ user }: Props) {
    const [links, setLinks] = useState<CloudStorageLink[]>([])
    const [usage, setUsage] = useState<CloudStorageUsage | null>(null)
    const [driveConnected, setDriveConnected] = useState(false)
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
    const [loading, setLoading] = useState(true)
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            const [linksRes, usageRes] = await Promise.all([
                fetch(`http://localhost:8080/cloud-storage/links?ownerID=${user.userID}`, { credentials: "include" }),
                fetch("http://localhost:8080/cloud-storage/usage", { credentials: "include" })
            ])
            if (linksRes.ok) setLinks(await linksRes.json())
            if (usageRes.ok) setUsage(await usageRes.json())
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void fetchDashboardData() }, [user.userID])

    const handleDriveOperation = async (url: string, method = "POST", body?: any) => {
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: body ? JSON.stringify(body) : undefined
            })
            if (!res.ok) throw new Error("OPERATION_FAILED")
            return await res.json()
        } catch (err) {
            triggerBanner("PIPELINE_ERROR: Check service connectivity.", "error")
            return null
        }
    }

    return (
        <div className="font-monospace">
            <div className="border-bottom border-muted pb-3 mb-4">
                <h5 className="workspace-section-heading">CLOUD_STORAGE_MANAGEMENT</h5>
                <p className="text-muted fs-8">MANAGE_SECURE_VAULT_ENDPOINTS_AND_REMOTE_ASSETS</p>
            </div>

            {localBanner && (
                <div className={`mb-3 py-2 px-3 rounded fs-8 ${localBanner.type === "success" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                    {localBanner.msg}
                </div>
            )}

            {/* Storage Quota */}
            {usage && (
                <div className="bg-workspace-card p-3 border rounded mb-4">
                    <div className="d-flex justify-content-between mb-2 fs-8">
                        <span>VAULT_CAPACITY_USAGE</span>
                        <span>{((usage.usedBytes / usage.totalBytes) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                        <div className="progress-bar bg-cyan" style={{ width: `${(usage.usedBytes / usage.totalBytes) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Provider List */}
            <div className="mb-5">
                <h6 className="fs-8 text-muted mb-3">LINKED_PROVIDERS</h6>
                {links.map(link => (
                    <div key={link.linkID} className="d-flex align-items-center justify-content-between border-bottom py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-2 border rounded">{link.provider.slice(0, 2).toUpperCase()}</div>
                            <div>
                                <div className="fw-semibold fs-7">{link.accountEmail}</div>
                                <div className="text-muted fs-8">{link.status.toUpperCase()}</div>
                            </div>
                        </div>
                        <button className="btn-workspace-action" onClick={() => {}}>MANAGE</button>
                    </div>
                ))}
            </div>

            {/* Google Drive Files */}
            <div className="border-top pt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fs-8">GOOGLE_DRIVE_VAULT_FILES</h6>
                    <button className="btn-workspace-action" onClick={() => {}}>REFRESH_VAULT</button>
                </div>
                
                {!driveConnected ? (
                    <div className="text-center py-4 border-dashed rounded fs-8 text-muted">
                        DRIVE_NOT_INITIALIZED_OR_UNLINKED
                    </div>
                ) : (
                    <div className="list-group">
                        {driveFiles.map(file => (
                            <div key={file.fileId} className="list-group-item bg-transparent d-flex justify-content-between align-items-center">
                                <span className="fs-7">{file.originalName}</span>
                                <div className="d-flex gap-2">
                                    <button className="btn-workspace-action text-cyan">DECRYPT</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CustomerManageCloudAccLinks