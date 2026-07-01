import { useState, useEffect } from "react"
import type { EncryptionKeyRecord, UserAccount } from "../Type"
import CustomerCreateEncKeyPage from "./CustomerCreateEncKeyPage"

type Props = { user: UserAccount }

function CustomerManageEncKeys({ user }: Props) {
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<"list" | "create">("list")

    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const [pendingActionKey, setPendingActionKey] = useState<EncryptionKeyRecord | null>(null)
    const [showStatusConfirm, setShowStatusConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isPremiumUser = 
        user.isSubscribed === true || 
        (user.subscription && 
        typeof user.subscription === "object" && 
        "plan" in user.subscription && 
        typeof user.subscription.plan === "object" && 
        user.subscription.plan !== null &&
        (user.subscription.plan.planTitle?.toLowerCase().includes("premium") || 
        user.subscription.plan.encMethod?.includes("256")));

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchKeys = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ ownerID: String(user.userID) })
            if (search.trim()) params.append("search", search.trim())
            
            const res = await fetch(`http://localhost:8080/encryption-keys?${params.toString()}`, { 
                credentials: "include" 
            })
            if (res.ok) {
                setKeys(await res.json())
            } else {
                triggerBanner("Failed to retrieve encryption keys.", "error")
            }
        } catch {
            triggerBanner("Server connection failed.", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchKeys, 300)
        return () => clearTimeout(timer)
    }, [search])

    const handleBack = () => {
        setView("list")
        fetchKeys()
    }

    const handleCreateSuccess = () => {
        setView("list")
        fetchKeys()
        triggerBanner("Encryption key generated successfully.", "success")
    }

    const handleKeyAction = async (method: string, endpoint: string, body?: any) => {
        try {
            const res = await fetch(`http://localhost:8080/encryption-keys/${endpoint}`, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: body ? JSON.stringify(body) : undefined
            })
            if (!res.ok) throw new Error()
            
            await fetchKeys()
            triggerBanner("Key action completed successfully.", "success")
        } catch {
            triggerBanner("Failed to modify encryption key.", "error")
        }
    }

    const triggerStatusConfirm = (key: EncryptionKeyRecord) => {
        setPendingActionKey(key)
        setShowStatusConfirm(true)
    }

    const triggerDeleteConfirm = (key: EncryptionKeyRecord) => {
        setPendingActionKey(key)
        setShowDeleteConfirm(true)
    }

    if (view === "create") {
        return (
            <CustomerCreateEncKeyPage 
                user={user} 
                isPremiumUser={!!isPremiumUser}
                onBack={handleBack} 
                onCreateSuccess={handleCreateSuccess}
            />
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Encryption Keys</h3>
                    <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>Manage your Encryption Keys, to be used for Encryption and Decryption.</p>
                </div>
                <button
                    className="btn border-0 fw-semibold text-white px-4 py-3 d-inline-flex align-items-center justify-content-center"
                    style={{ 
                        fontSize: "15px", 
                        backgroundColor: "#06b6d4", 
                        borderRadius: "6px",
                        lineHeight: "1",
                        letterSpacing: "0.02em"
                    }}
                    onClick={() => setView("create")}
                >
                    + Generate New Key
                </button>
            </div>

            {bannerMessage && (
                <div className="p-3 mb-4 rounded border d-flex align-items-center gap-2" style={{ 
                    backgroundColor: bannerType === "error" ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)", 
                    borderColor: bannerType === "error" ? "#f43f5e" : "#10b981",
                    color: bannerType === "error" ? "#f43f5e" : "#10b981",
                    fontSize: "13px"
                }}>
                    <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }}></span>
                    <span>{bannerMessage}</span>
                </div>
            )}

            <div className="mb-4">
                <input 
                    className="form-control text-white custom-search-placeholder" 
                    style={{ backgroundColor: "#0b0c10", fontSize: "14px", borderColor: "#27272a" }}
                    placeholder="Search Encryption Keys by Key Name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>

            <div className="table-responsive" style={{ maxHeight: "620px", overflowY: "auto" }}>
                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#141417" }}>
                    <thead>
                        <tr className="small tracking-wider" style={{ borderBottom: "2px solid #27272a", color: "#a1a1aa" }}>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Encryption Key Name</th>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Encryption Method</th>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Fingerprint</th>
                            <th className="bg-transparent py-3 text-uppercase text-end fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                    <div className="spinner-border spinner-border-sm text-cyan me-2" role="status"></div>
                                    Querying Key database...
                                </td>
                            </tr>
                        ) : keys.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                    No encryption keys found.
                                </td>
                            </tr>
                        ) : (
                            keys.map(key => (
                                <tr key={key.keyID} style={{ borderBottom: "1px solid #27272a" }}>
                                    <td className="bg-transparent py-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fw-semibold text-white" style={{ fontSize: "15px" }}>{key.keyName}</span>
                                            <span className="badge px-2 py-0.5 fw-medium" style={{
                                                fontSize: "11px",
                                                borderRadius: "4px",
                                                backgroundColor: key.status === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(161, 161, 170, 0.15)",
                                                color: key.status === "active" ? "#10b981" : "#a1a1aa"
                                            }}>
                                                {key.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="bg-transparent py-3" style={{ fontSize: "14px", color: "#e4e4e7" }}>
                                        {key.algorithm}
                                    </td>
                                    <td className="bg-transparent py-3 font-monospace" style={{ fontSize: "13px", color: "#a1a1aa" }}>
                                        {key.fingerprint || "N/A"}
                                    </td>
                                    <td className="bg-transparent py-3 text-end">
                                        <div className="d-inline-flex gap-2">
                                            <button 
                                                className="btn btn-sm fw-medium text-white px-3" 
                                                style={{ fontSize: "13px", backgroundColor: "#3f3f46", border: "none", borderRadius: "4px" }}
                                                onClick={() => triggerStatusConfirm(key)}
                                            >
                                                {key.status === "active" ? "Deactivate" : "Activate"}
                                            </button>
                                            <button 
                                                className="btn btn-sm fw-medium text-white px-3" 
                                                style={{ fontSize: "13px", backgroundColor: "#f43f5e", border: "none", borderRadius: "4px" }}
                                                onClick={() => triggerDeleteConfirm(key)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showStatusConfirm && pendingActionKey && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => {
                        setShowStatusConfirm(false)
                        setPendingActionKey(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setShowStatusConfirm(false)
                            setPendingActionKey(null)
                        }
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert" style={{ backgroundColor: "#06b6d4" }}></div>
                        <h4 className="modal-title-main">
                            {pendingActionKey.status === "active" ? "Deactivate" : "Activate"} Encryption Key?
                        </h4>
                        <p className="modal-description-text">
                            Are you sure you want to change <strong>{pendingActionKey.keyName}</strong> to {pendingActionKey.status === "active" ? "inactive" : "active"} state?
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => {
                                setShowStatusConfirm(false)
                                setPendingActionKey(null)
                            }}>
                                Cancel
                            </button>
                            <button 
                                className="btn border-0 fw-semibold text-white px-3"
                                style={{ backgroundColor: "#06b6d4", borderRadius: "4px", fontSize: "14px" }}
                                onClick={() => {
                                    handleKeyAction("PATCH", `${pendingActionKey.keyID}?ownerID=${user.userID}`, { 
                                        status: pendingActionKey.status === "active" ? "inactive" : "active" 
                                    })
                                    setShowStatusConfirm(false)
                                    setPendingActionKey(null)
                                }}
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {showDeleteConfirm && pendingActionKey && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => {
                        setShowDeleteConfirm(false)
                        setPendingActionKey(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setShowDeleteConfirm(false)
                            setPendingActionKey(null)
                        }
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert"></div>
                        <h4 className="modal-title-main">Delete Encryption Key?</h4>
                        <p className="modal-description-text">
                            You are about to delete <strong>{pendingActionKey.keyName}</strong>. This action cannot be undone.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => {
                                setShowDeleteConfirm(false)
                                setPendingActionKey(null)
                            }}>
                                Cancel
                            </button>
                            <button 
                                className="btn-modal-destructive" 
                                onClick={() => {
                                    handleKeyAction("DELETE", `${pendingActionKey.keyID}?ownerID=${user.userID}`)
                                    setShowDeleteConfirm(false)
                                    setPendingActionKey(null)
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            <style>{`
                .custom-search-placeholder::placeholder {
                    color: #52525b !important;
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    )
}

export default CustomerManageEncKeys