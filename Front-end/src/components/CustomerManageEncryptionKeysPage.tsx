import { apiFetch } from "../lib/api"
import { useEffect, useState } from "react"
import type { EncryptionKeyRecord } from "../Type"
import toast from "react-hot-toast"

/**
 * Encryption-key management page.
 * It implements the key CRUD user story and scopes every request to the logged-in customer so one
 * account cannot list or modify another account's key metadata.
 */
function CustomerManageEncryptionKeysPage() {
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [keyName, setKeyName] = useState("")
    const [algorithm, setAlgorithm] = useState("AES-256-GCM")

    const fetchKeys = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search.trim()) params.append("search", search.trim())
            const response = await apiFetch(`http://localhost:8080/encryption-keys?${params.toString()}`, { credentials: "include" })
            if (!response.ok) {
                toast.error("Failed to load encryption keys")
                return
            }
            setKeys(await response.json())
        } catch {
            toast.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    // Debounce search to avoid issuing a backend request for every immediate keystroke.
    useEffect(() => {
        const timer = setTimeout(fetchKeys, 300)
        return () => clearTimeout(timer)
    }, [search])

    const createKey = async () => {
        try {
            const response = await apiFetch("http://localhost:8080/encryption-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    keyName: keyName.trim() || "New Encryption Key",
                    algorithm
                })
            })
            if (!response.ok) {
                toast.error("Failed to create encryption key")
                return
            }
            setKeyName("")
            await fetchKeys()
            toast.success("Encryption key created")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const updateKey = async (key: EncryptionKeyRecord, updates: Partial<EncryptionKeyRecord>) => {
        try {
            const response = await apiFetch(`http://localhost:8080/encryption-keys/${key.keyID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updates)
            })
            if (!response.ok) {
                toast.error("Failed to update key")
                return
            }
            await fetchKeys()
            toast.success("Encryption key updated")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const deleteKey = async (key: EncryptionKeyRecord) => {
        try {
            const response = await apiFetch(`http://localhost:8080/encryption-keys/${key.keyID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) {
                toast.error("Failed to delete key")
                return
            }
            await fetchKeys()
            toast.success("Encryption key deleted")
        } catch {
            toast.error("Server connection failed")
        }
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h5 className="mb-1">Encryption Keys</h5>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Create and manage keys used by your encrypted cloud files.
                    </p>
                </div>
                <input className="form-control" style={{ maxWidth: 260 }} placeholder="Search keys..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="card p-3 mb-3">
                <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-5">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Key Name</label>
                        <input className="form-control" value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Project backup key" />
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Algorithm</label>
                        <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
                            <option>AES-256-GCM</option>
                            <option>AES-128</option>
                            <option>ChaCha20</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <button className="btn btn-primary w-100" onClick={createKey}>Create Key</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-muted">Loading keys...</p>
            ) : keys.length === 0 ? (
                <p className="text-muted">No encryption keys found.</p>
            ) : (
                <ul className="list-group">
                    {keys.map(key => (
                        <li key={key.keyID} className="list-group-item">
                            <div className="d-flex justify-content-between gap-3">
                                <div>
                                    <div className="fw-semibold">{key.keyName}</div>
                                    <small className="text-muted">
                                        {key.algorithm} | Fingerprint {key.fingerprint} | Updated {new Date(key.updatedAt).toLocaleDateString()}
                                    </small>
                                </div>
                                <span className={`badge align-self-start ${key.status === "active" ? "bg-success" : "bg-secondary"}`}>
                                    {key.status}
                                </span>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => updateKey(key, { status: key.status === "active" ? "inactive" : "active" })}>
                                    {key.status === "active" ? "Deactivate" : "Activate"}
                                </button>
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => updateKey(key, { keyName: `${key.keyName} Updated` })}>
                                    Update Name
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => deleteKey(key)}>
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}

export default CustomerManageEncryptionKeysPage
