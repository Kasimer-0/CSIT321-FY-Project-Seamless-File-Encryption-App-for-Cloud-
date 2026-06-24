import { useState } from "react"
import type { Plan } from "../Type"

type AdminViewPlanProps = {
    plan: Plan
    encMethods: string[]
    onBack: () => void
    onEdit: (updated: Plan) => void
    onUpdateStatus: (plan: Plan, status: "active" | "inactive") => void
}

function AdminViewPlan({
    plan,
    encMethods,
    onBack,
    onEdit,
    onUpdateStatus
}: AdminViewPlanProps) {

    const [isEditing, setIsEditing] = useState(false)

    const [form, setForm] = useState({
        planTitle: plan.planTitle,
        planPrice: plan.planPrice,
        planDescription: plan.planDescription,
        encMethod: plan.encMethod,
    })

    const [showConfirm, setShowConfirm] = useState(false)
    const [actionType, setActionType] = useState<"publish" | "suspend" | null>(null)

    const handleSave = () => {
        onEdit({ ...plan, ...form })
        setIsEditing(false)
    }

    const openConfirm = (type: "publish" | "suspend") => {
        setActionType(type)
        setShowConfirm(true)
    }

    const handleConfirm = () => {
        if (!actionType) return

        const newStatus: "active" | "inactive" =
            actionType === "publish" ? "active" : "inactive"

        onUpdateStatus(plan, newStatus)

        setShowConfirm(false)
        setActionType(null)
    }

    if (isEditing) {
        return (
            <div className="premium-metric-card-wrapper border rounded p-4">
                {/* Edit Header */}
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                    <button 
                        className="btn-workspace-action font-monospace fs-8" 
                        onClick={() => setIsEditing(false)}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        ABORT_CHANGES
                    </button>
                    <span className="font-monospace text-muted fs-8">PLAN_MUTATION_DESCRIPTOR</span>
                </div>

                <h4 className="workspace-section-heading mb-4">Modify Infrastructure Tier Parameters</h4>

                {/* Mutation Fields Form Layout */}
                <div className="d-flex flex-column gap-3 mb-4">
                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">PLAN_IDENTIFIER_TITLE</label>
                        <input
                            className="form-control font-monospace fs-7 border bg-workspace-card table-primary-text"
                            value={form.planTitle}
                            onChange={(e) =>
                                setForm({ ...form, planTitle: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">BILLING_RATE_USD_MONTHLY</label>
                        <div className="input-group">
                            <span className="input-group-text font-monospace fs-7 bg-workspace-card border text-muted">$</span>
                            <input
                                className="form-control font-monospace fs-7 border bg-workspace-card table-primary-text"
                                type="number"
                                value={form.planPrice}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        planPrice: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">CAPACITY_METRIC_DESCRIPTION</label>
                        <textarea
                            className="form-control fs-7 border bg-workspace-card table-primary-text"
                            rows={3}
                            value={form.planDescription}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    planDescription: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-muted small font-monospace fs-8 mb-1">CRYPTO_CIPHER_SUITE</label>
                        <select
                            className="form-select font-monospace fs-7 border bg-workspace-card table-primary-text"
                            value={form.encMethod}
                            onChange={(e) =>
                                setForm({ ...form, encMethod: e.target.value })
                            }
                        >
                            <option value="" className="text-muted">Select encryption vector option...</option>
                            {encMethods.map((method) => (
                                <option key={method} value={method}>
                                    {method.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="text-end border-top pt-3">
                    <button className="sidebar-nav-item w-auto px-4 py-2 m-0 font-monospace fs-7 bg-cyan text-white border-0" onClick={handleSave}>
                        PUSH_CONFIGURATION_MUTATIONS
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative">
            {/* Read-Only Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <button className="btn-workspace-action font-monospace fs-8" onClick={onBack}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    RETURN_TO_INDEX
                </button>
                
                <span className={`badge-pill-premium ${plan.planStatus === "active" ? "success" : "destructive"}`}>
                    {plan.planStatus.toUpperCase()}_STATE
                </span>
            </div>

            {/* Profile Overview Mapping */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-7">
                    <div className="text-muted small font-monospace fs-8 mb-1">INFRASTRUCTURE_PROVISION_NAME</div>
                    <h3 className="workspace-section-heading mb-3">{plan.planTitle}</h3>
                    
                    <div className="text-muted small font-monospace fs-8 mb-1">PROVISION_CAPACITY_METRICS</div>
                    <p className="table-primary-text border rounded p-3 bg-workspace-card fs-7 mb-0 min-h-80">
                        {plan.planDescription}
                    </p>
                </div>

                <div className="col-12 col-md-5">
                    <div className="text-muted small font-monospace fs-8 mb-1">ALLOTMENT_METRIC_SPECS</div>
                    <div className="d-flex flex-column gap-2">
                        <div className="p-2.5 border rounded bg-workspace-card font-monospace fs-7 d-flex justify-content-between">
                            <span className="text-muted">SUBSCRIPTION_RATE:</span>
                            <span className="fw-semibold text-emerald">${plan.planPrice.toFixed(2)} / mo</span>
                        </div>
                        <div className="p-2.5 border rounded bg-workspace-card font-monospace fs-7 d-flex justify-content-between">
                            <span className="text-muted">CIPHER_SUITE_SUGGESTION:</span>
                            <span className="fw-semibold text-cyan">{plan.encMethod.toUpperCase() || "NULL_CYPHER"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Control Management Pipeline */}
            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-4 gap-2 flex-wrap">
                <button
                    className="btn-workspace-action font-monospace fs-8 py-2 px-3"
                    onClick={() => setIsEditing(true)}
                >
                    MUTATE_PLAN_SCHEMATICS
                </button>

                <div className="d-flex gap-2">
                    <button
                        className="sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-8 border bg-transparent"
                        style={{ color: plan.planStatus === "active" ? "var(--text-muted)" : "var(--emerald)" }}
                        disabled={plan.planStatus === "active"}
                        onClick={() => openConfirm("publish")}
                    >
                        COMMISSION_ROUTE
                    </button>

                    <button
                        className="sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-8 border bg-transparent"
                        style={{ color: plan.planStatus === "inactive" ? "var(--text-muted)" : "var(--destructive)" }}
                        disabled={plan.planStatus === "inactive"}
                        onClick={() => openConfirm("suspend")}
                    >
                        DECOMMISSION_ROUTE
                    </button>
                </div>
            </div>

            {/* State Modification Modal Backdrop overlay */}
            {showConfirm && actionType && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 999 }}
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card"
                        style={{ width: 400, maxWidth: "90%" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="d-flex align-items-center mb-3 text-warning gap-2 font-monospace fs-7 fw-semibold">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            PIPELINE_STATE_OVERRIDE
                        </div>

                        <h6 className="mb-2 font-monospace table-primary-text fs-7">
                            {actionType === "publish" ? "Confirm Provision Deployment?" : "Confirm Provision Suspension?"}
                        </h6>

                        <p className="text-muted font-monospace fs-7 mb-4">
                            {actionType === "publish"
                                ? `Confirming this instruction shifts [ ${plan.planTitle} ] into public operations, exposing metrics profiles to external nodes.`
                                : `Confirming this instruction withdraws [ ${plan.planTitle} ] from global visibility parameters, blocking further ingestion paths.`}
                        </p>

                        <div className="d-flex gap-2 justify-content-end border-top pt-3">
                            <button
                                className="btn-workspace-action font-monospace fs-8 px-3"
                                onClick={() => setShowConfirm(false)}
                            >
                                ABORT_OVERRIDE
                            </button>

                            <button
                                className={`sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-8 ${actionType === "publish" ? "bg-emerald text-white" : "bg-destructive text-white"}`}
                                onClick={handleConfirm}
                            >
                                {actionType === "publish" ? "COMMIT_COMMISSION" : "COMMIT_DECOMMISSION"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewPlan