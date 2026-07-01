import React, { useState } from "react"
import type { UserAccount } from "../Type"

type Props = {
    user: UserAccount
    isPremiumUser: boolean
    onBack: () => void
    onCreateSuccess: () => void
}

function CustomerCreateEncKeyPage({ user, isPremiumUser, onBack, onCreateSuccess }: Props) {
    const [keyName, setKeyName] = useState("")
    const [masterPassword, setMasterPassword] = useState("")
    const [algorithm, setAlgorithm] = useState("AES-128")
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const handleFormSubmitTrigger = (e: React.FormEvent) => {
        e.preventDefault()
        if (!keyName.trim() || !masterPassword.trim()) {
            setErrorMsg("Please fill in all required fields.")
            return
        }
        setErrorMsg(null)
        setShowGenerateConfirm(true)
    }

    const executeGeneration = async () => {
        try {
            setSubmitting(true)
            setShowGenerateConfirm(false)

            const res = await fetch(`http://localhost:8080/encryption-keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ownerID: user.userID,
                    keyName: keyName.trim(),
                    algorithm,
                    password: masterPassword
                })
            })

            if (res.ok) {
                onCreateSuccess()
            } else {
                throw new Error()
            }
        } catch {
            setErrorMsg("Failed to generate encryption key. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="border rounded p-4 text-white position-relative" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Create Encryption Key</h3>
                <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>Generate a new encryption key to start encrypting your data.</p>
            </div>

            {errorMsg && (
                <div className="alert alert-danger border-danger text-center fw-medium py-2 mb-4" style={{ fontSize: "13px", backgroundColor: "rgba(244,63,94,0.1)" }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleFormSubmitTrigger} style={{ maxWidth: "600px" }}>
                <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-white" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                        Encryption Key Name
                    </label>
                    <input 
                        type="text"
                        className="form-control text-white border-secondary p-2 custom-balanced-placeholder" 
                        style={{ backgroundColor: "#0b0c10", fontSize: "14px", borderColor: "#27272a" }}
                        value={keyName} 
                        onChange={e => setKeyName(e.target.value)} 
                        placeholder="e.g., BusinessUserKey"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-white" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                        Master Password
                    </label>
                    <input 
                        type="password"
                        className="form-control text-white border-secondary p-2 custom-balanced-placeholder" 
                        style={{ backgroundColor: "#0b0c10", fontSize: "14px", borderColor: "#27272a" }}
                        value={masterPassword} 
                        onChange={e => setMasterPassword(e.target.value)} 
                        placeholder="Enter a unique master password for this key" 
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-white" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                        Encryption Method
                    </label>
                    <select 
                        className="form-select text-white border-secondary p-2" 
                        style={{ backgroundColor: "#0b0c10", fontSize: "14px", borderColor: "#27272a" }}
                        value={algorithm} 
                        onChange={e => setAlgorithm(e.target.value)}
                    >
                        <option value="AES-128">AES-128 (Base Core)</option>
                        <option value="AES-256-GCM" disabled={!isPremiumUser}>
                            AES-256-GCM {!isPremiumUser ? "(Premium Customers Only)" : ""}
                        </option>
                        <option value="ChaCha20" disabled={!isPremiumUser}>
                            ChaCha20 {!isPremiumUser ? "(Premium Customers Only)" : ""}
                        </option>
                    </select>
                </div>

                <div className="pt-3 border-top d-flex gap-2" style={{ borderColor: "#27272a" }}>
                    <button 
                        type="submit"
                        className="btn border-0 fw-semibold text-white px-4 py-2"
                        style={{ backgroundColor: "#06b6d4", borderRadius: "4px" }}
                        disabled={submitting}
                    >
                        {submitting ? "Processing..." : "Generate Key"}
                    </button>
                    <button 
                        type="button"
                        className="btn btn-secondary text-white px-4 py-2"
                        style={{ backgroundColor: "#27272a", border: "none", borderRadius: "4px" }}
                        disabled={submitting}
                        onClick={() => setShowCancelConfirm(true)}
                    >
                        Cancel
                    </button>
                </div>
            </form>

            {showGenerateConfirm && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => setShowGenerateConfirm(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setShowGenerateConfirm(false);
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert" style={{ backgroundColor: "#06b6d4" }}></div>
                        <h4 className="modal-title-main">Create Encryption Key?</h4>
                        <p className="modal-description-text">
                            Confirming this will create a new encryption key with the selected parameters.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => setShowGenerateConfirm(false)}>
                                Back
                            </button>
                            <button 
                                className="btn border-0 fw-semibold text-white px-3"
                                style={{ backgroundColor: "#06b6d4", borderRadius: "4px", fontSize: "14px" }}
                                onClick={executeGeneration}
                            >
                                Confirm & Generate
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {showCancelConfirm && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => setShowCancelConfirm(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setShowCancelConfirm(false);
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert"></div>
                        <h4 className="modal-title-main">Cancel Key Creation?</h4>
                        <p className="modal-description-text">
                            Are you sure you want to exit? Any data entered will be lost.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => setShowCancelConfirm(false)}>
                                Resume
                            </button>
                            <button 
                                className="btn-modal-destructive" 
                                onClick={() => {
                                    setShowCancelConfirm(false)
                                    onBack()
                                }}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            <style>{`
                .custom-balanced-placeholder::placeholder {
                    color: #52525b !important;
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    )
}

export default CustomerCreateEncKeyPage