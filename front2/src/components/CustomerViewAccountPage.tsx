import { useEffect, useState } from "react"
import type { UserAccount, SubscriptionDTO, Plan } from "../Type"

type Props = {
    user: UserAccount
    onUserUpdate: (updatedUser: UserAccount) => void
}

function CustomerViewAccount({ user, onUserUpdate }: Props) {
    const [subscription, setSubscription] = useState<SubscriptionDTO | null>(null)
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
    const [loadingSub, setLoadingSub] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)
    const [showPlans, setShowPlans] = useState(false)

    const [editUsername, setEditUsername] = useState(user.username)
    const [editEmail, setEditEmail] = useState(user.email)
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const [showCancelSubConfirm, setShowCancelSubConfirm] = useState(false)
    const [cancellingSub, setCancellingSub] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [purchasingPlanID, setPurchasingPlanID] = useState<number | null>(null)

    // Local runtime status banner for toast-free dynamic messaging
    const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null)
    
    const notify = (msg: string, type: "success" | "error") => {
        setFeedback({ msg, type })
        setTimeout(() => setFeedback(null), 5000)
    }

    const initials = editUsername.slice(0, 2).toUpperCase()
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
            setSaveError("Username and email cannot be empty.")
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const response = await fetch(`http://localhost:8080/users/${user.userID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username: editUsername.trim(), email: editEmail.trim() })
            })
            if (!response.ok) throw new Error()
            
            // Build fresh account token instance payload context
            const updatedUser: UserAccount = {
                ...user,
                username: editUsername.trim(),
                email: editEmail.trim()
            }
            onUserUpdate(updatedUser)
            setIsEditing(false)
            notify("Identity metadata metrics committed successfully", "success")
        } catch { 
            setSaveError("GATEWAY_REJECTION: Data update pipeline transaction failed.") 
        } finally { 
            setSaving(false) 
        }
    }

    const handleCancelSubscription = async () => {
        if (!subscription?.subscriptionID) return
        setCancellingSub(true)
        try {
            const response = await fetch(`http://localhost:8080/subscriptions/${subscription.subscriptionID}/cancel`, { 
                method: "PATCH", 
                credentials: "include" 
            })
            if (!response.ok) throw new Error()
            
            const updatedUser: UserAccount = {
                ...user,
                isSubscribed: false,
                subscription: null
            }
            onUserUpdate(updatedUser)
            setSubscription(null)
            notify("Premium subscription allocation revoked", "success")
        } catch { 
            notify("REVOCATION_FAIL: Context rejection on cancellation stream.", "error") 
        } finally { 
            setCancellingSub(false)
            setShowCancelSubConfirm(false) 
        }
    }

    const handleSelectPlanToPurchase = (plan: Plan) => {
        setSelectedPlan(plan)
    }

    const handleConfirmPurchase = async () => {
        if (!selectedPlan) return
        setPurchasingPlanID(selectedPlan.planID)
        try {
            const response = await fetch(`http://localhost:8080/subscriptions/subscribe?userID=${user.userID}&planID=${selectedPlan.planID}`, {
                method: "POST",
                credentials: "include"
            })
            if (!response.ok) throw new Error("SUBSCRIBE_ERR: Transaction pipeline failed.")
            
            const freshSubscriptionData = await response.json() as SubscriptionDTO
            
            const updatedUser: UserAccount = {
                ...user,
                isSubscribed: selectedPlan.planPrice > 0,
                subscription: freshSubscriptionData
            }
            
            onUserUpdate(updatedUser)
            setSubscription(freshSubscriptionData)
            notify(`SUCCESS: ${selectedPlan.planTitle} active matrix sync clear.`, "success")
            setSelectedPlan(null)
            setShowPlans(false)
        } catch (error) {
            notify("TRANSACTION_FAILED: Check financial stream parameters.", "error")
        } finally { 
            setPurchasingPlanID(null) 
        }
    }

    useEffect(() => {
        if (!user.isSubscribed) { setSubscription(null); setLoadingSub(false); return }
        if (embeddedSubscription) { setSubscription(embeddedSubscription); setLoadingSub(false); return }
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
        <div className="w-100 text-white font-monospace" style={{ maxWidth: "760px" }}>
            {/* Header section */}
            <div className="border-bottom border-secondary pb-2 mb-4">
                <h5 className="workspace-section-heading mb-0 text-uppercase tracking-wider text-cyan">USER_ACCOUNT_METADATA_MATRIX</h5>
                <p className="text-muted small mb-0">VERIFY_IDENTITY_VARIABLES_AND_CRYPTOGRAPHIC_TIER_SUBSCRIPTIONS</p>
            </div>

            {/* Local Alert Feedback */}
            {feedback && (
                <div className={`mb-3 py-2 px-3 rounded small d-flex align-items-center gap-2 ${feedback.type === 'success' ? 'bg-success bg-opacity-20 border border-success text-success' : 'bg-danger bg-opacity-20 border border-danger text-danger'}`}>
                    <span className="p-1 rounded-circle bg-current" style={{ width: "6px", height: "6px" }}></span>
                    <span>{feedback.msg}</span>
                </div>
            )}

            {/* Core Segment: Two-Column Profile layout */}
            <div className="row g-4 mb-4">
                {/* Column 1: Identity Parameters mapping */}
                <div className="col-12 col-md-6">
                    <div className="border border-secondary rounded p-3 bg-dark h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                            <h6 className="text-cyan text-uppercase mb-0 tracking-wider small">ACCOUNT_IDENTITY</h6>
                            {!isEditing && (
                                <button className="btn btn-xs btn-outline-info font-monospace py-0 px-2" style={{ fontSize: "11px" }} onClick={() => setIsEditing(true)}>
                                    EDIT
                                </button>
                            )}
                        </div>

                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: "54px", height: "54px", fontSize: "1.2rem", border: "2px solid #06b6d4" }}>
                                {initials}
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                {isEditing ? (
                                    <div className="d-flex flex-column gap-2">
                                        <input className="form-control form-control-sm bg-black text-white border-secondary font-monospace" style={{ fontSize: "13px" }} value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username" />
                                        <input className="form-control form-control-sm bg-black text-white border-secondary font-monospace" style={{ fontSize: "13px" }} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email Link" />
                                        {saveError && <div className="text-danger font-monospace" style={{ fontSize: "11px" }}>{saveError}</div>}
                                        <div className="d-flex gap-2 mt-1">
                                            <button className="btn btn-sm btn-info text-dark fw-bold px-3 py-0" style={{ fontSize: "11px" }} onClick={handleSaveEdit} disabled={saving}>
                                                {saving ? "SAVING..." : "COMMIT"}
                                            </button>
                                            <button className="btn btn-sm btn-outline-secondary px-2 py-0" style={{ fontSize: "11px" }} onClick={handleCancelEdit}>
                                                CANCEL
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="fw-bold text-white text-truncate" style={{ fontSize: "0.95rem" }}>{user.username}</div>
                                        <div className="text-muted text-truncate" style={{ fontSize: "0.75rem" }}>{user.email}</div>
                                        <div className="text-muted mt-1" style={{ fontSize: "11px" }}>SYS_ID: <span className="text-white opacity-75">{user.userID}</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Subscription Core Status mapping */}
                <div className="col-12 col-md-6">
                    <div className="border border-secondary rounded p-3 bg-dark h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div className="border-bottom border-secondary pb-2 mb-3">
                                <h6 className="text-cyan text-uppercase mb-0 tracking-wider small">SUBSCRIPTION_STATUS</h6>
                            </div>
                            {loadingSub ? (
                                <div className="text-muted small">FETCHING_REGISTRY_METADATA...</div>
                            ) : user.isSubscribed && subscription ? (
                                <div className="small">
                                    <div className="text-info fw-bold mb-1 text-uppercase">✦ PREMIUM_TIER_ACTIVE</div>
                                    <div className="text-muted">ID: <span className="text-white">{subscription.subscriptionID}</span></div>
                                    <div className="text-muted">Auto-Renew: <span className={subscription.autoRenew ? "text-success" : "text-warning"}>{subscription.autoRenew ? "ENABLED" : "DISABLED"}</span></div>
                                </div>
                            ) : (
                                <div className="small">
                                    <div className="text-muted mb-1">↳ STANDARD_FREE_TIER</div>
                                    <p className="text-muted mb-0" style={{ fontSize: "11px", lineHeight: "1.4" }}>Advanced modules (Physical Tokens, Recovery Phrases) are currently locked.</p>
                                </div>
                            )}
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-sm btn-info text-dark fw-bold font-monospace" style={{ fontSize: "12px" }} onClick={() => setShowPlans(!showPlans)}>
                                {showPlans ? "CLOSE_PLANS_MATRIX" : "UPGRADE_TIER_OPTIONS"}
                            </button>
                            {user.isSubscribed && (
                                <button className="btn btn-sm btn-outline-danger font-monospace" style={{ fontSize: "12px" }} onClick={() => setShowCancelSubConfirm(true)}>
                                    REVOKE
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Segment Toggle Matrix: Available Plans Drawer */}
            {showPlans && (
                <div className="border border-info rounded p-3 bg-dark bg-opacity-20 mb-4">
                    <h6 className="text-info text-uppercase font-monospace mb-3 tracking-wider small">AVAILABLE_TIER_PLANS_REGISTRY</h6>
                    {loadingPlans ? (
                        <div className="text-muted small p-2">POLLING_SUBSCRIBER_TIERS...</div>
                    ) : availablePlans.length === 0 ? (
                        <div className="text-muted small p-2">NO_ACTIVE_TIERS_EXPORTED_FROM_BACKEND</div>
                    ) : (
                        <div className="row g-3">
                            {availablePlans.map(plan => (
                                <div key={plan.planID} className="col-12 col-sm-6">
                                    <div className="p-3 border border-secondary rounded bg-black bg-opacity-40 d-flex flex-column justify-content-between h-100">
                                        <div>
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <div className="fw-bold text-white small text-uppercase">{plan.planTitle}</div>
                                                <div className="text-info fw-bold small">${plan.planPrice}<span className="text-muted font-normal" style={{ fontSize: "10px" }}>/mo</span></div>
                                            </div>
                                            <p className="text-muted mt-2 mb-0" style={{ fontSize: "11px", lineHeight: "1.4" }}>{plan.planDescription}</p>
                                        </div>
                                        <button className="btn btn-xs btn-info text-dark fw-bold w-100 mt-3 font-monospace py-1" style={{ fontSize: "11px" }} onClick={() => handleSelectPlanToPurchase(plan)}>
                                            DEPLOY_TIER
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Layer Overlay 1: Revoke Subscription Confirmation */}
            {showCancelSubConfirm && (
                <dialog open className="premium-modal-backdrop" onClick={() => setShowCancelSubConfirm(false)}>
                    <div className="premium-modal-surface font-monospace" onClick={e => e.stopPropagation()}>
                        <div className="modal-accent-strip-alert"></div>
                        <h4 className="modal-title-main text-uppercase text-white" style={{ fontSize: "1.1rem" }}>Confirm Revocation?</h4>
                        <p className="modal-description-text mt-2" style={{ fontSize: "12px" }}>
                            This command will permanently cancel your subscription allocation mapping. Hardware tokens will immediately reject authorization vectors.
                        </p>
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button className="btn-modal-dismiss font-monospace text-muted bg-transparent border-0" onClick={() => setShowCancelSubConfirm(false)}>
                                ABORT
                            </button>
                            <button className="btn btn-sm btn-danger font-monospace px-3 text-white" onClick={handleCancelSubscription} disabled={cancellingSub}>
                                {cancellingSub ? "TERMINATING..." : "CONFIRM_REVOCATION"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Modal Layer Overlay 2: Purchase Confirmation Panel */}
            {selectedPlan && (
                <dialog open className="premium-modal-backdrop" onClick={() => setSelectedPlan(null)}>
                    <div className="premium-modal-surface font-monospace" onClick={e => e.stopPropagation()}>
                        <h4 className="modal-title-main text-info text-uppercase" style={{ fontSize: "1.1rem" }}>Initialize Provision Matrix</h4>
                        <p className="modal-description-text mt-2" style={{ fontSize: "12px" }}>
                            Confirm pipeline allocation initialization for tier block: <span className="text-white fw-bold">{selectedPlan.planTitle}</span> at a billing threshold rate of <span className="text-info fw-bold">${selectedPlan.planPrice}/month</span>.
                        </p>
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <button className="btn-modal-dismiss font-monospace text-muted bg-transparent border-0" onClick={() => setSelectedPlan(null)}>
                                CANCEL
                            </button>
                            <button className="btn btn-sm btn-info text-dark fw-bold font-monospace px-3" onClick={handleConfirmPurchase} disabled={purchasingPlanID === selectedPlan.planID}>
                                {purchasingPlanID === selectedPlan.planID ? "COMMITTING..." : "EXECUTE_PROVISION"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerViewAccount