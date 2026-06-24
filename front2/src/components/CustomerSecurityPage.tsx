import { useEffect, useState } from "react"
import type { PhysicalTokenRecord, UserAccount } from "../Type"

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
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const premium = user.isSubscribed

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    const fetchTokens = async () => {
        if (!premium) { setTokens([]); return }
        try {
            setLoadingTokens(true)
            const res = await fetch(`http://localhost:8080/physical-tokens?ownerID=${user.userID}`, { credentials: "include" })
            if (res.ok) setTokens(await res.json())
        } catch {
            triggerBanner("PIPELINE_ERROR: Failed to sync tokens", "error")
        } finally {
            setLoadingTokens(false)
        }
    }

    useEffect(() => { fetchTokens() }, [user.userID, premium])

    const handleSecurityAction = async (endpoint: string, method: string = "POST", body?: any, successMsg = "ACTION_COMPLETED") => {
        try {
            const res = await fetch(`http://localhost:8080/account/${endpoint}`, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: body ? JSON.stringify(body) : undefined
            })
            if (!res.ok) throw new Error()
            triggerBanner(successMsg, "success")
            return res
        } catch {
            triggerBanner("PIPELINE_ERROR: Action failed", "error")
        }
    }

    return (
        <div className="font-monospace d-flex flex-column gap-4">
            <div className="border-bottom pb-3">
                <h5 className="workspace-section-heading">SECURITY_AND_ACCESS_CONTROL</h5>
                <p className="text-muted fs-8">MANAGE_AUTHENTICATION_STATE_AND_HARDWARE_TOKENS</p>
            </div>

            {localBanner && (
                <div className={`py-2 px-3 rounded fs-8 ${localBanner.type === "success" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                    {localBanner.msg}
                </div>
            )}

            {/* Credential Management */}
            <div className="bg-workspace-card p-3 border rounded">
                <label className="fs-8 text-muted mb-1">PASSWORD_RESET</label>
                <div className="d-flex gap-2 mb-4">
                    <input className="form-control fs-7" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="NEW_PASSWORD_STRING" />
                    <button className="btn btn-primary fs-7" onClick={async () => { await handleSecurityAction("reset-password", "POST", { userID: user.userID, newPassword }, "PASSWORD_UPDATED"); setNewPassword(""); }}>UPDATE</button>
                </div>
                <button className="btn btn-outline-danger fs-8 w-100" onClick={async () => { const res = await handleSecurityAction("factory-reset", "POST", { userID: user.userID }, "SYSTEM_RESET_COMPLETE"); if (res) onUserUpdate(await res.json()); }}>INITIATE_FACTORY_RESET</button>
            </div>

            {/* Recovery Phrase */}
            <div className="bg-workspace-card p-3 border rounded">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0 fs-7">PREMIUM_RECOVERY_PHRASE</h6>
                    <button className="btn btn-sm btn-outline-secondary fs-9" disabled={!premium} onClick={async () => { const res = await handleSecurityAction("recovery-phrase/generate", "POST", { userID: user.userID }, "PHRASE_GENERATED"); if(res) setRecoveryPhrase((await res.json()).recoveryPhrase); }}>GENERATE</button>
                </div>
                {recoveryPhrase && <div className="p-2 bg-dark text-light rounded fs-8 mt-2">KEY: {recoveryPhrase}</div>}
            </div>

            {/* Physical Tokens */}
            <div className="bg-workspace-card p-3 border rounded">
                <h6 className="fs-7 mb-3">HARDWARE_TOKEN_VAULT</h6>
                {loadingTokens ? <p className="text-muted fs-8">SYNCHRONIZING...</p> : (
                    <div className="d-flex flex-column gap-2">
                        {tokens.map(t => (
                            <div key={t.tokenID} className="d-flex justify-content-between align-items-center border-bottom pb-2">
                                <span className="fs-8">{t.tokenName} ({t.serialNumber})</span>
                                <button className="btn btn-sm btn-outline-secondary fs-9" onClick={async () => { await handleSecurityAction(`../physical-tokens/${t.tokenID}/${t.status === "active" ? "deactivate" : "activate"}?ownerID=${user.userID}`, "PATCH", null, "STATUS_UPDATED"); fetchTokens(); }}>
                                    {t.status === "active" ? "DEACTIVATE" : "ACTIVATE"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CustomerSecurityPage