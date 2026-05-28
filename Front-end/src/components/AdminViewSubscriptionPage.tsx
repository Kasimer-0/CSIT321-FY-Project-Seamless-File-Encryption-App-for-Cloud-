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
        // validation check 
        if (
            !form.planID ||
            !form.subcriptionStatus ||
            !form.subcriptionStartDate ||
            !form.subscriptionEndDate
        ) {
            alert("Please fill in all fields before saving")
            return
        }

        const selectedPlan = availablePlans.find(
            p => p.planID === parseInt(form.planID.toString())
        )

    if (!selectedPlan) {
        alert("Selected plan is invalid")
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
            <div className="card p-4">
                <button className="btn btn-outline-secondary mb-3" onClick={() => setIsEditing(false)}>
                    ← Cancel
                </button>

                <h5 className="mb-3">Edit Subscription</h5>

                <div className="mb-3">
                    <label className="form-label">Plan</label>
                    <select
                        className="form-select"
                        value={form.planID}
                        onChange={(e) => setForm({ ...form, planID: parseInt(e.target.value) })}
                    >
                        {availablePlans.filter(p => p.planStatus === "active").map(plan => (
                            <option key={plan.planID} value={plan.planID}>
                                {plan.planTitle} — ${plan.planPrice}/month
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                        className="form-select"
                        value={form.subcriptionStatus}
                        onChange={(e) => setForm({ ...form, subcriptionStatus: e.target.value })}
                    >
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label">Start Date</label>
                    <input
                        className="form-control"
                        type="date"
                        value={form.subcriptionStartDate}
                        onChange={(e) => setForm({ ...form, subcriptionStartDate: e.target.value })}
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label">End Date</label>
                    <input
                        className="form-control"
                        type="date"
                        value={form.subscriptionEndDate}
                        onChange={(e) => setForm({ ...form, subscriptionEndDate: e.target.value })}
                    />
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
                <h5 className="mb-0">Subscription #{subscription.subscriptionID}</h5>
                <span className={`badge ${
                    subscription.subcriptionStatus === "active" ? "bg-success" :
                    subscription.subcriptionStatus === "cancelled" ? "bg-danger" :
                    subscription.subcriptionStatus === "expired" ? "bg-secondary" : "bg-warning text-dark"
                }`}>
                    {subscription.subcriptionStatus}
                </span>
            </div>

            <small className="text-muted text-uppercase fw-semibold d-block mb-2 text-decoration-underline" style={{ fontSize: 14, letterSpacing: 1.5 }}>
                Subscriber
            </small>
            <p className="mb-1">Username: {subscription.subscriber.username}</p>
            <p className="mb-3">Email: {subscription.subscriber.email}</p>

            <small className="text-muted text-uppercase fw-semibold d-block mb-2 text-decoration-underline" style={{ fontSize: 14, letterSpacing: 1.5 }}>
                Plan
            </small>
            <p className="mb-1">Plan: {subscription.plan.planTitle}</p>
            <p className="mb-1">Price: ${subscription.plan.planPrice}/month</p>
            <p className="mb-3">Encryption: {subscription.plan.encMethod}</p>

            <small className="text-muted text-uppercase fw-semibold d-block mb-2 text-decoration-underline" style={{ fontSize: 14, letterSpacing: 1.5 }}>
                Duration
            </small>
            <p className="mb-1">Start: {new Date(subscription.subcriptionStartDate).toLocaleDateString()}</p>
            <p className="mb-4">End: {new Date(subscription.subscriptionEndDate).toLocaleDateString()}</p>

            {subscription.subcriptionStatus !== "cancelled" && (
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" onClick={() => setIsEditing(true)}>
                        Edit Subscription
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowCancelConfirm(true)}>
                        Cancel Subscription
                    </button>
                </div>
            )}

            {/* Cancel Confirmation prompt*/}
            {showCancelConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                >
                    <div className="card p-4" style={{ width: 380 }}>
                        <h6 className="mb-2">Cancel Subscription?</h6>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            This will cancel {subscription.subscriber.username}'s subscription.
                            Their account will be set to unsubscribed and they will lose access to premium features.
                        </p>
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowCancelConfirm(false)}
                            >
                                Keep Subscription
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => { onCancel(subscription.subscriptionID); setShowCancelConfirm(false) }}
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewSubscription