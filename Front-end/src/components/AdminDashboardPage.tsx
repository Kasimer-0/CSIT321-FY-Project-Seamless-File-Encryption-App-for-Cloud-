import { apiFetch } from "../lib/api"
import { useState, useEffect } from "react"
import type { UserAccount } from "../Type"
import AdminManageAccount from "./AdminManageAccountPage"
import AdminManagePlan from "./AdminManagePlanPage"
import AdminManageSubscription from "./AdminManageSubscriptionPage"
// Reports and logs cover the admin monitoring user stories.
import AdminReportsLogsPage from "./AdminReportsLogsPage"

type DashboardStats = {
    totalUsers: number
    premiumUsers: number
    inactiveUsers: number
}

type AdminDashboardProps = {
    user: UserAccount
    onLogout: () => void
}

// The reports tab follows the existing dashboard layout pattern.
type Tab = "overview" | "users" | "plans" | "subscription" | "reports"

const pageTitles: Record<Tab, string> = {
    overview: "Overview",
    users: "Manage Users",
    plans: "Manage Plans",
    subscription: "Manage Subscription",
    reports: "Reports & Logs"
}

const tabConfig: Record<Tab, { label: string; icon: string }> = {
    overview: { label: "Overview", icon: "SYS" },
    users: { label: "Manage Users", icon: "USR" },
    plans: { label: "Manage Plans", icon: "PLN" },
    subscription: { label: "Manage Subscription", icon: "SUB" },
    reports: { label: "Reports & Logs", icon: "LOG" }
}

function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        premiumUsers: 0,
        inactiveUsers: 0,
    })

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiFetch("/admin/dashboard-stats", {
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
            await apiFetch("/logout", {
                method: "POST",
                credentials: "include"
            })
        } catch (err) {
            console.error("Logout failed")
        }

        onLogout()
    }

    const initials = user.username.slice(0, 2).toUpperCase()

    const tabs: Tab[] = ["overview", "users", "plans", "subscription", "reports"]

    return (
        <div className="dashboard-root">
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand-area">
                    <div className="d-flex align-items-center gap-3">
                        <span className="brand-dot-indicator" aria-hidden="true" />
                        <div>
                            <div className="brand-text-main">ADMIN NODE</div>
                            <div className="brand-text-sub">StealthSync control</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav-container" aria-label="Admin navigation">
                    <div className="sidebar-nav-group">
                        <div className="sidebar-section-tag px-2">Main modules</div>
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                className={`sidebar-nav-item ${activeTab === tab ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                            >
                                <span className="sidebar-nav-icon">{tabConfig[tab].icon}</span>
                                <span>{tabConfig[tab].label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer-profile">
                    <div className="d-flex align-items-center gap-3">
                        <span className="profile-avatar-pill">{initials}</span>
                        <div className="min-w-0">
                            <div className="fw-bold text-truncate">{user.username}</div>
                            <small className="text-info">Admin access</small>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main-viewport">
                <header className="dashboard-top-navbar">
                    <div>
                        <div className="console-kicker">Administrator workspace</div>
                        <h2 className="navbar-active-title">{pageTitles[activeTab]}</h2>
                    </div>

                    <button className="btn-navbar-logout" type="button" onClick={() => setShowLogoutConfirm(true)}>
                        Logout
                    </button>
                </header>

                <div className="dashboard-content-scroll">
                    {activeTab === "overview" && (
                        <>
                            <div className="row g-3 mb-4">
                                {[
                                    {
                                        label: "Total Users",
                                        value: stats.totalUsers,
                                        sub: "Registered accounts",
                                        trend: "All identities indexed"
                                    },
                                    {
                                        label: "Premium",
                                        value: stats.premiumUsers,
                                        sub: "Active subscribers",
                                        trend: "Subscription tier active"
                                    },
                                    {
                                        label: "Inactive",
                                        value: stats.inactiveUsers,
                                        sub: "No activity for 1 year",
                                        trend: "Review queue"
                                    },
                                ].map((stat) => (
                                    <div className="col-12 col-md-4" key={stat.label}>
                                        <div className="metric-card-premium h-100">
                                            <div className="metric-label-text text-uppercase">{stat.label}</div>
                                            <div className="metric-value-text">{stat.value}</div>
                                            <div className="metric-trend-neutral">{stat.sub}</div>
                                            <small className="console-muted">{stat.trend}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <section className="workspace-card-wrapper p-4">
                                <div className="console-kicker mb-2">System activity</div>
                                <h5 className="workspace-section-heading mb-2">Recent Activity</h5>
                                <p className="console-muted mb-0">Activity stream placeholder for the current sprint demo.</p>
                            </section>
                        </>
                    )}

                    {activeTab === "users" && (
                        <section className="workspace-card-wrapper p-4">
                            <AdminManageAccount />
                        </section>
                    )}

                    {activeTab === "plans" && (
                        <section className="workspace-card-wrapper p-4">
                            <AdminManagePlan />
                        </section>
                    )}

                    {activeTab === "subscription" && (
                        <section className="workspace-card-wrapper p-4">
                            <AdminManageSubscription />
                        </section>
                    )}

                    {activeTab === "reports" && (
                        <section className="workspace-card-wrapper p-4">
                            <AdminReportsLogsPage />
                        </section>
                    )}
                </div>
            </main>

            {showLogoutConfirm && (
                <div className="premium-modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="premium-modal-surface" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-accent-strip-alert" />
                        <div className="premium-modal-content">
                            <div className="modal-title-main">End admin session?</div>
                            <p className="modal-description-text">Are you sure you want to logout from this administrator account?</p>
                            <div className="d-flex gap-2 justify-content-end">
                                <button className="btn-modal-dismiss" type="button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                                <button
                                    className="btn-modal-destructive"
                                    type="button"
                                    onClick={() => {
                                        handleLogout()
                                        setShowLogoutConfirm(false)
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
