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

    // Internal context messaging replacing old toast frameworks
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
                triggerBanner("Failed to execute terminal cancellation handshake.", "error")
                return
            }

            await fetchSubscriptions()

            if (selectedSubscription?.subscriptionID === subscriptionID) {
                setSelectedSubscription(prev => prev
                    ? { ...prev, subcriptionStatus: "cancelled", subscriber: { ...prev.subscriber, isSubscribed: false } }
                    : null
                )
            }

            triggerBanner("Account layer allotment successfully revoked and terminated.", "success")
        } catch (err) {
            triggerBanner("Server dropped connection pool during cancellation routine.", "error")
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
                triggerBanner("Failed to rewrite identity core subscription array.", "error")
                return
            }

            await fetchSubscriptions()
            setSelectedSubscription(updated)
            triggerBanner("Subscription boundaries successfully remmapped.", "success")
        } catch (err) {
            triggerBanner("Database pipeline refused allocation update.", "error")
        }
    }

    // Helper mapping sub statuses onto premium style states
    const getStatusType = (status: string): "success" | "destructive" | "muted" => {
        if (status === "active") return "success"
        if (status === "cancelled") return "destructive"
        return "muted"
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
            <div className="d-flex align-items-center justify-content-between mb-4 gap-3">
                <div className="search-input-wrapper flex-grow-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="search-icon-inline">
                        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        className="form-control console-search-input"
                        placeholder="Search active allotments by target identity, alias matrix, or layer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Premium Notification Banner Anchor */}
            <div className="status-message-container">
                {bannerMessage && (
                    <div className={`status-banner ${bannerType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{bannerMessage}</span>
                    </div>
                )}
            </div>

            <div className="premium-data-table-scroll" style={{ maxHeight: "620px", overflowY: "auto" }}>
                <table className="premium-workspace-table">
                    <thead>
                        <tr>
                            <th>Identity Coordinates</th>
                            <th>Assigned Service Provision</th>
                            <th>Billing Matrix Reference</th>
                            <th className="text-end">Allotment State</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center text-muted py-5 font-monospace fs-7">
                                    <span className="spinner-border spinner-border-sm text-cyan me-2" role="status"></span>
                                    Querying global allocation layers...
                                </td>
                            </tr>
                        ) : subscriptions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-muted py-5 font-monospace fs-7">
                                    No active user subscription nodes found in directory
                                </td>
                            </tr>
                        ) : (
                            subscriptions.map(sub => (
                                <tr key={sub.subscriptionID} onClick={() => handleSelect(sub)}>
                                    <td>
                                        <div className="fw-semibold table-primary-text">{sub.subscriber.username}</div>
                                        <div className="text-muted table-sub-text">{sub.subscriber.email}</div>
                                    </td>
                                    <td>
                                        <span className="fw-medium text-primary-text">{sub.plan.planTitle}</span>
                                    </td>
                                    <td>
                                        <span className="font-monospace text-muted fs-7">SUB_ID_{sub.subscriptionID}</span>
                                    </td>
                                    <td className="text-end">
                                        <span className={`badge-pill-premium ${getStatusType(sub.subcriptionStatus)}`}>
                                            {sub.subcriptionStatus.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default AdminManageSubscription