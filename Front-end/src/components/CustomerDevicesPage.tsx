import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import type { UserAccount, UserDevice } from "../Type"
import { apiFetch } from "../lib/api"

type CustomerDevicesPageProps = {
    user: UserAccount
}

/** Shows owner-scoped device registrations while the backend enforces plan limits. */
function CustomerDevicesPage({ user }: CustomerDevicesPageProps) {
    const deviceLimit = user.isSubscribed ? 5 : 1
    const [devices, setDevices] = useState<UserDevice[]>([])
    const [loading, setLoading] = useState(true)
    const [editingID, setEditingID] = useState<number | null>(null)
    const [deviceName, setDeviceName] = useState("")
    const [revokingID, setRevokingID] = useState<number | null>(null)
    const [showRevokeConfirm, setShowRevokeConfirm] = useState<UserDevice | null>(null)

    const loadDevices = async () => {
        try {
            setLoading(true)
            const response = await apiFetch("/devices")
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to load devices")
                return
            }
            setDevices(await response.json())
        } catch {
            toast.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDevices()
    }, [user.userID])

    const saveName = async (device: UserDevice) => {
        if (!deviceName.trim()) {
            toast.error("Device name cannot be empty")
            return
        }
        const response = await apiFetch(`/devices/${device.deviceID}/rename`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceName: deviceName.trim() })
        })
        if (!response.ok) {
            const error = await response.json().catch(() => null)
            toast.error(error?.message ?? "Failed to rename device")
            return
        }
        setEditingID(null)
        await loadDevices()
        toast.success("Device renamed")
    }

    const revoke = async () => {
        if (!showRevokeConfirm) return
        const device = showRevokeConfirm
        try {
            setRevokingID(device.deviceID)
            const response = await apiFetch(`/devices/${device.deviceID}`, {
                method: "DELETE"
            })
            if (!response.ok) {
                const error = await response.json().catch(() => null)
                toast.error(error?.message ?? "Failed to revoke device")
                return
            }
            await loadDevices()
            toast.success("Device revoked")
            setShowRevokeConfirm(null)
        } catch {
            toast.error("Server connection failed")
        } finally {
            setRevokingID(null)
        }
    }

    const activeDeviceCount = devices.filter(device => device.active && !device.revokedAt).length

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h5 className="mb-1">Registered Devices</h5>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Review the browsers authorized to use this account.
                    </p>
                </div>
                <span className={`badge ${user.isSubscribed ? "bg-info text-dark" : "bg-secondary"}`}>
                    {activeDeviceCount}/{deviceLimit} active devices
                </span>
            </div>

            {!user.isSubscribed && (
                <div className="alert alert-info py-2">
                    Upgrade to Premium to use StealthSync on multiple devices.
                </div>
            )}

            {loading ? (
                <p className="text-muted">Loading devices...</p>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {devices.map(device => (
                        <div className="card p-3" key={device.deviceID}>
                            <div className="d-flex justify-content-between align-items-start gap-3">
                                <div className="flex-grow-1">
                                    {editingID === device.deviceID ? (
                                        <input
                                            className="form-control form-control-sm mb-2"
                                            value={deviceName}
                                            onChange={event => setDeviceName(event.target.value)}
                                        />
                                    ) : (
                                        <div className="fw-semibold">
                                            {device.deviceName}
                                        </div>
                                    )}
                                    <small className="text-muted d-block">
                                        {device.platform} | Last seen {new Date(device.lastSeenAt).toLocaleString()}
                                    </small>
                                    <div className="d-flex gap-2 mt-2">
                                        {device.primaryDevice && <span className="badge bg-primary">Primary</span>}
                                        {device.currentDevice && <span className="badge bg-info text-dark">This device</span>}
                                        <span className={`badge ${device.active && !device.revokedAt ? "bg-success" : "bg-secondary"}`}>
                                            {device.revokedAt ? "Revoked" : device.active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    {editingID === device.deviceID ? (
                                        <>
                                            <button className="btn btn-outline-primary btn-sm" onClick={() => saveName(device)}>Save</button>
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingID(null)}>Cancel</button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => { setEditingID(device.deviceID); setDeviceName(device.deviceName) }}
                                        >
                                            Rename
                                        </button>
                                    )}
                                    {user.isSubscribed && !device.currentDevice && !device.primaryDevice && !device.revokedAt && (
                                        <button
                                            className="btn btn-outline-danger btn-sm"
                                            disabled={revokingID === device.deviceID}
                                            onClick={() => setShowRevokeConfirm(device)}
                                        >
                                            {revokingID === device.deviceID ? "Revoking..." : "Revoke"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showRevokeConfirm && (
                <div
                    className="premium-modal-backdrop"
                    role="presentation"
                    onClick={() => revokingID === null && setShowRevokeConfirm(null)}
                    onKeyDown={event => {
                        if (event.key === "Escape" && revokingID === null) setShowRevokeConfirm(null)
                    }}
                >
                    <div
                        className="premium-modal-surface"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="revoke-device-modal-heading"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="modal-accent-strip-alert" />
                        <h4 id="revoke-device-modal-heading" className="modal-title-main">Revoke Device?</h4>
                        <p className="modal-description-text">
                            <strong>{showRevokeConfirm.deviceName}</strong> will lose access immediately and must be
                            authorized again before it can use this account.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button
                                className="btn-modal-dismiss"
                                type="button"
                                disabled={revokingID !== null}
                                onClick={() => setShowRevokeConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-modal-destructive"
                                type="button"
                                disabled={revokingID !== null}
                                onClick={() => void revoke()}
                            >
                                {revokingID !== null ? "Revoking..." : "Revoke Device"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CustomerDevicesPage
