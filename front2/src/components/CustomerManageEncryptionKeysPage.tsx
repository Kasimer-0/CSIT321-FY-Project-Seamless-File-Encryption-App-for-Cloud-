import { useEffect, useState } from "react"
import type { EncryptionKeyRecord, UserAccount } from "../Type"

type Props = { user: UserAccount }

function CustomerManageEncryptionKeysPage({ user }: Props) {
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [keyName, setKeyName] = useState("")
    const [algorithm, setAlgorithm] = useState("AES-256-GCM")
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 5000)
    }

    const fetchKeys = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ ownerID: String(user.userID) })
            if (search.trim()) params.append("search", search.trim())
            const res = await fetch(`http://localhost:8080/encryption-keys?${params.toString()}`, { credentials: "include" })
            if (res.ok) setKeys(await res.json())
        } catch {
            triggerBanner("PIPELINE_ERROR: Connection failed", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchKeys, 300)
        return () => clearTimeout(timer)
    }, [search])

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
            triggerBanner("ACTION_COMPLETED", "success")
        } catch {
            triggerBanner("ACTION_FAILED", "error")
        }
    }

    return (
        <div className="font-monospace">
            <div className="border-bottom pb-3 mb-4">
                <h5 className="workspace-section-heading">ENCRYPTION_KEY_VAULT</h5>
                <p className="text-muted fs-8">MANAGE_CRYPTOGRAPHIC_ASSETS_AND_KEY_LIFECYCLE</p>
            </div>

            {localBanner && (
                <div className={`mb-3 py-2 px-3 rounded fs-8 ${localBanner.type === "success" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                    {localBanner.msg}
                </div>
            )}

            <div className="bg-workspace-card p-3 border rounded mb-4">
                <div className="row g-3">
                    <div className="col-md-5">
                        <label className="fs-8 text-muted d-block mb-1">KEY_IDENTIFIER</label>
                        <input className="form-control fs-7" value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. PROJECT_OMEGA_KEY" />
                    </div>
                    <div className="col-md-4">
                        <label className="fs-8 text-muted d-block mb-1">CIPHER_ALGORITHM</label>
                        <select className="form-select fs-7" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
                            <option>AES-256-GCM</option>
                            <option>AES-128</option>
                            <option>ChaCha20</option>
                        </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-primary w-100 fs-7" onClick={() => handleKeyAction("POST", "", { ownerID: user.userID, keyName, algorithm })}>GENERATE_KEY</button>
                    </div>
                </div>
            </div>

            <input className="form-control mb-4 fs-7" placeholder="SEARCH_VAULT..." value={search} onChange={e => setSearch(e.target.value)} />

            {loading ? <p className="text-muted fs-8">SYNCHRONIZING_VAULT...</p> : (
                <div className="d-flex flex-column gap-3">
                    {keys.map(key => (
                        <div key={key.keyID} className="p-3 border rounded d-flex justify-content-between align-items-center">
                            <div>
                                <div className="fw-semibold fs-7 text-truncate">{key.keyName}</div>
                                <div className="fs-8 text-muted">
                                    {key.algorithm} | FINGERPRINT: {key.fingerprint}
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-outline-secondary btn-sm fs-8" onClick={() => handleKeyAction("PATCH", `${key.keyID}?ownerID=${user.userID}`, { status: key.status === "active" ? "inactive" : "active" })}>
                                    {key.status === "active" ? "DEACTIVATE" : "ACTIVATE"}
                                </button>
                                <button className="btn btn-outline-danger btn-sm fs-8" onClick={() => handleKeyAction("DELETE", `${key.keyID}?ownerID=${user.userID}`)}>
                                    DELETE
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CustomerManageEncryptionKeysPage