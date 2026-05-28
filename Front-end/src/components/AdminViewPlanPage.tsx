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
            <div className="card p-4">
                <button
                    className="btn btn-outline-secondary mb-3"
                    onClick={() => setIsEditing(false)}
                >
                    ← Cancel
                </button>

                <h5 className="mb-3">Edit Plan</h5>

                <div className="mb-3">
                    <label className="form-label">Plan Title</label>
                    <input
                        className="form-control"
                        value={form.planTitle}
                        onChange={(e) =>
                            setForm({ ...form, planTitle: e.target.value })
                        }
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">Price ($/month)</label>
                    <input
                        className="form-control"
                        type="number"
                        value={form.planPrice}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                planPrice: parseFloat(e.target.value),
                            })
                        }
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-control"
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

                <div className="mb-4">
                    <label className="form-label">Encryption Method</label>
                    <select
                        className="form-select"
                        value={form.encMethod}
                        onChange={(e) =>
                            setForm({ ...form, encMethod: e.target.value })
                        }
                    >
                        <option value="">Select encryption method...</option>
                        {encMethods.map((method) => (
                            <option key={method} value={method}>
                                {method}
                            </option>
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

                <span
                    className={`badge ${
                        plan.planStatus === "active"
                            ? "bg-success"
                            : "bg-danger"
                    }`}
                >
                    {plan.planStatus}
                </span>
            </div>

            <p className="text-muted mb-1">
                Price: ${plan.planPrice}/month
            </p>
            <p className="text-muted mb-1">
                Description: {plan.planDescription}
            </p>
            <p className="text-muted mb-4">
                Encryption: {plan.encMethod}
            </p>

            <div className="d-flex gap-2">
                {/*edit button */}
                <button
                    className="btn btn-outline-primary"
                    onClick={() => setIsEditing(true)}
                >
                    Edit Plan
                </button>

                {/*Publish button*/}
                <button
                    className="btn btn-success"
                    disabled={plan.planStatus === "active"}
                    onClick={() => openConfirm("publish")}
                >
                    Publish
                </button>

                {/*Suspend button*/}
                <button
                    className="btn btn-danger"
                    disabled={plan.planStatus === "inactive"}
                    onClick={() => openConfirm("suspend")}
                >
                    Suspend
                </button>
            </div>

            {/*confirmation prompt for publish and suspend plan */}
            {showConfirm && actionType && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 999,
                    }}
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className="card p-4"
                        style={{ width: 360 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h6 className="mb-2">
                            {actionType === "publish"
                                ? "Publish Plan?"
                                : "Suspend Plan?"}
                        </h6>

                        <p
                            className="text-muted mb-4"
                            style={{ fontSize: 14 }}
                        >
                            {actionType === "publish"
                                ? `This will activate ${plan.planTitle} and make it available to users.`
                                : `This will deactivate ${plan.planTitle} and remove user access.`}
                        </p>

                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className={`btn ${
                                    actionType === "publish"
                                        ? "btn-success"
                                        : "btn-danger"
                                }`}
                                onClick={handleConfirm}
                            >
                                {actionType === "publish"
                                    ? "Yes, Publish"
                                    : "Yes, Suspend"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewPlan