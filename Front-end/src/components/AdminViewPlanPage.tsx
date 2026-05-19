import { useState } from "react"
import type { Plan } from "../Entity"

type AdminViewPlanProps = {
    plan: Plan
    encMethods: string[]
    onBack: () => void
    onEdit: (updated: Plan) => void
    onToggleSuspend: (plan: Plan) => void
}

function AdminViewPlan({ plan, encMethods, onBack, onEdit, onToggleSuspend }: AdminViewPlanProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<Omit<Plan, "planID">>({
        planTitle: plan.planTitle,
        planPrice: plan.planPrice,
        planDescription: plan.planDescription,
        planStatus: plan.planStatus,
        encMethod: plan.encMethod,
    })
    const [showConfirm, setShowConfirm] = useState(false)

    const handleSave = () => {
        onEdit({ ...plan, ...form })
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <div className="card p-4">
                <button className="btn btn-outline-secondary mb-3" onClick={() => setIsEditing(false)}>
                    ← Cancel
                </button>

                <h5 className="mb-3">Edit Plan</h5>

                <div className="mb-3">
                    <label className="form-label">Plan Title</label>
                    <input
                        className="form-control"
                        value={form.planTitle}
                        onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">Price ($/month)</label>
                    <input
                        className="form-control"
                        type="number"
                        value={form.planPrice}
                        onChange={(e) => setForm({ ...form, planPrice: parseFloat(e.target.value) })}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={form.planDescription}
                        onChange={(e) => setForm({ ...form, planDescription: e.target.value })}
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label">Encryption Method</label>
                    <select
                        className="form-select"
                        value={form.encMethod}
                        onChange={(e) => setForm({ ...form, encMethod: e.target.value })}
                    >
                        <option value="">Select encryption method...</option>
                        {encMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                </div>

                <button className="btn btn-primary" onClick={handleSave}>
                    Save Changes
                </button>
            </div>
        )
    }

    return (
        <div className="card p-4">
            <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
                ← Back
            </button>

            <div className="d-flex justify-content-between align-items-start mb-3">
                <h5 className="mb-0">{plan.planTitle}</h5>
                <span className={`badge ${plan.planStatus === "active" ? "bg-success" : "bg-danger"}`}>
                    {plan.planStatus}
                </span>
            </div>

            <p className="text-muted mb-1">Price: ${plan.planPrice}/month</p>
            <p className="text-muted mb-1">Description: {plan.planDescription}</p>
            <p className="text-muted mb-4">Encryption: {plan.encMethod}</p>

            <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={() => setIsEditing(true)}>
                    Edit Plan
                </button>
                <button
                    className={`btn ${plan.planStatus === "active" ? "btn-danger" : "btn-success"}`}
                    onClick={() => setShowConfirm(true)}
                >
                    {plan.planStatus === "active" ? "Suspend Plan" : "Unsuspend Plan"}
                </button>
            </div>

            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                >
                    <div className="card p-4" style={{ width: 360 }}>
                        <h6 className="mb-2">
                            {plan.planStatus === "active" ? "Suspend Plan?" : "Unsuspend Plan?"}
                        </h6>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            {plan.planStatus === "active"
                                ? `This will suspend the ${plan.planTitle} plan. Users on this plan will lose access.`
                                : `This will reactivate the ${plan.planTitle} plan.`
                            }
                        </p>
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={`btn ${plan.planStatus === "active" ? "btn-danger" : "btn-success"}`}
                                onClick={() => { onToggleSuspend(plan); setShowConfirm(false) }}
                            >
                                {plan.planStatus === "active" ? "Yes, Suspend" : "Yes, Unsuspend"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewPlan