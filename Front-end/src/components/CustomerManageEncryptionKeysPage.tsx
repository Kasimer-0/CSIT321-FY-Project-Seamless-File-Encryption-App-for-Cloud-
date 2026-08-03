import { apiFetch } from "../lib/api"
import { useEffect, useState } from "react"
import type { EncryptionKeyRecord, SubscriptionDTO, UserAccount } from "../Type"
import toast from "react-hot-toast"
import { createClientKeyMetadata, type KeyAlgorithm } from "../crypto/keyDerivation"

type CustomerManageEncryptionKeysPageProps = {
    user: UserAccount
}

/**
 * Encryption-key management page.
 * It implements the key CRUD user story and scopes every request to the logged-in customer so one
 * account cannot list or modify another account's key metadata.
 */
function CustomerManageEncryptionKeysPage({ user }: CustomerManageEncryptionKeysPageProps) {
    const [keys, setKeys] = useState<EncryptionKeyRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [keyName, setKeyName] = useState("")
    const [algorithm, setAlgorithm] = useState<KeyAlgorithm>("AES-128")
    const [keyPassword, setKeyPassword] = useState("")
    const [creating, setCreating] = useState(false)
    const [editingKeyID, setEditingKeyID] = useState<number | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [showRetireConfirm, setShowRetireConfirm] = useState(false)
    const [pendingRetireKey, setPendingRetireKey] = useState<EncryptionKeyRecord | null>(null)
    const [retiringKeyID, setRetiringKeyID] = useState<number | null>(null)
    const embeddedSubscription = typeof user.subscription === "number" ? null : user.subscription
    const [currentSubscription, setCurrentSubscription] = useState<SubscriptionDTO | null>(embeddedSubscription)
    const canUseAes256 = Boolean(
        user.isSubscribed &&
        currentSubscription?.subcriptionStatus === "active" &&
        currentSubscription.plan?.encMethod?.toUpperCase() === "AES-256-GCM"
    )

    useEffect(() => {
        setCurrentSubscription(embeddedSubscription)
    }, [embeddedSubscription])

    useEffect(() => {
        if (!user.isSubscribed) {
            setCurrentSubscription(null)
            return
        }

        if (embeddedSubscription) return

        apiFetch("/me/subscription", { credentials: "include" })
            .then(response => response.ok ? response.json() : null)
            .then((subscription: SubscriptionDTO | null) => setCurrentSubscription(subscription))
            .catch(() => setCurrentSubscription(null))
    }, [embeddedSubscription, user.isSubscribed])

    useEffect(() => {
        if (!canUseAes256 && algorithm === "AES-256-GCM") {
            setAlgorithm("AES-128")
        }
    }, [algorithm, canUseAes256])

    const fetchKeys = async () => {
        try {
            setLoading(true)
            const response = await apiFetch("/encryption-keys", { credentials: "include" })
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

    useEffect(() => {
        fetchKeys()
    }, [user.userID])

    const createKey = async () => {
        if (!keyPassword.trim()) {
            toast.error("Key password is required")
            return
        }

        try {
            setCreating(true)
            // Web Crypto derives the key locally. Only non-secret metadata is sent to the backend.
            const metadata = await createClientKeyMetadata(keyPassword, algorithm)
            const response = await apiFetch("/encryption-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    keyName: keyName.trim() || "New Encryption Key",
                    ...metadata
                })
            })
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to create encryption key")
                return
            }
            setKeyName("")
            setKeyPassword("")
            await fetchKeys()
            toast.success("Encryption key created")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create encryption key")
        } finally {
            setCreating(false)
        }
    }

    const updateKey = async (key: EncryptionKeyRecord, updates: Partial<EncryptionKeyRecord>) => {
        try {
            const response = await apiFetch(`/encryption-keys/${key.keyID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updates)
            })
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to update key")
                return
            }
            await fetchKeys()
            toast.success("Encryption key updated")
        } catch {
            toast.error("Server connection failed")
        }
    }

    const startRename = (key: EncryptionKeyRecord) => {
        setEditingKeyID(key.keyID)
        setRenameValue(key.keyName)
    }

    const saveRename = async (key: EncryptionKeyRecord) => {
        if (!renameValue.trim()) {
            toast.error("Encryption key name cannot be empty")
            return
        }
        await updateKey(key, { keyName: renameValue.trim() })
        setEditingKeyID(null)
        setRenameValue("")
    }

    const requestRetireKey = (key: EncryptionKeyRecord) => {
        setPendingRetireKey(key)
        setShowRetireConfirm(true)
    }

    const retireKey = async () => {
        if (!pendingRetireKey) return
        const key = pendingRetireKey
        try {
            setRetiringKeyID(key.keyID)
            const response = await apiFetch(`/encryption-keys/${key.keyID}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (!response.ok) {
                toast.error("Failed to retire key")
                return
            }
            await fetchKeys()
            toast.success("Encryption key retired")
        } catch {
            toast.error("Server connection failed")
        } finally {
            setRetiringKeyID(null)
            setShowRetireConfirm(false)
            setPendingRetireKey(null)
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
            </div>

            <div className="card p-3 mb-3">
                <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-4">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Key Name</label>
                        <input className="form-control" value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Project backup key" />
                    </div>
                    <div className="col-12 col-md-3">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Algorithm</label>
                        <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value as KeyAlgorithm)}>
                            <option>AES-128</option>
                            <option value="AES-256-GCM" disabled={!canUseAes256}>
                                AES-256-GCM{canUseAes256 ? "" : " (Premium only)"}
                            </option>
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Key Password</label>
                        <input className="form-control" type="password" value={keyPassword} onChange={e => setKeyPassword(e.target.value)} placeholder="Master password" />
                    </div>
                    <div className="col-12 col-md-2">
                        <button className="btn btn-primary w-100" onClick={createKey} disabled={creating}>
                            {creating ? "Deriving..." : "Create Key"}
                        </button>
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
                                    {editingKeyID === key.keyID ? (
                                        <input
                                            className="form-control form-control-sm"
                                            value={renameValue}
                                            onChange={event => setRenameValue(event.target.value)}
                                            aria-label={`New name for ${key.keyName}`}
                                        />
                                    ) : (
                                        <div className="fw-semibold">{key.keyName}</div>
                                    )}
                                    <small className="text-muted">
                                        {key.algorithm} | Fingerprint {key.fingerprint} | Updated {new Date(key.updatedAt).toLocaleDateString()}
                                    </small>
                                </div>
                                <span className={`badge align-self-start ${key.status === "active" ? "bg-success" : "bg-secondary"}`}>
                                    {key.status}
                                </span>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                                {key.status === "inactive" && (
                                    <button className="btn btn-outline-primary btn-sm" onClick={() => updateKey(key, { status: "active" })}>
                                        Activate legacy key
                                    </button>
                                )}
                                {editingKeyID === key.keyID ? (
                                    <>
                                        <button className="btn btn-outline-secondary btn-sm" onClick={() => saveRename(key)}>Save Name</button>
                                        <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEditingKeyID(null); setRenameValue("") }}>Cancel</button>
                                    </>
                                ) : (
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => startRename(key)}>Rename</button>
                                )}
                                {key.status !== "retired" && (
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => requestRetireKey(key)}>
                                        Retire
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showRetireConfirm && pendingRetireKey && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
                    onClick={() => retiringKeyID === null && setShowRetireConfirm(false)}
                >
                    <div className="card p-4" style={{ width: 420 }} onClick={event => event.stopPropagation()}>
                        <h6 className="mb-2">Retire Encryption Key?</h6>
                        <p className="text-muted mb-2" style={{ fontSize: 14 }}>
                            Retire <strong>{pendingRetireKey.keyName}</strong>?
                        </p>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            This key will be retired. It cannot encrypt new files, but remains available to decrypt existing files.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setShowRetireConfirm(false)
                                    setPendingRetireKey(null)
                                }}
                                disabled={retiringKeyID !== null}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={retireKey} disabled={retiringKeyID !== null}>
                                {retiringKeyID !== null ? "Retiring..." : "Yes, Retire"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CustomerManageEncryptionKeysPage
