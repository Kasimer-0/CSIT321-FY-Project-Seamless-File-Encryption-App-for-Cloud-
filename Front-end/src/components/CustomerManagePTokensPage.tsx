import { useEffect, useState } from "react"
import type { PhysicalTokenRecord, UserAccount } from "../Type"
import CustomerCreatePToken from "./CustomerCreatePTokenPage"

type Props = {
    user: UserAccount
}

function CustomerManagePTokens({ user }: Props) {
    const [tokens, setTokens] = useState<PhysicalTokenRecord[]>([])
    const [loadingTokens, setLoadingTokens] = useState(false)
    const [view, setView] = useState<"list" | "create">("list")
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const [pendingActionToken, setPendingActionToken] = useState<PhysicalTokenRecord | null>(null)
    const [showStatusConfirm, setShowStatusConfirm] = useState(false)

    const premium = user.isSubscribed

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 4000)
    }

    const fetchTokens = async () => {
        if (!premium) { setTokens([]); return }
        try {
            setLoadingTokens(true)
            const res = await fetch(`http://localhost:8080/physical-tokens?ownerID=${user.userID}`, { credentials: "include" })
            if (res.ok) {
                setTokens(await res.json())
            } else {
                triggerBanner("Failed to retrieve hardware vault tokens.", "error")
            }
        } catch {
            triggerBanner("Server connection failed.", "error")
        } finally {
            setLoadingTokens(false)
        }
    }

    useEffect(() => { fetchTokens() }, [user.userID, premium])

    const handleBack = () => {
        setView("list")
        fetchTokens()
    }

    const handleCreateSuccess = () => {
        setView("list")
        fetchTokens()
        triggerBanner("Hardware security token provisioned successfully.", "success")
    }

    const toggleTokenStatus = async (token: PhysicalTokenRecord) => {
        const nextAction = token.status === "active" ? "deactivate" : "activate"
        try {
            const res = await fetch(`http://localhost:8080/physical-tokens/${token.tokenID}/${nextAction}?ownerID=${user.userID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            })
            if (!res.ok) throw new Error()
            triggerBanner("Hardware token status updated successfully.", "success")
            fetchTokens()
        } catch {
            triggerBanner("Failed to modify hardware token status vector.", "error")
        }
    }

    const triggerStatusConfirm = (token: PhysicalTokenRecord) => {
        setPendingActionToken(token)
        setShowStatusConfirm(true)
    }

    if (view === "create") {
        return (
            <CustomerCreatePToken 
                user={user}
                onBack={handleBack}
                onCreateSuccess={handleCreateSuccess}
            />
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Hardware Token Vault</h3>
                    <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>Authenticate, link, and mutate registration status verification parameters of hardware tokens.</p>
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
                    disabled={!premium}
                    onClick={() => setView("create")}
                >
                    + Provision New Token
                </button>
            </div>

            {localBanner && (
                <div className="p-3 mb-4 rounded border d-flex align-items-center gap-2" style={{ 
                    backgroundColor: localBanner.type === "error" ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)", 
                    borderColor: localBanner.type === "error" ? "#f43f5e" : "#10b981",
                    color: localBanner.type === "error" ? "#f43f5e" : "#10b981",
                    fontSize: "13px"
                }}>
                    <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }}></span>
                    <span>{localBanner.msg}</span>
                </div>
            )}

            {!premium ? (
                <div className="text-center py-5 rounded border border-dashed" style={{ color: "#a1a1aa", backgroundColor: "#1c1f22", borderColor: "#495057", fontSize: "14px" }}>
                    Hardware token compliance interfaces require premium account credentials.
                </div>
            ) : (
                <div className="table-responsive" style={{ maxHeight: "620px", overflowY: "auto" }}>
                    <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#141417" }}>
                        <thead>
                            <tr className="small tracking-wider" style={{ borderBottom: "2px solid #27272a", color: "#a1a1aa" }}>
                                <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Hardware Token Name</th>
                                <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Serial Number</th>
                                <th className="bg-transparent py-3 text-uppercase text-end fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTokens ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                        <div className="spinner-border spinner-border-sm text-cyan me-2" role="status"></div>
                                        Synchronizing secure enclave hardware layers...
                                    </td>
                                </tr>
                            ) : tokens.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                        No provisioned hardware security keys attached to account profile.
                                    </td>
                                </tr>
                            ) : (
                                tokens.map(t => (
                                    <tr key={t.tokenID} style={{ borderBottom: "1px solid #27272a" }}>
                                        <td className="bg-transparent py-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-semibold text-white font-monospace" style={{ fontSize: "15px" }}>{t.tokenName}</span>
                                                <span className="badge px-2 py-0.5 fw-medium" style={{
                                                    fontSize: "11px",
                                                    borderRadius: "4px",
                                                    backgroundColor: t.status === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(161, 161, 170, 0.15)",
                                                    color: t.status === "active" ? "#10b981" : "#a1a1aa"
                                                }}>
                                                    {t.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="bg-transparent py-3 font-monospace" style={{ fontSize: "13px", color: "#a1a1aa" }}>
                                            {t.serialNumber}
                                        </td>
                                        <td className="bg-transparent py-3 text-end">
                                            <button 
                                                className="btn btn-sm fw-medium text-white px-3" 
                                                style={{ fontSize: "13px", backgroundColor: "#3f3f46", border: "none", borderRadius: "4px" }}
                                                onClick={() => triggerStatusConfirm(t)}
                                            >
                                                {t.status === "active" ? "Deactivate" : "Activate"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showStatusConfirm && pendingActionToken && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => {
                        setShowStatusConfirm(false)
                        setPendingActionToken(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setShowStatusConfirm(false)
                            setPendingActionToken(null)
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
                            {pendingActionToken.status === "active" ? "Deactivate" : "Activate"} Physical Token?
                        </h4>
                        <p className="modal-description-text">
                            Are you sure you want to alter the operational profile signature of token <strong>{pendingActionToken.tokenName}</strong> to an {pendingActionToken.status === "active" ? "inactive" : "active"} status layout?
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => {
                                setShowStatusConfirm(false)
                                setPendingActionToken(null)
                            }}>
                                Cancel
                            </button>
                            <button 
                                className="btn border-0 fw-semibold text-white px-3"
                                style={{ backgroundColor: "#06b6d4", borderRadius: "4px", fontSize: "14px" }}
                                onClick={() => {
                                    toggleTokenStatus(pendingActionToken)
                                    setShowStatusConfirm(false)
                                    setPendingActionToken(null)
                                }}
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerManagePTokens