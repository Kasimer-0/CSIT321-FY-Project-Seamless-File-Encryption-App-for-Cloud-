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
    
    // Inline metric validation diagnostic state
    const [bannerMessage, setBannerMessage] = useState("")

    const triggerBanner = (msg: string) => {
        setBannerMessage(msg)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const [form, setForm] = useState({
        planID: subscription.plan.planID,
        subcriptionStatus: subscription.subcriptionStatus,
        subcriptionStartDate: new Date(subscription.subcriptionStartDate)
            .toISOString()
            .split("T")[0],
        subscriptionEndDate: new Date(subscription.subscriptionEndDate)
            .toISOString()
            .split("T")[0],
    })

    const handleSave = () => {
        if (
            !form.planID ||
            !form.subcriptionStatus ||
            !form.subcriptionStartDate ||
            !form.subscriptionEndDate
        ) {
            triggerBanner("CRITICAL_ERR: Missing parameter mutations. All metrics fields required.")
            return
        }

        const selectedPlan = availablePlans.find(
            p => p.planID === parseInt(form.planID.toString())
        )

        if (!selectedPlan) {
            triggerBanner("INVALID_PLAN_ERR: Target schematic mapping failed.")
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
    }

    if (isEditing) {
        return (
            <div className="premium-metric-card-wrapper border rounded p-4">
                {/* Edit View Header */}
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                    <button className="btn-workspace-action font-monospace fs-8" onClick={() => setIsEditing(false)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        ABORT_MUTATION
                    </button>
                    <span className="font-monospace text-muted fs-8">TERM_ALLOCATION_EDIT</span>
                </div>

                {/* Banner Anchor for Errors */}
                {bannerMessage && (
                    <div className="status-banner status-error mb-3 py-2 px-3 rounded font-monospace fs-8 d-flex align-items-center gap-2">
                        <span className="status-indicator-dot"></span>
                        <span className="status-text text-white">{bannerMessage}</span>
                    </div>
                )}

                <h4 className="workspace-section-heading mb-4">Modify Term Provision Strategy</h4>

                <div className="d-flex flex-column gap-3 mb-4">
                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">PROVISION_PLAN_MODEL</label>
                        <select
                            className="form-select font-monospace fs-7 border bg-workspace-card table-primary-text"
                            value={form.planID}
                            onChange={(e) => setForm({ ...form, planID: parseInt(e.target.value) })}
                        >
                            {availablePlans.filter(p => p.planStatus === "active").map(plan => (
                                <option key={plan.planID} value={plan.planID}>
                                    {plan.planTitle.toUpperCase()} — ${plan.planPrice.toFixed(2)}/mo
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">ALLOTMENT_LIFECYCLE_STATUS</label>
                        <select
                            className="form-select font-monospace fs-7 border bg-workspace-card table-primary-text"
                            value={form.subcriptionStatus}
                            onChange={(e) => setForm({ ...form, subcriptionStatus: e.target.value })}
                        >
                            <option value="active">ACTIVE</option>
                            <option value="cancelled">CANCELLED</option>
                            <option value="expired">EXPIRED</option>
                        </select>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-sm-6">
                            <label className="text-muted small font-monospace fs-8 mb-1">EPOCH_INITIALIZATION_DATE</label>
                            <input
                                className="form-control font-monospace fs-7 border bg-workspace-card table-primary-text"
                                type="date"
                                value={form.subcriptionStartDate}
                                onChange={(e) => setForm({ ...form, subcriptionStartDate: e.target.value })}
                            />
                        </div>
                        <div className="col-12 col-sm-6">
                            <label className="text-muted small font-monospace fs-8 mb-1">EPOCH_TERMINATION_DATE</label>
                            <input
                                className="form-control font-monospace fs-7 border bg-workspace-card table-primary-text"
                                type="date"
                                value={form.subscriptionEndDate}
                                onChange={(e) => setForm({ ...form, subscriptionEndDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="text-end border-top pt-3">
                    <button className="sidebar-nav-item w-auto px-4 py-2 m-0 font-monospace fs-7 bg-cyan text-white border-0" onClick={handleSave}>
                        COMMIT_RECONFIGURED_METRICS
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative">
            {/* Read-Only View Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <button className="btn-workspace-action font-monospace fs-8" onClick={onBack}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    RETURN_TO_INDEX
                </button>
                
                <span className={`badge-pill-premium ${
                    subscription.subcriptionStatus === "active" ? "success" :
                    subscription.subcriptionStatus === "cancelled" ? "destructive" : "neutral"
                }`}>
                    {subscription.subcriptionStatus.toUpperCase()}
                </span>
            </div>

            <div className="font-monospace fs-6 table-primary-text mb-4">
                ALLOTMENT_VECTOR: <span className="text-cyan">#{subscription.subscriptionID}</span>
            </div>

            {/* Profile Overview Mapping */}
            <div className="row g-4 mb-4">
                {/* Segment: Subscriber Coordinates */}
                <div className="col-12 col-md-4">
                    <div className="text-muted small font-monospace fs-8 mb-2 uppercase tracking-wider">Subscriber Identity</div>
                    <div className="border rounded p-3 bg-workspace-card h-100 min-h-110">
                        <div className="fw-semibold table-primary-text fs-7 mb-1">{subscription.subscriber.username}</div>
                        <div className="font-monospace text-muted fs-8 overflow-hidden text-truncate">{subscription.subscriber.email}</div>
                    </div>
                </div>

                {/* Segment: Plan Schematics */}
                <div className="col-12 col-md-4">
                    <div className="text-muted small font-monospace fs-8 mb-2 uppercase tracking-wider">Plan Matrix Specs</div>
                    <div className="border rounded p-3 bg-workspace-card h-100 min-h-110">
                        <div className="fw-semibold text-cyan fs-7 mb-1">{subscription.plan.planTitle}</div>
                        <div className="font-monospace text-emerald fs-7 fw-medium mb-1">${subscription.plan.planPrice.toFixed(2)}/mo</div>
                        <div className="font-monospace text-muted fs-8">CIPHER: {subscription.plan.encMethod.toUpperCase()}</div>
                    </div>
                </div>

                {/* Segment: Duration Windows */}
                <div className="col-12 col-md-4">
                    <div className="text-muted small font-monospace fs-8 mb-2 uppercase tracking-wider">Term Lifespan Parameters</div>
                    <div className="border rounded p-3 bg-workspace-card h-100 min-h-110 d-flex flex-column gap-1 font-monospace fs-7">
                        <div><span className="text-muted fs-8">INIT_EPOCH:</span> <span className="table-primary-text">{new Date(subscription.subcriptionStartDate).toLocaleDateString()}</span></div>
                        <div><span className="text-muted fs-8">TERM_EPOCH:</span> <span className="table-primary-text">{new Date(subscription.subscriptionEndDate).toLocaleDateString()}</span></div>
                    </div>
                </div>
            </div>

            {/* Global Control Management Pipeline */}
            {subscription.subcriptionStatus !== "cancelled" && (
                <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-4 flex-wrap gap-2">
                    <button className="btn-workspace-action font-monospace fs-8 py-2 px-3" onClick={() => setIsEditing(true)}>
                        MUTATE_TERM_PROVISION
                    </button>
                    <button className="sidebar-nav-item w-auto px-4 py-2 m-0 font-monospace fs-7 border border-danger text-danger bg-transparent" onClick={() => setShowCancelConfirm(true)}>
                        FORCE_DECOMMISSION_ALLOTMENT
                    </button>
                </div>
            )}

            {/* Cancel Confirmation Modal System Backdrop */}
            {showCancelConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 999 }}
                >
                    <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card" style={{ width: 420, maxWidth: "90%" }}>
                        <div className="d-flex align-items-center mb-3 text-danger gap-2 font-monospace fs-7 fw-semibold">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                                <line x1="12" y1="9" x2="12" y2="13"></line><circle cx="12" cy="17" r="0.01"></circle>
                            </svg>
                            CONFIRM_PROVISION_DECOMMISSION
                        </div>

                        <p className="text-muted font-monospace fs-7 mb-4">
                            Proceeding will forcibly drop subscriber token [ {subscription.subscriber.username} ] onto a decommissioned state lifecycle vector. All downstream infrastructure access allocations will immediately close.
                        </p>
                        
                        <div className="d-flex gap-2 justify-content-end border-top pt-3">
                            <button
                                className="btn-workspace-action font-monospace fs-8 px-3"
                                onClick={() => setShowCancelConfirm(false)}
                            >
                                ABORT_DECOMMISSION
                            </button>
                            <button
                                className="sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-8 bg-destructive text-white border-0"
                                onClick={() => { onCancel(subscription.subscriptionID); setShowCancelConfirm(false) }}
                            >
                                COMMIT_DECOMMISSION
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewSubscription