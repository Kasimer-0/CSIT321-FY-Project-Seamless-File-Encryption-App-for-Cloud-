import { apiFetch } from "../lib/api"
import { useState, useEffect } from "react"
import type { EncryptionKeyRecord, UserAccount } from "../Type"

declare global {
    interface Window {
        desktopAPI?: {
            scanForPhysicalUSB: () => Promise<{ serialNumber: string; name: string } | null>
        }
    }
}

type Props = {
    user: UserAccount
    onBack: () => void
    onCreateSuccess: () => void
}

function CustomerCreatePToken({ user, onBack, onCreateSuccess }: Props) {
    const [tokenName, setTokenName] = useState("")
    const [serialNumber, setSerialNumber] = useState("")
    const [selectedKeyID, setSelectedKeyID] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const [availableKeys, setAvailableKeys] = useState<EncryptionKeyRecord[]>([])
    const [loadingKeys, setLoadingKeys] = useState(false)
    
    const [isScanning, setIsScanning] = useState(false)
    const [isPluggedIn, setIsPluggedIn] = useState(false)
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 4000)
    }

    useEffect(() => {
        const fetchActiveKeys = async () => {
            try {
                setLoadingKeys(true)
                const res = await apiFetch(`http://localhost:8080/encryption-keys?ownerID=${user.userID}`, {
                    credentials: "include" 
                })
                if (res.ok) {
                    const data: EncryptionKeyRecord[] = await res.json()
                    setAvailableKeys(data.filter(k => k.status === "active"))
                }
            } catch {
                triggerBanner("Failed to scan encryption key database registry.", "error")
            } finally {
                setLoadingKeys(false)
            }
        }
        fetchActiveKeys()
    }, [user.userID])

    // Calls the desktop app wrapper layer to poll OS kernel hardware tables
    const handleDetectHardware = async () => {
        if (!window.desktopAPI) {
            triggerBanner("ENVIRONMENT_ERROR: Desktop native API layer bridge is unavailable.", "error")
            return
        }

        setIsScanning(true)
        setLocalBanner(null)

        try {
            // Invokes native process and blocks/awaits until a device is fetched
            const hardwareDevice = await window.desktopAPI.scanForPhysicalUSB()

            if (hardwareDevice) {
                setSerialNumber(hardwareDevice.serialNumber)
                setTokenName(hardwareDevice.name || `FLASH-DRIVE-${hardwareDevice.serialNumber.slice(-4)}`)
                setIsPluggedIn(true)
                triggerBanner("HARDWARE_ANCHOR_DETECTED: Native OS subsystem verified device serial number.", "success")
            } else {
                triggerBanner("SCAN_TIMEOUT: No new physical USB flash drive detected. Please re-insert drive.", "error")
            }
        } catch (err: any) {
            triggerBanner(`OS_ERROR: ${err.message || "Failed reading drive properties."}`, "error")
        } {
            setIsScanning(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isPluggedIn || !tokenName.trim() || !selectedKeyID) return

        try {
            setIsSubmitting(true)
            const res = await apiFetch(`http://localhost:8080/physical-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ownerID: user.userID,
                    tokenName: tokenName.trim(),
                    serialNumber: serialNumber, // Authentic hardware serial string sent to database backend
                    boundKeyID: selectedKeyID,
                    status: "active"
                })
            })

            if (res.ok) onCreateSuccess()
            else triggerBanner("Pipeline rejected hardware-to-key alignment parameters.", "error")
        } catch {
            triggerBanner("Server validation handshake failed.", "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Provision Security Token</h3>
                    <p className="small mb-0 text-muted">Bind an authentic hardware serial identifier from your local disk drive straight to your master key records.</p>
                </div>
                <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }} onClick={onBack}>
                    Cancel / Go Back
                </button>
            </div>

            {localBanner && (
                <div className="p-3 mb-4 rounded border text-sm" style={{ backgroundColor: localBanner.type === "error" ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)", borderColor: localBanner.type === "error" ? "#f43f5e" : "#10b981", color: localBanner.type === "error" ? "#f43f5e" : "#10b981" }}>
                    {localBanner.msg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-4" style={{ maxWidth: "580px" }}>
                <div className="p-3 rounded border mb-2" style={{ backgroundColor: "#0b0c10", borderColor: isPluggedIn ? "#10b981" : isScanning ? "#06b6d4" : "#3f3f46" }}>
                    <h6 className="fw-semibold mb-1" style={{ fontSize: "14px", color: isPluggedIn ? "#10b981" : "#fff" }}>STAGE 1: DESKTOP PORT CONTROLLER</h6>
                    <p className="text-muted small mb-3">Click below, then plug your physical flash drive into a USB slot.</p>
                    
                    {!isPluggedIn ? (
                        <button
                            type="button"
                            className="btn btn-sm fw-bold text-dark"
                            style={{ backgroundColor: "#06b6d4", border: "none", padding: "10px 16px" }}
                            disabled={isScanning}
                            onClick={handleDetectHardware}
                        >
                            {isScanning ? "AWAITING USB INSERTION..." : "SCAN PORT INTERFACES"}
                        </button>
                    ) : (
                        <div className="d-flex align-items-center justify-content-between font-monospace text-success small fw-semibold">
                            <div>[✓] HARDWARE SNAPPED: {serialNumber}</div>
                            <button type="button" className="btn btn-link btn-sm text-muted text-decoration-none p-0 font-monospace" style={{ fontSize: "11px" }} onClick={() => setIsPluggedIn(false)}>
                                [ Re-Scan Port ]
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ opacity: isPluggedIn ? 1 : 0.3, pointerEvents: isPluggedIn ? "auto" : "none" }}>
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-uppercase tracking-wider mb-2" style={{ color: "#a1a1aa", fontSize: "12px" }}>Assigned Device Label</label>
                        <input type="text" className="form-control text-white font-monospace" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a" }} value={tokenName} onChange={e => setTokenName(e.target.value)} />
                    </div>

                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-uppercase tracking-wider mb-2" style={{ color: "#a1a1aa", fontSize: "12px" }}>Target Master Encryption Key Binding</label>
                        <select className="form-select text-white font-monospace" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a", padding: "12px" }} value={selectedKeyID} onChange={e => setSelectedKeyID(e.target.value)}>
                            <option value="">
                                {loadingKeys ? "LOADING ENCRYPTION KEYS..." : "-- SELECT AN AVAILABLE ENCRYPTION KEY --"}
                            </option>
                            {availableKeys.map(key => (
                                <option key={key.keyID} value={key.keyID}>{key.keyName} — {key.fingerprint || "No Fingerprint"}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="btn border-0 fw-semibold text-white px-4 py-3" style={{ backgroundColor: "#06b6d4", borderRadius: "6px" }} disabled={!isPluggedIn || isSubmitting}>
                        Authorize Cryptographic Link
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CustomerCreatePToken
