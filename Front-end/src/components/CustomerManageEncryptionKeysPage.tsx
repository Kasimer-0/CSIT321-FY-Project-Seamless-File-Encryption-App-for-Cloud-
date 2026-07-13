import { apiFetch } from "../lib/api"
import { useEffect, useState } from "react"
import type { EncryptionKeyRecord, SubscriptionDTO, TrustedKeyPackage, TrustedKeyPackageImportResponse, UserAccount } from "../Type"
import toast from "react-hot-toast"

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
    const [algorithm, setAlgorithm] = useState("AES-128")
    const [keyPassword, setKeyPassword] = useState("")
    const [importPackageText, setImportPackageText] = useState("")
    const [trustedImporting, setTrustedImporting] = useState(false)
    const [trustedExportingKeyID, setTrustedExportingKeyID] = useState<number | null>(null)
    const [editingKeyID, setEditingKeyID] = useState<number | null>(null)
    const [renameValue, setRenameValue] = useState("")
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

        apiFetch("http://localhost:8080/me/subscription", { credentials: "include" })
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
            const response = await apiFetch("http://localhost:8080/encryption-keys", { credentials: "include" })
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
            const response = await apiFetch("http://localhost:8080/encryption-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    keyName: keyName.trim() || "New Encryption Key",
                    algorithm,
                    keyPassword
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

    const retireKey = async (key: EncryptionKeyRecord) => {
        if (!window.confirm("This key will be retired. It cannot encrypt new files, but remains available to decrypt existing files.")) {
            return
        }
        try {
            const response = await apiFetch(`http://localhost:8080/encryption-keys/${key.keyID}`, {
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
        }
    }

    const downloadJson = (fileName: string, payload: TrustedKeyPackage) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const exportTrustedPackage = async (key: EncryptionKeyRecord) => {
        try {
            setTrustedExportingKeyID(key.keyID)
            const response = await apiFetch("http://localhost:8080/trusted-devices/export-key-package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ keyID: key.keyID })
            })
            if (!response.ok) {
                toast.error("Failed to export trusted-device package")
                return
            }
            const keyPackage: TrustedKeyPackage = await response.json()
            downloadJson(`stealthsync-trusted-key-${key.keyID}.json`, keyPackage)
            toast.success("Trusted-device package exported")
        } catch {
            toast.error("Server connection failed")
        } finally {
            setTrustedExportingKeyID(null)
        }
    }

    const importTrustedPackage = async () => {
        if (!importPackageText.trim()) {
            toast.error("Paste a trusted-device package first")
            return
        }

        let keyPackage: TrustedKeyPackage
        try {
            keyPackage = JSON.parse(importPackageText)
        } catch {
            toast.error("Trusted-device package must be valid JSON")
            return
        }

        try {
            setTrustedImporting(true)
            const response = await apiFetch("http://localhost:8080/trusted-devices/import-key-package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ package: keyPackage })
            })
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to import trusted-device package")
                return
            }
            const result: TrustedKeyPackageImportResponse = await response.json()
            setImportPackageText("")
            await fetchKeys()
            toast.success(result.status === "existing" ? "Trusted key already exists" : "Trusted key imported")
        } catch {
            toast.error("Server connection failed")
        } finally {
            setTrustedImporting(false)
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
                        <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
                            <option>AES-128</option>
                            <option value="AES-256-GCM" disabled={!canUseAes256}>
                                AES-256-GCM{canUseAes256 ? "" : " (Premium only)"}
                            </option>
                        </select>
                        {!canUseAes256 && (
                            <small className="text-muted d-block mt-1">
                                Free tier creates AES-128 keys. AES-256-GCM requires an active premium subscription.
                            </small>
                        )}
                    </div>
                    <div className="col-12 col-md-3">
                        <label className="form-label mb-1" style={{ fontSize: 12 }}>Key Password</label>
                        <input className="form-control" type="password" value={keyPassword} onChange={e => setKeyPassword(e.target.value)} placeholder="Master password" />
                    </div>
                    <div className="col-12 col-md-2">
                        <button className="btn btn-primary w-100" onClick={createKey}>Create Key</button>
                    </div>
                </div>
            </div>

            <div className="card p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div>
                        <h6 className="mb-1">Trusted Device Package</h6>
                        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                            Export non-secret key metadata for another trusted device, then unlock files there with the same key password.
                        </p>
                    </div>
                    <span className="badge bg-info text-dark align-self-start">No password or raw key exported</span>
                </div>
                <div className="mt-3">
                    <label className="form-label mb-1" style={{ fontSize: 12 }}>Import trusted-device package JSON</label>
                    <textarea
                        className="form-control"
                        rows={4}
                        value={importPackageText}
                        onChange={e => setImportPackageText(e.target.value)}
                        placeholder='Paste exported JSON, e.g. {"version":"trusted-key-package-v1",...}'
                    />
                    <div className="d-flex justify-content-between align-items-center gap-2 mt-2 flex-wrap">
                        <small className="text-muted">
                            After import, use the same key password on this device/profile to decrypt matching cloud files.
                        </small>
                        <button className="btn btn-outline-primary btn-sm" onClick={importTrustedPackage} disabled={trustedImporting || !importPackageText.trim()}>
                            {trustedImporting ? "Importing..." : "Import Package"}
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
                                {key.status !== "retired" && (
                                    <button className="btn btn-outline-primary btn-sm" onClick={() => updateKey(key, { status: key.status === "active" ? "inactive" : "active" })}>
                                        {key.status === "active" ? "Deactivate" : "Activate"}
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
                                <button className="btn btn-outline-info btn-sm" onClick={() => exportTrustedPackage(key)} disabled={trustedExportingKeyID === key.keyID}>
                                    {trustedExportingKeyID === key.keyID ? "Exporting..." : "Export Trusted Package"}
                                </button>
                                {key.status !== "retired" && (
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => retireKey(key)}>
                                        Retire
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}

export default CustomerManageEncryptionKeysPage
