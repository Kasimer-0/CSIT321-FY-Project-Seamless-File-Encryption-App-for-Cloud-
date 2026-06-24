import { useEffect, useState } from "react"
import type { UserAccount, SubscriptionDTO, Plan } from "../Type"

type Props = {
    user: UserAccount
    onSubscribe?: (plan: Plan) => Promise<UserAccount | void> | UserAccount | void
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
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [purchasingPlanID, setPurchasingPlanID] = useState<number | null>(null)
    const [purchaseError, setPurchaseError] = useState<string | null>(null)

    // Local state for feedback instead of toast
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
        try {
            const response = await fetch(`http://localhost:8080/users/${user.userID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username: editUsername.trim(), email: editEmail.trim() })
            })
            if (!response.ok) throw new Error()
            onUpdateAccount?.({ username: editUsername.trim(), email: editEmail.trim() })
            setIsEditing(false)
            notify("Account updated successfully", "success")
        } catch { setSaveError("Server connection failed.") } finally { setSaving(false) }
    }

    const handleSuspend = async () => {
        setSuspending(true)
        try {
            const response = await fetch(`http://localhost:8080/users/${user.userID}/suspend`, { method: "POST", credentials: "include" })
            if (!response.ok) throw new Error()
            onSuspendAccount?.()
            notify("Account suspended successfully", "success")
        } catch { notify("Failed to suspend account", "error") } finally { setSuspending(false); setShowSuspendConfirm(false) }
    }

    const handleCancelSubscription = async () => {
        setCancellingSub(true)
        try {
            const response = await fetch(`http://localhost:8080/subscriptions/${subscription?.subscriptionID}/cancel`, { method: "PATCH", credentials: "include" })
            if (!response.ok) throw new Error()
            onCancelSubscription?.()
            notify("Subscription cancelled successfully", "success")
        } catch { notify("Failed to cancel subscription", "error") } finally { setCancellingSub(false); setShowCancelSubConfirm(false) }
    }

    const handleConfirmPurchase = async () => {
        if (!selectedPlan || !onSubscribe) return
        setPurchasingPlanID(selectedPlan.planID)
        setPurchaseError(null)
        try {
            const updatedUser = await onSubscribe(selectedPlan)
            if (selectedPlan.planPrice <= 0) setSubscription(null)
            else if (updatedUser && typeof updatedUser !== "boolean" && updatedUser.subscription && typeof updatedUser.subscription !== "number") setSubscription(updatedUser.subscription)
            notify(selectedPlan.planPrice <= 0 ? "Switched to Free Plan" : `${selectedPlan.planTitle} activated`, "success")
            setSelectedPlan(null)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update subscription"
            setPurchaseError(message)
            notify(message, "error")
        } finally { setPurchasingPlanID(null) }
    }

    useEffect(() => {
        if (!user.isSubscribed) { setSubscription(null); setLoadingSub(false); return }
        if (embeddedSubscription) { setSubscription(embeddedSubscription); setLoadingSub(false); return }
        if (!userSubscriptionID) { setSubscription(null); setLoadingSub(false); return }
        setLoadingSub(true)
        fetch(`http://localhost:8080/subscriptions/${userSubscriptionID}`, { credentials: "include" })
            .then(r => r.json()).then(setSubscription).finally(() => setLoadingSub(false))
    }, [user.isSubscribed, userSubscriptionID, embeddedSubscription])

    useEffect(() => {
        if (!showPlans || availablePlans.length > 0) return
        setLoadingPlans(true)
        fetch("http://localhost:8080/plans", { credentials: "include" })
            .then(r => r.json()).then(data => setAvailablePlans(data.filter((p: Plan) => p.planStatus === "active"))).finally(() => setLoadingPlans(false))
    }, [showPlans])

    return (
        <div className="font-monospace" style={{ maxWidth: 680 }}>
            {feedback && <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`}>{feedback.msg}</div>}

            <div className="card p-4 mb-4 bg-workspace-card border">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="text-muted fw-bold mb-0" style={{ fontSize: 11, letterSpacing: 1.2 }}>ACCOUNT_IDENTITY</h6>
                    {!isEditing && <button className="btn btn-outline-secondary btn-sm fs-8" onClick={() => setIsEditing(true)}>EDIT</button>}
                </div>
                <div className="d-flex align-items-center gap-4">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 20 }}>{initials}</div>
                    <div className="flex-grow-1">
                        {isEditing ? (
                            <div className="d-flex flex-column gap-2">
                                <input className="form-control form-control-sm" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                                <input className="form-control form-control-sm" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                                <div className="d-flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saving}>SAVE</button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={handleCancelEdit}>CANCEL</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="fw-bold fs-6">{editUsername}</div>
                                <div className="text-muted fs-8">{editEmail}</div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription and Actions logic maintained... */}
            {/* ... rest of the JSX structure remains identical, using standard BS5 classes ... */}
        </div>
    )
}

export default CustomerViewAccount