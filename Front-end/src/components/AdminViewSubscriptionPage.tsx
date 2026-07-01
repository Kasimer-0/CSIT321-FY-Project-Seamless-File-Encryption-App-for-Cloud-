import { useState } from "react"
import type { SubscriptionDTO, Plan } from "../Type"

type AdminViewSubscriptionProps = {
    subscription: SubscriptionDTO
    availablePlans: Plan[]
    onBack: () => void
    onCancel: (subscriptionID: number) => void
    onEdit: (updated: SubscriptionDTO) => void
}

function AdminViewSubscription({ subscription, availablePlans, onBack, onCancel, onEdit }: AdminViewSubscriptionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [showSaveConfirm, setShowSaveConfirm] = useState(false)
    const [showAbortEditConfirm, setShowAbortEditConfirm] = useState(false)
    const [bannerMessage, setBannerMessage] = useState("")

    const triggerBanner = (msg: string) => {
        setBannerMessage(msg)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const [form, setForm] = useState({
        planID: subscription.plan.planID,
        subcriptionStatus: subscription.subcriptionStatus,
        subcriptionStartDate: new Date(subscription.subcriptionStartDate).toISOString().split("T")[0],
        subscriptionEndDate: new Date(subscription.subscriptionEndDate).toISOString().split("T")[0],
    })

    const handleInitialSaveCheck = () => {
        if (!form.planID || !form.subcriptionStatus || !form.subcriptionStartDate || !form.subscriptionEndDate) {
            triggerBanner("All fields are required.")
            return
        }
        setShowSaveConfirm(true)
    }

    const handleCommitSave = () => {
        const selectedPlan = availablePlans.find(p => p.planID === parseInt(form.planID.toString()))
        if (!selectedPlan) {
            triggerBanner("Selected plan not found.")
            setShowSaveConfirm(false)
            return
        }

        const updated: SubscriptionDTO = {
            ...subscription,
            plan: selectedPlan,
            subcriptionStatus: form.subcriptionStatus,
            subcriptionStartDate: new Date(form.subcriptionStartDate),
            subscriptionEndDate: new Date(form.subscriptionEndDate),
        }

        onEdit(updated)
        setIsEditing(false)
        setShowSaveConfirm(false)
    }

    if (isEditing) {
        return (
            <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {/* Header Context Actions */}
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: "1px solid #27272a" }}>
                    <button 
                        className="btn text-white px-3 py-1.5 d-flex align-items-center gap-2 border-0" 
                        style={{ backgroundColor: "#06b6d4", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                        onClick={() => setShowAbortEditConfirm(true)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cancel Update
                    </button>
                    <span className="font-monospace text-white fw-medium" style={{ fontSize: "13px", letterSpacing: "0.05em" }}>EDIT_SUBSCRIPTION</span>
                </div>

                {bannerMessage && (
                    <div className="mb-4 p-3 rounded d-flex align-items-center gap-2" style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                        <span className="rounded-circle d-inline-block" style={{ width: "6px", height: "6px", backgroundColor: "#f43f5e" }}></span>
                        <span style={{ fontSize: "13px", color: "#f43f5e", fontWeight: 600 }}>{bannerMessage}</span>
                    </div>
                )}

                <div className="mb-4">
                    <h4 className="fw-semibold text-white m-0 mb-1" style={{ fontSize: "18px" }}>Modify Subscription Settings</h4>
                    <p className="m-0" style={{ fontSize: "13px", color: "#e4e4e7" }}>Update the parameters or plan allocation constraints down below.</p>
                </div>

                <div className="d-flex flex-column gap-3 mb-4">
                    <div>
                        <label className="fw-semibold mb-1.5" style={{ fontSize: "13px", color: "#e4e4e7" }}>Subscription Plan Tier</label>
                        <select
                            className="form-select text-white border"
                            style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", boxShadow: "none" }}
                            value={form.planID}
                            onChange={(e) => setForm({ ...form, planID: parseInt(e.target.value) })}
                        >
                            {availablePlans.filter(p => p.planStatus === "active").map(plan => (
                                <option key={plan.planID} value={plan.planID} style={{ backgroundColor: "#18181b" }}>
                                    {plan.planTitle} — ${plan.planPrice.toFixed(2)}/mo
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="fw-semibold mb-1.5" style={{ fontSize: "13px", color: "#e4e4e7" }}>Subscription Status</label>
                        <select
                            className="form-select text-white border"
                            style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", boxShadow: "none" }}
                            value={form.subcriptionStatus}
                            onChange={(e) => setForm({ ...form, subcriptionStatus: e.target.value })}
                        >
                            <option value="active" style={{ backgroundColor: "#18181b" }}>ACTIVE</option>
                            <option value="cancelled" style={{ backgroundColor: "#18181b" }}>CANCELLED</option>
                            <option value="expired" style={{ backgroundColor: "#18181b" }}>EXPIRED</option>
                        </select>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-sm-6">
                            <label className="fw-semibold mb-1.5" style={{ fontSize: "13px", color: "#e4e4e7" }}>Start Date</label>
                            <input
                                className="form-control text-white border"
                                style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", boxShadow: "none" }}
                                type="date"
                                value={form.subcriptionStartDate}
                                onChange={(e) => setForm({ ...form, subcriptionStartDate: e.target.value })}
                            />
                        </div>
                        <div className="col-12 col-sm-6">
                            <label className="fw-semibold mb-1.5" style={{ fontSize: "13px", color: "#e4e4e7" }}>End Date</label>
                            <input
                                className="form-control text-white border"
                                style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", boxShadow: "none" }}
                                type="date"
                                value={form.subscriptionEndDate}
                                onChange={(e) => setForm({ ...form, subscriptionEndDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="text-end border-top pt-3" style={{ borderColor: "#27272a" }}>
                    <button 
                        className="btn text-white px-4 py-2" 
                        style={{ backgroundColor: "#10b981", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                        onClick={handleInitialSaveCheck}
                    >
                        Save Subscription Metrics
                    </button>
                </div>

                {/* Save Confirmation Dialog Modal */}
                {showSaveConfirm && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 1000 }}>
                        <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", width: "420px", maxWidth: "90%" }}>
                            <div className="d-flex align-items-center mb-3 text-success gap-2 fw-semibold" style={{ fontSize: "15px" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                Confirm Save Changes
                            </div>
                            <p className="mb-4" style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5" }}>
                                Are you sure you want to commit these modifications to the user subscription log?
                            </p>
                            <div className="d-flex gap-2 justify-content-end border-top pt-3" style={{ borderColor: "#27272a" }}>
                                <button className="btn border text-white px-3 py-1.5" style={{ backgroundColor: "transparent", borderColor: "#27272a", fontSize: "13px" }} onClick={() => setShowSaveConfirm(false)}>
                                    Cancel
                                </button>
                                <button className="btn text-white px-3 py-1.5 border-0" style={{ backgroundColor: "#10b981", fontSize: "13px", fontWeight: 600 }} onClick={handleCommitSave}>
                                    Confirm Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Abort Editing Confirmation Dialog Modal */}
                {showAbortEditConfirm && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 1000 }}>
                        <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", width: "420px", maxWidth: "90%" }}>
                            <div className="d-flex align-items-center mb-3 text-warning gap-2 fw-semibold" style={{ fontSize: "15px" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Cancel Update Confirmation
                            </div>
                            <p className="mb-4" style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5" }}>
                                Would you like to continue editing this transaction metadata, or discard your updates completely?
                            </p>
                            <div className="d-flex gap-2 justify-content-end border-top pt-3" style={{ borderColor: "#27272a" }}>
                                <button className="btn border text-white px-3 py-1.5" style={{ backgroundColor: "transparent", borderColor: "#27272a", fontSize: "13px" }} onClick={() => setShowAbortEditConfirm(false)}>
                                    Continue Editing
                                </button>
                                <button className="btn text-white px-3 py-1.5 border-0" style={{ backgroundColor: "#f43f5e", fontSize: "13px", fontWeight: 600 }} onClick={() => { setIsEditing(false); setShowAbortEditConfirm(false); }}>
                                    Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            {/* Read-Only View Top Bar Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: "1px solid #27272a" }}>
                <button 
                    className="btn text-white px-3 py-1.5 d-flex align-items-center gap-2 border-0" 
                    style={{ backgroundColor: "#06b6d4", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                    onClick={onBack}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to Directory
                </button>
                
                <span className="badge px-2.5 py-1 fw-semibold text-uppercase" style={{
                    fontSize: "11px",
                    borderRadius: "4px",
                    letterSpacing: "0.02em",
                    backgroundColor: subscription.subcriptionStatus === "active" ? "rgba(16, 185, 129, 0.15)" : subscription.subcriptionStatus === "cancelled" ? "rgba(244, 63, 94, 0.15)" : "rgba(113, 113, 122, 0.15)",
                    color: subscription.subcriptionStatus === "active" ? "#10b981" : subscription.subcriptionStatus === "cancelled" ? "#f43f5e" : "#e4e4e7"
                }}>
                    {subscription.subcriptionStatus}
                </span>
            </div>

            <div className="mb-4">
                <div className="text-white fw-medium font-monospace mb-1" style={{ fontSize: "13px", letterSpacing: "0.05em" }}>SUBSCRIPTION ID REFERENCE</div>
                <h3 className="fw-semibold text-white m-0 font-monospace" style={{ fontSize: "22px", color: "#06b6d4" }}>#{subscription.subscriptionID}</h3>
            </div>

            {/* Profile Overview Mapping Grids */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="p-3 rounded border h-100" style={{ backgroundColor: "#18181b", borderColor: "#27272a" }}>
                        <div className="text-white fw-semibold font-monospace mb-2 text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.02em" }}>Subscriber Identity</div>
                        <div className="fw-semibold text-white mb-1" style={{ fontSize: "14px" }}>{subscription.subscriber.username}</div>
                        <div className="text-white text-truncate" style={{ fontSize: "13px", opacity: 0.85 }}>{subscription.subscriber.email}</div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="p-3 rounded border h-100" style={{ backgroundColor: "#18181b", borderColor: "#27272a" }}>
                        <div className="text-white fw-semibold font-monospace mb-2 text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.02em" }}>Plan Package Matrix</div>
                        <div className="fw-bold mb-1" style={{ fontSize: "14px", color: "#06b6d4" }}>{subscription.plan.planTitle}</div>
                        <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#10b981" }}>${subscription.plan.planPrice.toFixed(2)} / month</div>
                        <div className="text-white font-monospace" style={{ fontSize: "12px", opacity: 0.8 }}>CIPHER: {subscription.plan.encMethod.toUpperCase()}</div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="p-3 rounded border h-100" style={{ backgroundColor: "#18181b", borderColor: "#27272a" }}>
                        <div className="text-white fw-semibold font-monospace mb-2 text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.02em" }}>Lifespan Parameters</div>
                        <div className="mb-1.5" style={{ fontSize: "13px" }}>
                            <span className="text-white fw-medium font-monospace" style={{ fontSize: "11px", opacity: 0.8 }}>START:</span> <span className="text-white font-monospace fw-semibold">{new Date(subscription.subcriptionStartDate).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: "13px" }}>
                            <span className="text-white fw-medium font-monospace" style={{ fontSize: "11px", opacity: 0.8 }}>EXPIRY:</span> <span className="text-white font-monospace fw-semibold">{new Date(subscription.subscriptionEndDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Form Actions Control Area */}
            {subscription.subcriptionStatus !== "cancelled" && (
                <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-4" style={{ borderColor: "#27272a" }}>
                    <button 
                        className="btn border text-white px-3 py-2" 
                        style={{ backgroundColor: "transparent", borderColor: "#27272a", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                        onClick={() => setIsEditing(true)}
                    >
                        Edit Parameters
                    </button>
                    <button 
                        className="btn border text-white px-3 py-2 border-0" 
                        style={{ backgroundColor: "#e11d48", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                        onClick={() => setShowCancelConfirm(true)}
                    >
                        Cancel Subscription
                    </button>
                </div>
            )}

            {/* Cancel Subscription Layout Dialog Backdrop System Modal */}
            {showCancelConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 999 }}
                >
                    <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", width: "440px", maxWidth: "90%" }}>
                        <div className="d-flex align-items-center mb-3 text-danger gap-2 fw-semibold" style={{ fontSize: "15px" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                                <line x1="12" y1="9" x2="12" y2="13"></line><circle cx="12" cy="17" r="0.01"></circle>
                            </svg>
                            Confirm Termination
                        </div>

                        <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5" }} className="mb-4">
                            Are you sure you want to cancel the subscription loop for user <span className="text-white fw-bold">{subscription.subscriber.username}</span>? This action is immediate and will stop automated token allocations.
                        </p>
                        
                        <div className="d-flex gap-2 justify-content-end border-top pt-3" style={{ borderColor: "#27272a" }}>
                            <button
                                className="btn border text-white px-3 py-1.5"
                                style={{ backgroundColor: "transparent", borderColor: "#27272a", fontSize: "13px" }}
                                onClick={() => setShowCancelConfirm(false)}
                            >
                                Close
                            </button>
                            <button
                                className="btn text-white px-3 py-1.5 border-0"
                                style={{ backgroundColor: "#f43f5e", fontSize: "13px", fontWeight: 600, borderRadius: "4px" }}
                                onClick={() => { onCancel(subscription.subscriptionID); setShowCancelConfirm(false) }}
                            >
                                Forcibly Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewSubscription