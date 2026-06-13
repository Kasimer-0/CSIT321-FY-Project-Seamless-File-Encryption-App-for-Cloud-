import { useState, useEffect } from "react"
import type { UserAccount } from "../Type"
import AdminManageAccount from "./AdminManageAccountPage"
import AdminManagePlan from "./AdminManagePlanPage"
import AdminManageTicket from "./AdminManageTicketPage"
import AdminManageSubscription from "./AdminManageSubscriptionPage"
// Codex integration note: reports/logs were added to cover the admin monitoring user stories.
import AdminReportsLogsPage from "./AdminReportsLogsPage"

type DashboardStats = {
    totalUsers: number
    premiumUsers: number
    inactiveUsers: number
    openTickets: number
}

type AdminDashboardProps = {
    user: UserAccount
    onLogout: () => void
}

// The reports tab extends the teammate's original dashboard without changing its layout pattern.
type Tab = "overview" | "users" | "plans" | "tickets" | "subscription" | "reports"

const pageTitles: Record<Tab, string> = {
    overview: "Overview",
    users: "Manage Users",
    plans: "Manage Plans",
    tickets: "Manage Tickets",
    subscription: "Manage Subscription",
    reports: "Reports & Logs"
}

const tabConfig: Record<Tab, { label: string; icon: string }> = {
    overview: { label: "Overview", icon: "📊" },
    users: { label: "Manage Users", icon: "👥" },
    plans: { label: "Manage Plans", icon: "💳" },
    tickets: { label: "Manage Tickets", icon: "🎫" },
    subscription: { label: "Manage Subscription", icon: "" },
    reports: { label: "Reports & Logs", icon: "" }
}

function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        premiumUsers: 0,
        inactiveUsers: 0,
        openTickets: 0,
    })

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("http://localhost:8080/admin/dashboard-stats", {
                    credentials: "include"
                })

                const data = await res.json()
                setStats(data)

            } catch (err) {
                console.error("Failed to fetch dashboard stats")
            }
        }

        fetchStats()
    }, [])

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:8080/logout", {
                method: "POST",
                credentials: "include"
            })
        } catch (err) {
            console.error("Logout failed")
        }

        onLogout()
    }

    const initials = user.username.slice(0, 2).toUpperCase()

    const tabs: Tab[] = ["overview", "users", "plans", "tickets", "subscription", "reports"]

    return (
        <div className="d-flex vh-100 overflow-hidden">

            {/*Sidebar*/}
            <aside className="d-flex flex-column flex-shrink-0 bg-white border-end" style={{ width: 220 }}>

                <div className="px-3 py-3 border-bottom">
                    <h5 className="mb-0 fw-bold text-primary">Admin</h5>
                    <small className="text-muted">Dashboard</small>
                </div>

                <nav className="flex-grow-1 p-2">
                    <small className="text-muted px-2">MAIN</small>

                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className={`btn w-100 text-start mb-1 mt-1 ${
                                activeTab === tab
                                    ? "btn-primary"
                                    : "btn-outline-light text-dark"
                            }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            <span className="me-2">
                                {tabConfig[tab].icon}
                            </span>
                            {tabConfig[tab].label}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-top">
                    <div className="d-flex align-items-center gap-2">
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-primary text-white fw-bold"
                            style={{ width: 36, height: 36, fontSize: 13 }}
                        >
                            {initials}
                        </div>
                        <div>
                            <div className="fw-medium" style={{ fontSize: 13 }}>
                                {user.username}
                            </div>
                            <small className="text-primary">Admin</small>
                        </div>
                    </div>
                </div>
            </aside>

            {/* main */}
            <main className="d-flex flex-column flex-grow-1 overflow-hidden bg-light">

                <div className="d-flex align-items-center gap-3 px-4 bg-white border-bottom"
                    style={{ height: 56, flexShrink: 0 }}>
                    <div className="flex-grow-1 fw-semibold">
                        {pageTitles[activeTab]}
                    </div>

                    <button
                        className="btn btn-outline-danger"
                        onClick={() => setShowLogoutConfirm(true)}
                    >
                        🚪 Logout
                    </button>
                </div>

                <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>

                    {/*overview */}
                    {activeTab === "overview" && (
                        <>
                            <div className="row g-3 mb-4">
                                {[
                                    {
                                        label: "Total Users",
                                        value: stats.totalUsers,
                                        sub: "Registered accounts",
                                        color: "text-primary"
                                    },
                                    {
                                        label: "Premium",
                                        value: stats.premiumUsers,
                                        sub: "Active subscribers",
                                        color: "text-success"
                                    },
                                    {
                                        label: "Inactive",
                                        value: stats.inactiveUsers,
                                        sub: "No activity for 1 year",
                                        color: "text-warning"
                                    },
                                    {
                                        label: "Tickets opened",
                                        value: stats.openTickets,
                                        sub: "Needs review",
                                        color: "text-danger"
                                    },
                                ].map((stat) => (
                                    <div className="col-3" key={stat.label}>
                                        <div className="card p-3">
                                            <small className="text-muted text-uppercase">
                                                {stat.label}
                                            </small>
                                            <div className={`fs-3 fw-bold ${stat.color}`}>
                                                {stat.value}
                                            </div>
                                            <small className="text-muted">
                                                {stat.sub}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card p-4">
                                <h6 className="text-muted text-uppercase mb-3">
                                    Recent Activity
                                </h6>
                                <p className="text-muted mb-0">.....</p>
                            </div>
                        </>
                    )}

                    {/* manage users */}
                    {activeTab === "users" && (
                        <div className="card p-4">
                            <AdminManageAccount />
                        </div>
                    )}

                    {/* manage plan */}
                    {activeTab === "plans" && (
                        <div className="card p-4">
                            <AdminManagePlan />
                        </div>
                    )}

                    {/* manage ticket*/}
                    {activeTab === "tickets" && (
                        <div className="card p-4">
                            <AdminManageTicket currentUser={user} />
                        </div>
                    )}

                    {/* manage subscription*/}
                    {activeTab === "subscription" && (
                        <div className="card p-4">
                            <AdminManageSubscription />
                        </div>
                    )}

                    {activeTab === "reports" && (
                        <div className="card p-4">
                            <AdminReportsLogsPage />
                        </div>
                    )}

                </div>
            </main>

            {/*confirmation prompt for logout*/}
            {showLogoutConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div
                        className="card p-4"
                        style={{ width: 360 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h6 className="mb-2">Logout?</h6>

                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            Are you sure you want to logout from your account?
                        </p>

                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-danger"
                                onClick={() => {
                                    handleLogout()
                                    setShowLogoutConfirm(false)
                                }}
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
