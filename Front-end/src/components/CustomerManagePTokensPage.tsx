import { useEffect, useState } from "react"
import type { EncryptionKeyRecord, PhysicalTokenRecord, UserAccount } from "../Type"
import { apiFetch } from "../lib/api"

type Props = {
    user: UserAccount
}

function CustomerManagePTokens({ user }: Props) {
    const [tokens, setTokens] = useState<PhysicalTokenRecord[]>([])
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [loadingTokens, setLoadingTokens] = useState(false)
    const [view, setView] = useState<"list" | "create">("list")
    const [tokenName, setTokenName] = useState("")
    const [serialNumber, setSerialNumber] = useState("")
    const [selectedKeyID, setSelectedKeyID] = useState("")
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const [pendingActionToken, setPendingActionToken] = useState<PhysicalTokenRecord | null>(null)
    const [showStatusConfirm, setShowStatusConfirm] = useState(false)
    const [pendingDeleteToken, setPendingDeleteToken] = useState<PhysicalTokenRecord | null>(null)

    const premium = user.isSubscribed

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 4000)
    }

    const fetchTokens = async () => {
        if (!premium) {
            setTokens([])
            return
        }
        try {
            setLoadingTokens(true)
            // apiFetch attaches the JWT; the backend scopes tokens to the current
            // user, so the old ownerID query parameter is no longer needed.
            const res = await apiFetch("http://localhost:8080/physical-tokens", { credentials: "include" })
            if (res.ok) {
                setTokens(await res.json())
            } else {
                triggerBanner("Failed to retrieve physical token registration records.", "error")
            }
        } catch {
            triggerBanner("Server connection failed.", "error")
        } finally {
            setLoadingTokens(false)
        }
    }

    const fetchKeys = async () => {
        if (!premium) {
            setKeys([])
            return
        }
        try {
            const response = await apiFetch("http://localhost:8080/encryption-keys", { credentials: "include" })
            if (!response.ok) throw new Error()
            setKeys(await response.json())
        } catch {
            triggerBanner("Failed to retrieve encryption keys for token association.", "error")
        }
    }

    useEffect(() => {
        fetchTokens()
        fetchKeys()
    }, [user.userID, premium])

    const createToken = async () => {
        try {
            // Registration stays inline and uses the same owner-scoped protected API.
            const res = await apiFetch("http://localhost:8080/physical-tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    tokenName: tokenName.trim() || "Security Token",
                    serialNumber: serialNumber.trim() || undefined,
                    encryptionKeyID: selectedKeyID ? Number(selectedKeyID) : null
                })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.message ?? "Failed to register token record.")
            }
            setTokenName("")
            setSerialNumber("")
            setSelectedKeyID("")
            setView("list")
            triggerBanner("Physical token registration created.", "success")
            await fetchTokens()
        } catch (error) {
            triggerBanner(error instanceof Error ? error.message : "Failed to register token record.", "error")
        }
    }

    const toggleTokenStatus = async (token: PhysicalTokenRecord) => {
        const nextAction = token.status === "active" ? "deactivate" : "activate"
        try {
            const res = await apiFetch(`http://localhost:8080/physical-tokens/${token.tokenID}/${nextAction}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            })
            if (!res.ok) throw new Error()
            triggerBanner("Physical token registration status updated.", "success")
            await fetchTokens()
        } catch {
            triggerBanner("Failed to update physical token registration status.", "error")
        }
    }

    const triggerStatusConfirm = (token: PhysicalTokenRecord) => {
        setPendingActionToken(token)
        setShowStatusConfirm(true)
    }

    const removeToken = async (token: PhysicalTokenRecord) => {
        try {
            const response = await apiFetch(`http://localhost:8080/physical-tokens/${token.tokenID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) throw new Error()
            triggerBanner("Physical token registration removed.", "success")
            await fetchTokens()
        } catch {
            triggerBanner("Failed to remove physical token registration.", "error")
        } finally {
            setPendingDeleteToken(null)
        }
    }

    const keyLabel = (token: PhysicalTokenRecord) => {
        if (token.encryptionKeyID == null) return "Not associated"
        const key = keys.find(candidate => candidate.keyID === token.encryptionKeyID)
        return key ? `${key.keyName} (#${key.keyID})` : `Key #${token.encryptionKeyID}`
    }

    const renderCreateView = () => (
        <div className="rounded border p-4" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a" }}>
            <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                <div>
                    <h4 className="fw-semibold text-white mb-1" style={{ fontSize: "18px" }}>Register Token Record</h4>
                    <p className="small mb-0" style={{ color: "#a1a1aa" }}>Register a prototype token record for this premium account.</p>
                </div>
                <button className="btn-modal-dismiss" type="button" onClick={() => setView("list")}>
                    Back
                </button>
            </div>
            <div className="row g-3">
                <div className="col-12 col-md-4">
                    <label className="form-label text-uppercase small" style={{ color: "#a1a1aa" }}>Token Name</label>
                    <input
                        className="form-control"
                        value={tokenName}
                        onChange={event => setTokenName(event.target.value)}
                        placeholder="Demo token"
                    />
                </div>
                <div className="col-12 col-md-4">
                    <label className="form-label text-uppercase small" style={{ color: "#a1a1aa" }}>Serial Number</label>
                    <input
                        className="form-control"
                        value={serialNumber}
                        onChange={event => setSerialNumber(event.target.value)}
                        placeholder="Optional serial"
                    />
                </div>
                <div className="col-12 col-md-4">
                    <label className="form-label text-uppercase small" style={{ color: "#a1a1aa" }}>Encryption Key</label>
                    <select className="form-select" value={selectedKeyID} onChange={event => setSelectedKeyID(event.target.value)}>
                        <option value="">No key association</option>
                        {keys.filter(key => key.status === "active").map(key => (
                            <option key={key.keyID} value={key.keyID}>{key.keyName} (#{key.keyID})</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="d-flex justify-content-end gap-3 mt-4">
                <button className="btn-modal-dismiss" type="button" onClick={() => setView("list")}>
                    Cancel
                </button>
                <button className="btn border-0 fw-semibold text-dark px-4" type="button" style={{ backgroundColor: "#06b6d4", borderRadius: "6px" }} onClick={createToken}>
                    Create Token
                </button>
            </div>
        </div>
    )

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Physical Token Registration Prototype</h3>
                    <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>Records token registration, lifecycle status, and an optional encryption-key association.</p>
                </div>
                {view === "list" && (
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
                        + Register Token Record
                    </button>
                )}
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

            <div className="alert alert-warning mb-4" role="note">
                Prototype: this records token registration and key association only. Real USB/FIDO2 presence verification is Future Work.
            </div>

            {!premium ? (
                <div className="text-center py-5 rounded border border-dashed" style={{ color: "#a1a1aa", backgroundColor: "#1c1f22", borderColor: "#495057", fontSize: "14px" }}>
                    Physical token prototype requires a premium account.
                </div>
            ) : view === "create" ? (
                renderCreateView()
            ) : (
                <div className="table-responsive" style={{ maxHeight: "620px", overflowY: "auto" }}>
                    <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#141417" }}>
                        <thead>
                            <tr className="small tracking-wider" style={{ borderBottom: "2px solid #27272a", color: "#a1a1aa" }}>
                                <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Token Record Name</th>
                                <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Serial Number</th>
                                <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Encryption Key</th>
                                <th className="bg-transparent py-3 text-uppercase text-end fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTokens ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                        <div className="spinner-border spinner-border-sm text-cyan me-2" role="status"></div>
                                        Loading token registration records...
                                    </td>
                                </tr>
                            ) : tokens.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                        No physical token registration records for this account.
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
                                        <td className="bg-transparent py-3" style={{ fontSize: "13px", color: "#a1a1aa" }}>
                                            {keyLabel(t)}
                                        </td>
                                        <td className="bg-transparent py-3 text-end">
                                            <div className="d-flex gap-2 justify-content-end">
                                                <button
                                                    className="btn btn-sm fw-medium text-white px-3"
                                                    style={{ fontSize: "13px", backgroundColor: "#3f3f46", border: "none", borderRadius: "4px" }}
                                                    onClick={() => triggerStatusConfirm(t)}
                                                >
                                                    {t.status === "active" ? "Deactivate" : "Activate"}
                                                </button>
                                                <button className="btn btn-outline-danger btn-sm" onClick={() => setPendingDeleteToken(t)}>Remove</button>
                                            </div>
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
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setShowStatusConfirm(false)
                            setPendingActionToken(null)
                        }
                    }}
                >
                    <div
                        className="premium-modal-surface"
                        onClick={(event) => event.stopPropagation()}
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

            {pendingDeleteToken && (
                <dialog open className="premium-modal-backdrop" onClick={() => setPendingDeleteToken(null)}>
                    <div className="premium-modal-surface" onClick={event => event.stopPropagation()} role="presentation">
                        <div className="modal-accent-strip-alert"></div>
                        <h4 className="modal-title-main">Remove Physical Token Registration?</h4>
                        <p className="modal-description-text">
                            Remove <strong>{pendingDeleteToken.tokenName}</strong> and its key association from this account? This does not delete the encryption key.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => setPendingDeleteToken(null)}>Cancel</button>
                            <button className="btn-modal-destructive" onClick={() => removeToken(pendingDeleteToken)}>Remove</button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerManagePTokens
