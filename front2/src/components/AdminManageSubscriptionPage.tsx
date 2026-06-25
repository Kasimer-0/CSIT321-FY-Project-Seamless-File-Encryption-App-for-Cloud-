import { useState, useEffect } from "react"
import type { SubscriptionDTO, Plan } from "../Type"
import AdminViewSubscription from "./AdminViewSubscriptionPage"

function AdminManageSubscription() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([])
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDTO | null>(null)
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchSubscriptions = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.append("search", search)

            const response = await fetch(
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
            const response = await fetch("http://localhost:8080/plans", {
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
            const response = await fetch(
                `http://localhost:8080/subscriptions/${subscriptionID}/cancel`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                }
            )

            if (!response.ok) {
                triggerBanner("Server connection failed.", "error")
                return
            }

            await fetchSubscriptions()

            if (selectedSubscription?.subscriptionID === subscriptionID) {
                setSelectedSubscription(prev => prev
                    ? { ...prev, subcriptionStatus: "cancelled", subscriber: { ...prev.subscriber, isSubscribed: false } }
                    : null
                )
            }

            triggerBanner("Subscription cancelled successfully.", "success")
        } catch (err) {
            triggerBanner("Server connection failed.", "error")
        }
    }

    const handleEdit = async (updated: SubscriptionDTO) => {
        try {
            const response = await fetch(
                `http://localhost:8080/subscriptions/${updated.subscriptionID}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(updated)
                }
            )

            if (!response.ok) {
                triggerBanner("Server connection failed.", "error")
                return
            }

            await fetchSubscriptions()
            setSelectedSubscription(updated)
            triggerBanner("Subscription updated successfully.", "success")
        } catch (err) {
            triggerBanner("Server connection failed.", "error")
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
        <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="mb-4">
                <h4 className="fw-semibold text-white m-0 mb-1" style={{ fontSize: "18px", letterSpacing: "-0.01em" }}>Subscriptions</h4>
                <p className="m-0" style={{ fontSize: "13px", color: "#a1a1aa" }}>Select a subscription below to view its details.</p>
            </div>

            {bannerMessage && (
                <div className="mb-4 p-3 rounded d-flex align-items-center gap-2" style={{
                    backgroundColor: bannerType === "error" ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)",
                    border: `1px solid ${bannerType === "error" ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                }}>
                    <span className="rounded-circle d-inline-block" style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: bannerType === "error" ? "#f43f5e" : "#10b981"
                    }}></span>
                    <span style={{ fontSize: "13px", color: bannerType === "error" ? "#f43f5e" : "#10b981", fontWeight: 500 }}>
                        {bannerMessage}
                    </span>
                </div>
            )}

            <div className="p-3 mb-4 rounded d-flex justify-content-between align-items-center" style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}>
                <div className="position-relative style-search-container" style={{ width: "480px" }}>
                    <span className="position-absolute top-50 translate-middle-y start-0 ps-3 d-flex align-items-center" style={{ pointerEvents: "none" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </span>
                    <input
                        className="form-control text-white border-0 bg-transparent w-100"
                        style={{ 
                            paddingLeft: "36px", 
                            paddingRight: "12px",
                            fontSize: "14px",
                            boxShadow: "none"
                        }}
                        placeholder="Search subscriptions by username, userID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded border" style={{ borderColor: "#27272a", backgroundColor: "#141417", maxHeight: "620px", overflowY: "auto" }}>
                <table className="table table-dark m-0" style={{ fontSize: "14px", borderCollapse: "separate" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #27272a" }}>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em" }}>Username</th>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em" }}>Subscribed Plan Tier</th>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em" }}>Subscription ID Reference</th>
                            <th className="font-monospace text-uppercase fw-semibold text-end px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em" }}>Subscription Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5 font-monospace" style={{ color: "#a1a1aa", fontSize: "13px", backgroundColor: "transparent" }}>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" style={{ color: "#06b6d4", width: "14px", height: "14px" }}></span>
                                    Querying Subscriptions...
                                </td>
                            </tr>
                        ) : subscriptions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5 font-monospace" style={{ color: "#a1a1aa", fontSize: "13px", backgroundColor: "transparent" }}>
                                    No subscription found in directory
                                </td>
                            </tr>
                        ) : (
                            subscriptions.map(sub => (
                                <tr 
                                    key={sub.subscriptionID} 
                                    onClick={() => handleSelect(sub)}
                                    style={{ cursor: "pointer", borderBottom: "1px solid #27272a" }}
                                >
                                    <td className="px-4 py-3" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                        <div className="fw-semibold text-white" style={{ fontSize: "14px" }}>{sub.subscriber.username}</div>
                                        <div style={{ fontSize: "12px", color: "#71717a", marginTop: "2px" }}>{sub.subscriber.email}</div>
                                    </td>
                                    <td className="px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                        <span className="fw-medium" style={{ color: "#e4e4e7" }}>{sub.plan.planTitle}</span>
                                    </td>
                                    <td className="px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                        <span className="font-monospace" style={{ color: "#71717a", fontSize: "13px" }}>{sub.subscriptionID}</span>
                                    </td>
                                    <td className="text-end px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                        <span className="badge px-2.5 py-1 fw-semibold" style={{
                                            fontSize: "11px",
                                            borderRadius: "4px",
                                            letterSpacing: "0.02em",
                                            backgroundColor: sub.subcriptionStatus === "active" 
                                                ? "rgba(16, 185, 129, 0.15)" 
                                                : sub.subcriptionStatus === "cancelled" 
                                                    ? "rgba(244, 63, 94, 0.15)" 
                                                    : "rgba(113, 113, 122, 0.15)",
                                            color: sub.subcriptionStatus === "active" 
                                                ? "#10b981" 
                                                : sub.subcriptionStatus === "cancelled" 
                                                    ? "#f43f5e" 
                                                    : "#a1a1aa"
                                        }}>
                                            {sub.subcriptionStatus.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AdminManageSubscription