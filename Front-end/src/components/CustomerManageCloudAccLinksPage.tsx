import { useState, useEffect } from "react"
import type { UserAccount, CloudStorageLink, CloudStorageUsage } from "../Type"

type Props = { user: UserAccount }

function CustomerManageCloudAccLinks({ user }: Props) {
    const [links, setLinks] = useState<CloudStorageLink[]>([])
    const [usages, setUsages] = useState<Record<number, CloudStorageUsage>>({})
    const [loading, setLoading] = useState(true)
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    const fetchLinksAndUsage = async () => {
        setLoading(true)
        try {
            const res = await fetch(`http://localhost:8080/cloud-storage/links?ownerID=${user.userID}`, { credentials: "include" })
            if (res.ok) {
                const linksData: CloudStorageLink[] = await res.json()
                setLinks(linksData)

                const usagePromises = linksData.map(async (link) => {
                    try {
                        const usageRes = await fetch(`http://localhost:8080/cloud-storage/usage?linkID=${link.linkID}`, { credentials: "include" })
                        if (usageRes.ok) {
                            const usageData: CloudStorageUsage = await usageRes.json()
                            return { linkID: link.linkID, data: usageData }
                        }
                    } catch {
                    }
                    return null
                })

                const usageResults = await Promise.all(usagePromises)
                const newUsages: Record<number, CloudStorageUsage> = {}
                usageResults.forEach((result) => {
                    if (result) newUsages[result.linkID] = result.data
                })
                setUsages(newUsages)
            }
        } catch (err) {
            triggerBanner("Failed to retrieve cloud accounts.", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchLinksAndUsage()
    }, [user.userID])

    const handleAction = async (linkID: number, action: "set_active" | "deactivate" | "remove" | "reconnect") => {
        try {
            const res = await fetch(`http://localhost:8080/cloud-storage/links/${linkID}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ action })
            })
            if (!res.ok) throw new Error()
            
            triggerBanner(`SUCCESS: Action [${action.toUpperCase()}] executed smoothly.`, "success")
            void fetchLinksAndUsage()
        } catch (err) {
            triggerBanner(`Could not execute ${action}.`, "error")
        }
    }

    const handleLinkAccount = (provider: string) => {
        triggerBanner("Starting account linking...", "success")
        
        const width = 600
        const height = 700
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        
        const url = `http://localhost:8080/cloud-storage/auth/init?provider=${provider}&ownerID=${user.userID}`
        
        window.open(
            url, 
            "Connect Cloud Provider", 
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        )
    }

    const getProviderMeta = (provider: string) => {
        switch (provider.toLowerCase()) {
            case "google_drive": return { name: "Google Drive", icon: "▲", color: "#4285F4" }
            case "dropbox": return { name: "Dropbox", icon: "❖", color: "#0061FE" }
            case "onedrive": return { name: "OneDrive", icon: "☁", color: "#0078D4" }
            default: return { name: provider.toUpperCase(), icon: "■", color: "#17a2b8" }
        }
    }

    return (
        <div className="p-4 font-sans text-white" style={{ backgroundColor: "#0b0c10" }}>
            <div className="d-flex justify-content-between align-items-start mb-4 border-bottom pb-3" style={{ borderColor: "#1f2833" }}>
                <div>
                    <h3 className="fw-bold m-0" style={{ fontSize: "1.5rem", color: "#ffffff", letterSpacing: "0.5px" }}>
                        Cloud Storage Accounts
                    </h3>
                    <p className="m-0 mt-1" style={{ fontSize: "0.85rem", color: "#a9b7c6" }}>
                        Link your cloud storage accounts. Only one can be active at a time.
                    </p>
                </div>
                <button 
                    className="btn fw-bold px-3 py-2 text-dark" 
                    style={{ backgroundColor: "#00bcd4", fontSize: "0.85rem", borderRadius: "4px", border: "none" }}
                    onClick={() => handleLinkAccount("google_drive")}
                >
                    + Link Account
                </button>
            </div>

            {localBanner && (
                <div className="mb-3 py-2 px-3 border rounded text-center fw-medium" style={{ 
                    backgroundColor: localBanner.type === "success" ? "rgba(40, 167, 69, 0.15)" : "rgba(220, 53, 69, 0.15)",
                    color: localBanner.type === "success" ? "#28a745" : "#dc3545",
                    borderColor: localBanner.type === "success" ? "#28a745" : "#dc3545",
                    fontSize: "0.85rem"
                }}>
                    {localBanner.msg}
                </div>
            )}

            <h5 className="fw-bold mb-3" style={{ fontSize: "1.1rem", color: "#00bcd4" }}>
                Linked Cloud Storage Platforms
            </h5>

            <div className="rounded border" style={{ backgroundColor: "#12141c", borderColor: "#1f2833" }}>
                {loading ? (
                    <div className="text-center py-4 fw-medium small" style={{ color: "#a9b7c6" }}>Fetching Cloud Storage data...</div>
                ) : links.length === 0 ? (
                    <div className="text-center py-4 fw-medium small" style={{ color: "#a9b7c6" }}>No Cloud Storage Accounts registered. Click "+ Link Account" to begin.</div>
                ) : (
                    links.map((link) => {
                        const meta = getProviderMeta(link.provider)
                        const usage = usages[link.linkID]
                        const capacityPercentage = usage && usage.totalBytes > 0 
                            ? (usage.usedBytes / usage.totalBytes) * 100 
                            : 0
                        
                        const displayDate = link.linkedAt ? new Date(link.linkedAt).toLocaleDateString() : "N/A"

                        return (
                            <div 
                                key={link.linkID} 
                                className="p-3 border-bottom d-flex flex-column gap-3"
                                style={{ 
                                    borderColor: "#1f2833",
                                    borderLeft: link.isActive ? "4px solid #00bcd4" : "4px solid transparent",
                                    backgroundColor: link.isActive ? "rgba(0, 188, 212, 0.04)" : "transparent"
                                }}
                            >
                                <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="fs-4 d-flex align-items-center justify-content-center" style={{ width: "32px", color: meta.color }}>
                                            {meta.icon}
                                        </div>
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-white" style={{ fontSize: "1rem" }}>{meta.name}</span>
                                                {link.isActive && (
                                                    <span className="badge px-2 py-0.5 rounded-sm fw-bold text-dark" style={{ fontSize: "0.65rem", backgroundColor: "#00bcd4" }}>ACTIVE</span>
                                                )}
                                                {link.status === "expired" && (
                                                    <span className="badge bg-warning text-dark px-2 py-0.5 rounded-sm fw-bold" style={{ fontSize: "0.65rem" }}>EXPIRED</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "#a9b7c6", marginTop: "2px" }}>
                                                {link.accountEmail} <span style={{ color: "#5f6c7d" }}>|</span> Linked {displayDate}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-2">
                                        {link.status === "expired" ? (
                                            <button 
                                                className="btn btn-sm btn-warning text-dark fw-bold px-3" 
                                                style={{ fontSize: "0.8rem", borderRadius: "4px" }}
                                                onClick={() => void handleAction(link.linkID, "reconnect")}
                                            >
                                                Reconnect
                                            </button>
                                        ) : link.isActive ? (
                                            <button 
                                                className="btn btn-sm text-white fw-bold px-3" 
                                                style={{ fontSize: "0.8rem", backgroundColor: "#5a6268", border: "none", borderRadius: "4px" }}
                                                onClick={() => void handleAction(link.linkID, "deactivate")}
                                            >
                                                Deactivate
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn btn-sm text-dark fw-bold px-3" 
                                                style={{ fontSize: "0.8rem", backgroundColor: "#00bcd4", border: "none", borderRadius: "4px" }}
                                                onClick={() => void handleAction(link.linkID, "set_active")}
                                            >
                                                Set Active
                                            </button>
                                        )}

                                        <button 
                                            className="btn btn-sm text-white fw-bold px-3" 
                                            style={{ fontSize: "0.8rem", backgroundColor: "#e02443", border: "none", borderRadius: "4px" }}
                                            onClick={() => void handleAction(link.linkID, "remove")}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                {usage && usage.totalBytes > 0 && (
                                    <div className="pt-2 border-top" style={{ maxWidth: "550px", borderColor: "#1f2833" }}>
                                        <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem" }}>
                                            <span style={{ color: "#00bcd4", fontWeight: "600" }}>Cloud Storage Capacity</span>
                                            <span style={{ color: "#ffffff", fontWeight: "600" }}>
                                                {capacityPercentage.toFixed(1)}% <span style={{ color: "#a9b7c6", fontWeight: "normal" }}>({usage.fileCount} files)</span>
                                            </span>
                                        </div>
                                        <div className="progress" style={{ height: "6px", backgroundColor: "#1f2833", borderRadius: "2px" }}>
                                            <div 
                                                className="progress-bar" 
                                                style={{ 
                                                    width: `${capacityPercentage}%`, 
                                                    backgroundColor: link.isActive ? "#00bcd4" : "#5a6268",
                                                    borderRadius: "2px"
                                                }} 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default CustomerManageCloudAccLinks