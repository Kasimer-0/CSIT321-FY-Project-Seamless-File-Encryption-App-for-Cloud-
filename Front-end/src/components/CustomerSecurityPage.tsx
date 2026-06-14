import { useEffect, useState } from "react"
import type { PhysicalTokenRecord, UserAccount } from "../Type"
import toast from "react-hot-toast"

/**
 * Account security user-story page.
 * It keeps password reset, recovery phrase generation, factory reset, and premium physical-token
 * management together because all four operations change account security state.
 */
type Props = {
    user: UserAccount
    onUserUpdate: (updatedUser: UserAccount) => void
}

function CustomerSecurityPage({ user, onUserUpdate }: Props) {
    const [newPassword, setNewPassword] = useState("")
    const [recoveryPhrase, setRecoveryPhrase] = useState("")
    const [tokens, setTokens] = useState<PhysicalTokenRecord[]>([])
    const [tokenName, setTokenName] = useState("")
    const [serialNumber, setSerialNumber] = useState("")
    const [loadingTokens, setLoadingTokens] = useState(false)

    const premium = user.isSubscribed

    const fetchTokens = async () => {
        if (!premium) {
            setTokens([])
            return
        }
        try {
            setLoadingTokens(true)
            const response = await fetch(`http://localhost:8080/physical-tokens?ownerID=${user.userID}`, { credentials: "include" })
            if (!response.ok) {
                toast.error("Failed to load physical tokens")
                return
            }
            setTokens(await response.json())
        } catch {
            toast.error("Server connection failed")
        } finally {
            setLoadingTokens(false)
        }
    }

    useEffect(() => {
        fetchTokens()
    }, [user.userID, premium])

    const resetPassword = async () => {
        try {
            const response = await fetch("http://localhost:8080/account/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userID: user.userID, newPassword })
            })
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                toast.error(data?.message ?? "Failed to reset password")
                return
            }
            setNewPassword("")
            toast.success("Password reset successfully")
        } catch {
            toast.error("Server connection failed")
        }
    }

    // Factory reset intentionally clears dependent security/cloud records; refresh the root user afterwards.
    const factoryReset = async () => {
        if (!window.confirm("Factory reset will clear linked cloud accounts, encryption keys, tokens, and subscription state. Continue?")) return
        try {
            const response = await fetch("http://localhost:8080/account/factory-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userID: user.userID })
            })
            if (!response.ok) {
                toast.error("Failed to factory reset account")
                return
            }
            const updatedUser: UserAccount = await response.json()
            onUserUpdate(updatedUser)
            toast.success("Factory reset completed")
        } catch {
            toast.error("Server connection failed")
        }
    }

    // The phrase is displayed only from the generation response so users can record it immediately.
    const generateRecoveryPhrase = async () => {
        try {
            const response = await fetch("http://localhost:8080/account/recovery-phrase/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userID: user.userID })
            })
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                toast.error(data?.message ?? "Failed to generate recovery phrase")
                return
            }
            const data = await response.json()
            setRecoveryPhrase(data.recoveryPhrase)
            toast.success("Recovery phrase generated")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const registerToken = async () => {
        try {
            const response = await fetch("http://localhost:8080/physical-tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ownerID: user.userID,
                    tokenName: tokenName.trim() || "Security Token",
                    serialNumber: serialNumber.trim() || undefined
                })
            })
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                toast.error(data?.message ?? "Failed to register token")
                return
            }
            setTokenName("")
            setSerialNumber("")
            await fetchTokens()
            toast.success("Physical token registered")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const setTokenStatus = async (token: PhysicalTokenRecord, active: boolean) => {
        try {
            const action = active ? "activate" : "deactivate"
            const response = await fetch(`http://localhost:8080/physical-tokens/${token.tokenID}/${action}?ownerID=${user.userID}`, {
                method: "PATCH",
                credentials: "include"
            })
            if (!response.ok) {
                toast.error("Failed to update token")
                return
            }
            await fetchTokens()
            toast.success(active ? "Token activated" : "Token deactivated")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const removeToken = async (token: PhysicalTokenRecord) => {
        try {
            const response = await fetch(`http://localhost:8080/physical-tokens/${token.tokenID}?ownerID=${user.userID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) {
                toast.error("Failed to remove token")
                return
            }
            await fetchTokens()
            toast.success("Token removed")
        } catch {
            toast.error("Server connection failed")
        }
    }

    return (
        <div className="d-flex flex-column gap-3">
            <div className="card p-4">
                <h5 className="mb-1">Account Security</h5>
                <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                    Reset credentials or factory reset your account data.
                </p>
                <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-8">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>New Password</label>
                        <input className="form-control" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <div className="col-12 col-md-4">
                        <button className="btn btn-primary w-100" onClick={resetPassword} disabled={newPassword.length < 8}>
                            Reset Password
                        </button>
                    </div>
                </div>
                <hr />
                <button className="btn btn-outline-danger" onClick={factoryReset}>
                    Factory Reset Account
                </button>
            </div>

            <div className="card p-4">
                <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <h6 className="mb-1">Premium Recovery Phrase</h6>
                        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                            Generate a one-time recovery phrase for account recovery login.
                        </p>
                    </div>
                    <button className="btn btn-outline-primary btn-sm" onClick={generateRecoveryPhrase} disabled={!premium}>
                        Generate
                    </button>
                </div>
                {!premium && <div className="alert alert-warning py-2 mt-3 mb-0">Premium subscription required.</div>}
                {recoveryPhrase && (
                    <div className="alert alert-info py-2 mt-3 mb-0">
                        Save this phrase now: <strong>{recoveryPhrase}</strong>
                    </div>
                )}
            </div>

            <div className="card p-4">
                <h6 className="mb-1">Physical Tokens</h6>
                <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                    Register and control premium multi-factor hardware tokens.
                </p>
                <div className="row g-2 align-items-end mb-3">
                    <div className="col-12 col-md-4">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Token Name</label>
                        <input className="form-control" value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="YubiKey" disabled={!premium} />
                    </div>
                    <div className="col-12 col-md-5">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Serial Number</label>
                        <input className="form-control" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Optional serial" disabled={!premium} />
                    </div>
                    <div className="col-12 col-md-3">
                        <button className="btn btn-primary w-100" onClick={registerToken} disabled={!premium}>
                            Register Token
                        </button>
                    </div>
                </div>
                {loadingTokens ? (
                    <p className="text-muted">Loading tokens...</p>
                ) : tokens.length === 0 ? (
                    <p className="text-muted mb-0">No physical tokens registered.</p>
                ) : (
                    <ul className="list-group">
                        {tokens.map(token => (
                            <li key={token.tokenID} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                                <div>
                                    <div className="fw-semibold">{token.tokenName}</div>
                                    <small className="text-muted">{token.serialNumber} | Registered {new Date(token.registeredAt).toLocaleDateString()}</small>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className={`badge align-self-center ${token.status === "active" ? "bg-success" : "bg-secondary"}`}>{token.status}</span>
                                    <button className="btn btn-outline-primary btn-sm" onClick={() => setTokenStatus(token, token.status !== "active")}>
                                        {token.status === "active" ? "Deactivate" : "Activate"}
                                    </button>
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeToken(token)}>
                                        Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default CustomerSecurityPage
