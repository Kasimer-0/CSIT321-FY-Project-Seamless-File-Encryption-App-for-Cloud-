import { apiFetch } from "../lib/api"
import { useState, useEffect } from "react"
import type { SubscriptionDTO, Plan } from "../Type"
import AdminViewSubscription from "./AdminViewSubscriptionPage"
import toast from "react-hot-toast"

function AdminManageSubscription() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([])
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDTO | null>(null)
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    const fetchSubscriptions = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams()
            if (search) params.append("search", search)

            const response = await apiFetch(
                `http://localhost:8080/subscriptions?${params.toString()}`,
                { credentials: "include" }
            )

            if (!response.ok) {
                console.error("Failed to fetch subscriptions")
                return
            }

            const data = await response.json()
            setSubscriptions(data)

        } catch (err) {
            console.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    const fetchAvailablePlans = async () => {
        try {
            const response = await apiFetch("http://localhost:8080/plans", {
                credentials: "include"
            })

            if (!response.ok) {
                console.error("Failed to fetch plans")
                return
            }

            const data = await response.json()
            setAvailablePlans(data.filter((p: Plan) => p.planStatus === "active"))

        } catch (err) {
            console.error("Server connection failed")
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchSubscriptions, 400)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        fetchAvailablePlans()
    }, [])

    const handleSelect = (subscription: SubscriptionDTO) => {
        setSelectedSubscription(subscription)
        setView("detail")
    }

    const handleBack = () => {
        setView("list")
        setSelectedSubscription(null)
        fetchSubscriptions()
    }

    const handleCancel = async (subscriptionID: number) => {
        try {
            const response = await apiFetch(
                `http://localhost:8080/subscriptions/${subscriptionID}/cancel`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                }
            )

            if (!response.ok) {
                toast.error("Failed to cancel subscription")
                return
            }

            await fetchSubscriptions()

            if (selectedSubscription?.subscriptionID === subscriptionID) {
                setSelectedSubscription(prev => prev
                    ? { ...prev, subcriptionStatus: "cancelled", subscriber: { ...prev.subscriber, isSubscribed: false } }
                    : null
                )
            }

            toast.success("Subscription cancelled successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleEdit = async (updated: SubscriptionDTO) => {
        try {
            const response = await apiFetch(
                `http://localhost:8080/subscriptions/${updated.subscriptionID}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(updated)
                }
            )

            if (!response.ok) {
                toast.error("Failed to update subscription")
                return
            }

            await fetchSubscriptions()
            setSelectedSubscription(updated)
            toast.success("Subscription updated successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    if (view === "detail" && selectedSubscription) {
        return (
            <AdminViewSubscription
                subscription={selectedSubscription}
                availablePlans={availablePlans}
                onBack={handleBack}
                onCancel={handleCancel}
                onEdit={handleEdit}
            />
        )
    }

    return (
        <>
            <input
                className="form-control mb-3"
                placeholder="Search by username, email or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <ul className="list-group" style={{ maxHeight: 620, overflowY: "auto" }}>
                {loading ? (
                    <li className="list-group-item text-center text-muted">Loading...</li>
                ) : subscriptions.length === 0 ? (
                    <li className="list-group-item text-muted text-center">No subscriptions found</li>
                ) : (
                    subscriptions.map(sub => (
                        <li
                            key={sub.subscriptionID}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelect(sub)}
                        >
                            <div>
                                <div className="fw-medium">{sub.subscriber.username}</div>
                                <small className="text-muted">
                                    {sub.subscriber.email} · {sub.plan.planTitle}
                                </small>
                            </div>
                            <span className={`badge ${
                                sub.subcriptionStatus === "active" ? "bg-success" :
                                sub.subcriptionStatus === "cancelled" ? "bg-danger" :
                                sub.subcriptionStatus === "expired" ? "bg-secondary" : "bg-warning text-dark"
                            }`}>
                                {sub.subcriptionStatus}
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </>
    )
}

export default AdminManageSubscription