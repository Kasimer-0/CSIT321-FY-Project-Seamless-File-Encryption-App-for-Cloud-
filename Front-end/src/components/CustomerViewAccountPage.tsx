import { useEffect, useState } from "react"
import type { UserAccount, SubscriptionDTO, Plan } from "../Type"
import toast from "react-hot-toast"

type Props = {
    user: UserAccount
    onSubscribe?: (plan: Plan) => void
    onUpdateAccount?: (updated: { username: string; email: string }) => void
    onSuspendAccount?: () => void
    onCancelSubscription?: () => void
}

function CustomerViewAccount({ user, onSubscribe, onUpdateAccount, onSuspendAccount, onCancelSubscription }: Props) {
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

    const [showSuspendConfirm, setShowSuspendConfirm] = useState(false)
    const [suspending, setSuspending] = useState(false)

    const [showCancelSubConfirm, setShowCancelSubConfirm] = useState(false)
    const [cancellingSub, setCancellingSub] = useState(false)

    const initials = editUsername.slice(0, 2).toUpperCase()

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

            if (!response.ok) {
                setSaveError("Failed to save changes.")
                return
            }

            onUpdateAccount?.({ username: editUsername.trim(), email: editEmail.trim() })
            setIsEditing(false)
            toast.success("Account updated successfully")

        } catch {
            setSaveError("Server connection failed.")
        } finally {
            setSaving(false)
        }
    }

    const handleSuspend = async () => {
        setSuspending(true)

        try {
            const response = await fetch(`http://localhost:8080/users/${user.userID}/suspend`, {
                method: "POST",
                credentials: "include"
            })

            if (!response.ok) {
                toast.error("Failed to suspend account")
                return
            }

            onSuspendAccount?.()
            toast.success("Account suspended successfully")

        } catch {
            toast.error("Server connection failed")
        } finally {
            setSuspending(false)
            setShowSuspendConfirm(false)
        }
    }

    const handleCancelSubscription = async () => {
        setCancellingSub(true)

        try {
            const response = await fetch(
                `http://localhost:8080/subscriptions/${subscription?.subscriptionID}/cancel`,
                { method: "PATCH", credentials: "include" }
            )

            if (!response.ok) {
                toast.error("Failed to cancel subscription")
                return
            }

            onCancelSubscription?.()
            toast.success("Subscription cancelled successfully")

        } catch {
            toast.error("Server connection failed")
        } finally {
            setCancellingSub(false)
            setShowCancelSubConfirm(false)
        }
    }

    useEffect(() => {
        if (!user.isSubscribed) return
        setLoadingSub(true)

        fetch(`http://localhost:8080/subscriptions/${user.subscription}`, { credentials: "include" })
            .then(r => r.json())
            .then((data: SubscriptionDTO) => setSubscription(data))
            .catch(err => console.error("Failed to fetch subscription", err))
            .finally(() => setLoadingSub(false))

    }, [user.isSubscribed, user.subscription])

    useEffect(() => {
        if (!showPlans) return
        if (availablePlans.length > 0) return
        setLoadingPlans(true)

        fetch("http://localhost:8080/plans", { credentials: "include" })
            .then(r => r.json())
            .then((data: Plan[]) => setAvailablePlans(data.filter(p => p.planStatus === "active")))
            .catch(err => console.error("Failed to fetch plans", err))
            .finally(() => setLoadingPlans(false))

    }, [showPlans])

    const currentPlanID = subscription?.plan.planID ?? null

    return (
        <>
        <div style={{ maxWidth: 680 }}>

            {/* Account */}
            <div className="card p-4 mb-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h6 className="text-muted text-uppercase fw-semibold mb-0" style={{ fontSize: 11, letterSpacing: 1.4 }}>
                        Account
                    </h6>
                    {!isEditing && (
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsEditing(true)}>
                            ✏️ Edit
                        </button>
                    )}
                </div>

                <div className="d-flex align-items-center gap-4">
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white fw-bold flex-shrink-0"
                        style={{ width: 64, height: 64, fontSize: 22 }}
                    >
                        {initials}
                    </div>

                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        {isEditing ? (
                            <div className="d-flex flex-column gap-2">
                                <div>
                                    <label className="form-label mb-1" style={{ fontSize: 12 }}>Username</label>
                                    <input className="form-control form-control-sm" value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username" />
                                </div>
                                <div>
                                    <label className="form-label mb-1" style={{ fontSize: 12 }}>Email</label>
                                    <input className="form-control form-control-sm" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" />
                                </div>
                                {saveError && <div className="text-danger" style={{ fontSize: 12 }}>{saveError}</div>}
                                <div className="d-flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saving}>
                                        {saving ? "Saving…" : "Save"}
                                    </button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={handleCancelEdit} disabled={saving}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="fw-semibold fs-5 mb-1">{editUsername}</div>
                                <div className="text-muted" style={{ fontSize: 14 }}>{editEmail}</div>
                                <div className="mt-1">
                                    <span className="badge bg-secondary me-1 text-capitalize">{user.role}</span>
                                    {user.isSubscribed ? <span className="badge bg-success">Subscribed</span> : <span className="badge bg-secondary">Free</span>}
                                    {user.isSuspended && <span className="badge bg-danger ms-1">Suspended</span>}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription */}
            <div className="card p-4 mb-4">
                <h6 className="text-muted text-uppercase fw-semibold mb-3" style={{ fontSize: 11, letterSpacing: 1.4 }}>
                    Subscription
                </h6>

                {loadingSub ? (
                    <div className="text-muted" style={{ fontSize: 14 }}>Loading subscription…</div>
                ) : user.isSubscribed && subscription ? (
                    <>
                        <div className="d-flex align-items-start justify-content-between gap-3">
                            <div>
                                <div className="fw-semibold fs-6">{subscription.plan.planTitle}</div>
                                <div className="text-muted" style={{ fontSize: 13 }}>{subscription.plan.planDescription}</div>
                                <div className="mt-2 d-flex flex-wrap gap-3" style={{ fontSize: 13 }}>
                                    <span>
                                        <span className="text-muted">Status: </span>
                                        <span className={`badge ${subscription.subcriptionStatus === "active" ? "bg-success" : "bg-warning text-dark"}`}>
                                            {subscription.subcriptionStatus}
                                        </span>
                                    </span>
                                    <span><span className="text-muted">Started: </span>{new Date(subscription.subcriptionStartDate).toLocaleDateString()}</span>
                                    <span><span className="text-muted">Renews: </span>{new Date(subscription.subscriptionEndDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-end flex-shrink-0">
                                <div className="fw-bold fs-5">
                                    ${subscription.plan.planPrice}
                                    <span className="text-muted fw-normal" style={{ fontSize: 13 }}>/mo</span>
                                </div>
                            </div>
                        </div>

                        <hr className="my-3" />

                        <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">Encryption: {subscription.plan.encMethod}</small>
                            <div className="d-flex gap-2">
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPlans(v => !v)}>
                                    {showPlans ? "Hide Plans" : "View Plans"}
                                </button>
                                {subscription.subcriptionStatus === "active" && (
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => setShowCancelSubConfirm(true)}>
                                        Cancel Subscription
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="d-flex align-items-center justify-content-between gap-3">
                        <div>
                            <div className="fw-semibold">Free Plan</div>
                            <small className="text-muted">Upgrade to unlock higher limits and advanced features.</small>
                        </div>
                        <button className="btn btn-primary flex-shrink-0" onClick={() => setShowPlans(v => !v)}>
                            {showPlans ? "Hide Plans" : "View Plans"}
                        </button>
                    </div>
                )}

                {showPlans && (
                    <div className="mt-3">
                        {loadingPlans ? (
                            <div className="text-muted" style={{ fontSize: 14 }}>Loading plans…</div>
                        ) : (
                            <div className="row g-3">
                                {availablePlans.map(plan => {
                                    const isCurrent = plan.planID === currentPlanID || (!user.isSubscribed && plan.planPrice === 0)
                                    return (
                                        <div key={plan.planID} className="col-12 col-md-6">
                                            <div className="card h-100 p-3 position-relative" style={{ borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? "var(--bs-primary)" : undefined }}>
                                                {isCurrent && (
                                                    <span className="badge bg-success position-absolute" style={{ top: -10, left: 12, fontSize: 11 }}>Current Plan</span>
                                                )}
                                                <div className="fw-semibold fs-6 mb-1">{plan.planTitle}</div>
                                                <div className="mb-2">
                                                    <span className="fw-bold fs-4">{plan.planPrice === 0 ? "Free" : `$${plan.planPrice}`}</span>
                                                    {plan.planPrice > 0 && <span className="text-muted ms-1" style={{ fontSize: 13 }}>/mo</span>}
                                                </div>
                                                <p className="text-muted mb-2" style={{ fontSize: 13 }}>{plan.planDescription}</p>
                                                <small className="text-muted d-block mb-3">Encryption: {plan.encMethod}</small>
                                                {isCurrent ? (
                                                    <button className="btn btn-outline-secondary btn-sm w-100 mt-auto" disabled>Current Plan</button>
                                                ) : (
                                                    <button
                                                        className={`btn btn-${plan.planPrice === 0 ? "outline-secondary" : "primary"} btn-sm w-100 mt-auto`}
                                                        onClick={() => onSubscribe?.(plan)}
                                                    >
                                                        {plan.planPrice === 0 ? "Downgrade" : "Upgrade"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Account Details */}
            <div className="card p-4 mb-4">
                <h6 className="text-muted text-uppercase fw-semibold mb-3" style={{ fontSize: 11, letterSpacing: 1.4 }}>Account Details</h6>
                <div className="row g-2" style={{ fontSize: 14 }}>
                    <div className="col-4 text-muted">User ID</div>
                    <div className="col-8 fw-medium">#{user.userID}</div>
                    <div className="col-4 text-muted">Username</div>
                    <div className="col-8 fw-medium">{editUsername}</div>
                    <div className="col-4 text-muted">Email</div>
                    <div className="col-8 fw-medium">{editEmail}</div>
                    <div className="col-4 text-muted">Role</div>
                    <div className="col-8"><span className="badge bg-secondary text-capitalize">{user.role}</span></div>
                    <div className="col-4 text-muted">Account Status</div>
                    <div className="col-8">
                        {user.isSuspended ? <span className="badge bg-danger">Suspended</span> : <span className="badge bg-success">Active</span>}
                    </div>
                </div>
            </div>

            {/* Suspend account */}
            {!user.isSuspended && (
                <div className="card p-4 border-danger">
                    <h6 className="text-danger text-uppercase fw-semibold mb-1" style={{ fontSize: 11, letterSpacing: 1.4 }}>Suspend my account</h6>
                    <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                        Suspending your account will restrict your access immediately. You can contact support to reactivate it.
                    </p>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setShowSuspendConfirm(true)}>
                        Suspend My Account
                    </button>
                </div>
            )}
        </div>

        {/* Cancel Subscription confirmation prompt */}
        {showCancelSubConfirm && subscription && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }} onClick={() => !cancellingSub && setShowCancelSubConfirm(false)}>
                <div className="card p-4" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
                    <h6 className="mb-1">Cancel Subscription?</h6>
                    <p className="text-muted mb-1" style={{ fontSize: 14 }}>You are about to cancel your <b>{subscription.plan.planTitle}</b> plan.</p>
                    <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                        You will lose access to premium features at the end of your billing period on <b>{new Date(subscription.subscriptionEndDate).toLocaleDateString()}</b>.
                    </p>
                    <div className="d-flex justify-content-end gap-2">
                        <button className="btn btn-outline-secondary" onClick={() => setShowCancelSubConfirm(false)} disabled={cancellingSub}>Keep Subscription</button>
                        <button className="btn btn-danger" onClick={handleCancelSubscription} disabled={cancellingSub}>
                            {cancellingSub ? "Cancelling…" : "Yes, Cancel"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Suspend confirmation prompt */}
        {showSuspendConfirm && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }} onClick={() => !suspending && setShowSuspendConfirm(false)}>
                <div className="card p-4" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
                    <h6 className="mb-1">Suspend Account?</h6>
                    <p className="text-muted mb-1" style={{ fontSize: 14 }}>This will immediately restrict access to your account.</p>
                    <p className="text-muted mb-4" style={{ fontSize: 14 }}>To reactivate, you will need to contact support. Are you sure?</p>
                    <div className="d-flex justify-content-end gap-2">
                        <button className="btn btn-outline-secondary" onClick={() => setShowSuspendConfirm(false)} disabled={suspending}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleSuspend} disabled={suspending}>
                            {suspending ? "Suspending…" : "Yes, Suspend"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default CustomerViewAccount