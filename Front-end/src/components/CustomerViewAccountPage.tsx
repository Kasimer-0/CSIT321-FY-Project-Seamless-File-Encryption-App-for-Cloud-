import { useEffect, useState } from "react"
import type { UserAccount, Plan, Subscription } from "../Type"

type Props = {
    user: UserAccount
    onUserUpdate: (updatedUser: UserAccount) => void
}

function CustomerViewAccount({ user, onUserUpdate }: Props) {
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
    const [loadingSub, setLoadingSub] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)
    const [showPlans, setShowPlans] = useState(false)

    const [editUsername, setEditUsername] = useState(user.username)
    const [editEmail, setEditEmail] = useState(user.email)
    
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [purchasingPlanID, setPurchasingPlanID] = useState<number | null>(null)

    const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null)
    
    const notify = (msg: string, type: "success" | "error") => {
        setFeedback({ msg, type })
        setTimeout(() => setFeedback(null), 5000)
    }

    const userSubscriptionID = typeof user.subscription === "number" ? user.subscription : user.subscription?.subscriptionID ?? null
    const embeddedSubscription = typeof user.subscription === "number" ? null : user.subscription

    const handleCancelEdit = () => {
        setEditUsername(user.username)
        setEditEmail(user.email)
        setSaveError(null)
        setIsEditing(false)
    }

    const handleSaveEdit = async () => {
        if (!editUsername.trim() || !editEmail.trim()) {
            setSaveError("Username and email metrics cannot be empty.")
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const response = await fetch(`http://localhost:8080/users/${user.userID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ 
                    username: editUsername.trim(), 
                    email: editEmail.trim()
                })
            })
            if (!response.ok) throw new Error()
            
            const updatedUser: UserAccount = {
                ...user,
                username: editUsername.trim(),
                email: editEmail.trim()
            }
            onUserUpdate(updatedUser)
            setIsEditing(false)
            notify("Identity credentials updated successfully", "success")
        } catch { 
            setSaveError("GATEWAY_REJECTION: Data sync modification write pipeline failed.") 
        } finally { 
            setSaving(false) 
        }
    }

    const handleSelectPlanToPurchase = (plan: Plan) => {
        setSelectedPlan(plan)
    }

    const handleConfirmPurchase = async () => {
        if (!selectedPlan) return
        setPurchasingPlanID(selectedPlan.planID)
        try {
            const response = await fetch(`http://localhost:8080/subscriptions/purchase`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    userID: user.userID,
                    planID: selectedPlan.planID
                })
            })
            if (!response.ok) throw new Error()
            
            const updatedUserData = await response.json() as UserAccount
            onUserUpdate(updatedUserData)
            
            if (updatedUserData.subscription && typeof updatedUserData.subscription !== "number") {
                setSubscription(updatedUserData.subscription as any)
            }
            
            notify(`SUCCESS: ${selectedPlan.planTitle} plan configuration deployed.`, "success")
            setSelectedPlan(null)
            setShowPlans(false)
        } catch {
            notify("TRANSACTION_FAILED: Refused parameter assignment across endpoint layers.", "error")
        } finally { 
            setPurchasingPlanID(null) 
        }
    }

    const handleResetPassword = () => {
        notify("Password reset pipeline initialized. Check system routing node.", "success")
    }

    const handleFactoryReset = () => {
        if (window.confirm("CRITICAL WARNING: This action drops all data frames and restores standard defaults. Proceed?")) {
            notify("Identity matrix completely wiped and rolled back to factory profile.", "error")
        }
    }

    useEffect(() => {
        if (!user.isSubscribed) { setSubscription(null); setLoadingSub(false); return }
        if (embeddedSubscription) { setSubscription(embeddedSubscription as unknown as Subscription); setLoadingSub(false); return }
        if (!userSubscriptionID) { setSubscription(null); setLoadingSub(false); return }
        setLoadingSub(true)
        fetch(`http://localhost:8080/subscriptions/${userSubscriptionID}`, { credentials: "include" })
            .then(r => r.json())
            .then(setSubscription)
            .catch(() => setSubscription(null))
            .finally(() => setLoadingSub(false))
    }, [user.isSubscribed, userSubscriptionID, embeddedSubscription])

    useEffect(() => {
        if (!showPlans || availablePlans.length > 0) return
        setLoadingPlans(true)
        fetch("http://localhost:8080/plans", { credentials: "include" })
            .then(r => r.json())
            .then(data => setAvailablePlans(data.filter((p: Plan) => p.planStatus === "active")))
            .catch(() => setAvailablePlans([]))
            .finally(() => setLoadingPlans(false))
    }, [showPlans])

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }} className="h-100 d-flex flex-column">
            {/* Header section */}
            <div className="border-bottom border-secondary pb-3 mb-4">
                <h4 className="text-white fw-bold mb-1" style={{ letterSpacing: "0.5px" }}>
                    Account Profile Settings
                </h4>
                <p style={{ fontSize: "0.95rem", color: "#d4d4d8" }} className="mb-0">
                    Manage your personal identity matrix parameters and cryptographic tier configurations.
                </p>
            </div>

            {/* Local Alert Feedback Banner */}
            {feedback && (
                <div className={`status-banner ${feedback.type === "error" ? "status-error" : "status-success"} mb-3 py-2.5 px-3 rounded fw-medium`} style={{ fontSize: "0.95rem" }}>
                    {feedback.type === "error" ? "⚠️" : "⚡"} {feedback.msg}
                </div>
            )}

            {/* Core Segment Layout */}
            <div className="row g-4 flex-grow-1 align-items-stretch mb-4">
                {/* Column 1: Identity Matrix */}
                <div className="col-12 col-md-6 d-flex">
                    <div className="p-4 border rounded w-100 d-flex flex-column justify-content-between" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
                        <div className="w-100">
                            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-2">
                                <label className="fw-bold text-uppercase d-block mb-0" style={{ fontSize: "16px", letterSpacing: "0.75px", color: "#06b6d4" }}>
                                    USER ACCOUNT
                                </label>
                                {!isEditing && (
                                    <button 
                                        className="btn btn-sm btn-outline-secondary py-1 px-3 fw-medium" 
                                        style={{ fontSize: "13px", borderColor: "#495057", color: "#e4e4e7" }} 
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Credentials
                                    </button>
                                )}
                            </div>

                            <div className="w-100">
                                {isEditing ? (
                                    <div className="d-flex flex-column gap-3">
                                        <div>
                                            <label className="text-white-50 small mb-1" style={{ fontSize: "13px", fontWeight: "bold", color: "#06b6d4" }}>USER NAME</label>
                                            <input 
                                                className="form-control text-white p-2.5" 
                                                style={{ backgroundColor: "#0b0c10", fontSize: "15px", borderColor: "#27272a" }} 
                                                value={editUsername} 
                                                onChange={e => setEditUsername(e.target.value)} 
                                                placeholder="Username handle" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-white-50 small mb-1" style={{ fontSize: "13px", fontWeight: "bold", color: "#06b6d4" }}>EMAIL ADDRESS</label>
                                            <input 
                                                className="form-control text-white p-2.5" 
                                                style={{ backgroundColor: "#0b0c10", fontSize: "15px", borderColor: "#27272a" }} 
                                                value={editEmail} 
                                                onChange={e => setEditEmail(e.target.value)} 
                                                placeholder="Communications Endpoint Link" 
                                            />
                                        </div>
                                        {saveError && <div className="text-danger fw-medium" style={{ fontSize: "13px" }}>{saveError}</div>}
                                        <div className="d-flex gap-2 mt-2">
                                            <button className="btn fw-bold px-4 py-2 text-white" style={{ backgroundColor: "#06b6d4", fontSize: "13px" }} onClick={handleSaveEdit} disabled={saving}>
                                                {saving ? "SAVING..." : "Update Account"}
                                            </button>
                                            <button className="btn btn-outline-secondary px-3 py-2" style={{ fontSize: "13px", color: "#e4e4e7" }} onClick={handleCancelEdit}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: "#d4d4d8", fontSize: "1.1rem" }} className="d-flex flex-column gap-4">
                                        <div className="border-bottom border-dark pb-2">
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>User ID</span>
                                            <span className="text-white fw-medium">{user.userID}</span>
                                        </div>
                                        <div className="border-bottom border-dark pb-2">
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>User Account</span>
                                            <span className="fw-bold text-white">{user.username}</span>
                                        </div>
                                        <div className="border-bottom border-dark pb-2">
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>Email Address</span>
                                            <span className="text-white">{user.email}</span>
                                        </div>
                                        <div>
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>User Role</span>
                                            <span className="text-white text-uppercase fw-semibold" style={{ letterSpacing: "0.5px" }}>{user.role}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isEditing && (
                            <div className="d-flex flex-column gap-2 mt-4 pt-3 border-top border-dark">
                                <button 
                                    className="btn btn-outline-secondary text-white border-secondary fw-semibold py-2 w-100" 
                                    style={{ fontSize: "13px", borderColor: "#3f3f46" }}
                                    onClick={handleResetPassword}
                                >
                                    Reset Password
                                </button>
                                <button 
                                    className="btn btn-danger text-white fw-bold py-2 w-100" 
                                    style={{ fontSize: "13px", backgroundColor: "#dc3545" }}
                                    onClick={handleFactoryReset}
                                >
                                    Factory Reset Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Subscription Core Status */}
                <div className="col-12 col-md-6 d-flex">
                    <div className="p-4 border rounded w-100 d-flex flex-column justify-content-between position-relative overflow-hidden" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
                        
                        <div className="h-100 d-flex flex-column justify-content-between w-100">
                            <div>
                                <div className="border-bottom border-secondary pb-2 mb-4">
                                    <label className="fw-bold text-uppercase d-block mb-0" style={{ fontSize: "16px", letterSpacing: "0.75px", color: "#06b6d4" }}>
                                        SUBSCRIPTION
                                    </label>
                                </div>
                                
                                {loadingSub ? (
                                    <div style={{ color: "#d4d4d8", fontSize: "1.1rem" }}>Fetching target configuration logs...</div>
                                ) : user.isSubscribed ? (
                                    <div className="d-flex flex-column gap-4" style={{ color: "#d4d4d8", fontSize: "1.1rem" }}>
                                        <div className="text-info fw-bold d-flex align-items-center gap-2" style={{ fontSize: "1.25rem" }}>
                                            <span style={{ color: "#06b6d4" }}>✦</span> PREMIUM TIERS ACTIVE
                                        </div>
                                        <div className="border-bottom border-dark pb-2">
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>INSTANCE ID</span>
                                            <span className="text-white">{subscription?.subscriptionID ?? "PENDING_SYNC"}</span>
                                        </div>
                                        <div>
                                            <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px", color: "#06b6d4" }}>PIPELINE STATUS</span>
                                            <span className="text-success fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>
                                                {subscription?.subcriptionStatus ?? "ACTIVE"}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="fw-bold mb-2 text-white" style={{ fontSize: "1.25rem" }}>BASE TIER</div>
                                        <p className="mb-0" style={{ fontSize: "1.05rem", lineHeight: "1.6", color: "#d4d4d8" }}>
                                            Advanced protection suites (Hardware Token Authentication & Secure Recovery Phrases) are currently locked. Upgrade required to bind hardware objects.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="d-flex gap-2 mt-4 pt-3 border-top border-secondary-subtle">
                                <button 
                                    className="btn fw-bold px-4 py-2 text-white w-100" 
                                    style={{ backgroundColor: "#06b6d4", fontSize: "13px" }} 
                                    onClick={() => setShowPlans(true)}
                                >
                                    Change Plan
                                </button>
                            </div>
                        </div>

                        {/* Plan Sheet Drawer Overlay */}
                        {showPlans && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 p-4 d-flex flex-column justify-content-between" style={{ backgroundColor: "#0b0c10", zIndex: 10, borderLeft: "3px solid #06b6d4" }}>
                                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
                                    <label className="fw-bold text-uppercase mb-0" style={{ fontSize: "14px", letterSpacing: "0.75px", color: "#06b6d4" }}>
                                        AVAILABLE SECURITY WRAPPERS
                                    </label>
                                    <button 
                                        className="btn btn-outline-secondary text-white border-0 py-1 px-2" 
                                        style={{ fontSize: "13px" }} 
                                        onClick={() => setShowPlans(false)}
                                    >
                                        ✕ Close
                                    </button>
                                </div>

                                <div className="flex-grow-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(100% - 50px)" }}>
                                    {loadingPlans ? (
                                        <div style={{ color: "#d4d4d8", fontSize: "1rem" }} className="p-2">Polling configuration matrix endpoints...</div>
                                    ) : availablePlans.length === 0 ? (
                                        <div style={{ color: "#d4d4d8", fontSize: "1rem" }} className="p-2">No active cloud tiers resolved.</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            {availablePlans.map(plan => {
                                                // Safely parse subscription state regardless of numeric/object type mismatch errors
                                                const subObj = subscription as Record<string, any> | null
                                                const activePlanID = subObj?.plan?.planID 
                                                    ?? subObj?.planID 
                                                    ?? null

                                                const isCurrentPlan = user.isSubscribed 
                                                    ? (plan.planID === activePlanID)
                                                    : (plan.planPrice === 0)
                                                
                                                return (
                                                    <div key={plan.planID} className="p-3 border rounded" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <div className="fw-bold text-white text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>{plan.planTitle}</div>
                                                            <div className="fw-bold" style={{ color: "#06b6d4", fontSize: "15px" }}>
                                                                ${plan.planPrice}<span className="opacity-50 fw-normal" style={{ fontSize: "11px" }}>/mo</span>
                                                            </div>
                                                        </div>
                                                        <p className="mb-2" style={{ fontSize: "13px", lineHeight: "1.4", color: "#d4d4d8" }}>{plan.planDescription}</p>
                                                        <div className="mb-3" style={{ fontSize: "11px", color: "#a1a1aa" }}>Encryption Method: <span className="text-white fw-medium">{plan.encMethod}</span></div>
                                                        
                                                        {isCurrentPlan ? (
                                                            <button 
                                                                className="w-100 border-0 py-2 fw-bold rounded text-white opacity-50" 
                                                                style={{ backgroundColor: "#27272a", fontSize: "12px", cursor: "not-allowed" }}
                                                                disabled
                                                            >
                                                                Current Plan
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="w-100 border-0 py-2 fw-bold rounded text-white" 
                                                                style={{ backgroundColor: "#06b6d4", fontSize: "12px", cursor: "pointer" }} 
                                                                onClick={() => handleSelectPlanToPurchase(plan)}
                                                            >
                                                                {plan.planPrice === 0 ? "Downgrade Profile" : "Upgrade Profile"}
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Modal Overlay Layer: Purchase Confirmation */}
            {selectedPlan && (
                <dialog 
                    open 
                    className="premium-modal-backdrop" 
                    onClick={() => setSelectedPlan(null)}
                    onKeyDown={(e) => { if (e.key === "Escape") setSelectedPlan(null); }}
                >
                    <div className="premium-modal-surface" onClick={e => e.stopPropagation()} role="presentation">
                        <div className="modal-accent-strip-alert" style={{ height: "3px", backgroundColor: "#06b6d4", marginBottom: "15px" }}></div>
                        <h4 className="modal-title-main text-uppercase text-white fw-bold" style={{ fontSize: "1.15rem", letterSpacing: "0.5px" }}>Initialize Provision Matrix</h4>
                        <p className="my-3" style={{ fontSize: "0.95rem", lineHeight: "1.5", color: "#d4d4d8" }}>
                            Confirm pipeline allocation initialization for layer block: <span className="text-white fw-bold">{selectedPlan.planTitle}</span> bound at a cycle execution rate parameter of <span className="fw-bold" style={{ color: "#06b6d4" }}>${selectedPlan.planPrice}/month</span>.
                        </p>
                        
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button className="btn-modal-dismiss" onClick={() => setSelectedPlan(null)}>
                                Cancel
                            </button>
                            <button 
                                className="btn-modal-destructive" 
                                style={{ backgroundColor: "#06b6d4", color: "#ffffff" }}
                                onClick={handleConfirmPurchase} 
                                disabled={purchasingPlanID === selectedPlan.planID}
                            >
                                {purchasingPlanID === selectedPlan.planID ? "COMMITTING..." : "Execute Provision"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerViewAccount