import { apiFetch } from "../lib/api"
import { useCallback, useState, useEffect } from "react"
import type { SystemLog, UserAccount } from "../Type"
import AdminManageAccount from "./AdminManageAccountPage"
import AdminManagePlan from "./AdminManagePlanPage"
import AdminManageSubscription from "./AdminManageSubscriptionPage"
// Reports and logs cover the admin monitoring user stories.
import AdminReportsLogsPage from "./AdminReportsLogsPage"
import { formatSystemLogTime, newestSystemLogs } from "../admin/recentActivity"

type DashboardStats = {
    totalUsers: number
    premiumUsers: number
    inactiveUsers: number
}

type AdminDashboardProps = {
    user: UserAccount
    onLogout: () => Promise<void> | void
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
    const [reportsInitialView, setReportsInitialView] = useState<"reports" | "logs">("reports")

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        premiumUsers: 0,
        inactiveUsers: 0,
    })
    const [recentLogs, setRecentLogs] = useState<SystemLog[]>([])
    const [recentLogsLoading, setRecentLogsLoading] = useState(true)
    const [recentLogsError, setRecentLogsError] = useState("")

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

    const loadRecentActivity = useCallback(async () => {
        setRecentLogsLoading(true)
        setRecentLogsError("")
        try {
            const response = await apiFetch("/admin/logs", { credentials: "include" })
            if (!response.ok) {
                throw new Error("Unable to load recent activity.")
            }
            const logs = await response.json() as SystemLog[]
            setRecentLogs(newestSystemLogs(logs))
        } catch (error) {
            setRecentLogsError(error instanceof Error ? error.message : "Unable to load recent activity.")
        } finally {
            setRecentLogsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (activeTab === "overview") {
            void loadRecentActivity()
        }
    }, [activeTab, loadRecentActivity])

    const handleLogout = async () => {
        await onLogout()
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
                                onClick={() => {
                                    if (tab === "reports") setReportsInitialView("reports")
                                    setActiveTab(tab)
                                }}
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
                                <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                    <div>
                                        <div className="console-kicker mb-2">System activity</div>
                                        <h5 className="workspace-section-heading mb-0">Recent Activity</h5>
                                    </div>
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        type="button"
                                        onClick={() => {
                                            setReportsInitialView("logs")
                                            setActiveTab("reports")
                                        }}
                                    >
                                        View all logs
                                    </button>
                                </div>

                                {recentLogsLoading && <p className="console-muted mb-0">Loading recent activity...</p>}

                                {!recentLogsLoading && recentLogsError && (
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <p className="text-danger mb-0">{recentLogsError}</p>
                                        <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void loadRecentActivity()}>
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {!recentLogsLoading && !recentLogsError && recentLogs.length === 0 && (
                                    <p className="console-muted mb-0">No system activity has been recorded yet.</p>
                                )}

                                {!recentLogsLoading && !recentLogsError && recentLogs.length > 0 && (
                                    <div className="recent-activity-list">
                                        {recentLogs.map(log => (
                                            <div className="recent-activity-row" key={log.logId}>
                                                <div className="min-w-0">
                                                    <div className="fw-semibold text-truncate">{log.action}</div>
                                                    <div className="console-muted recent-activity-meta">
                                                        {log.username || "Unknown user"}
                                                        {log.provider ? ` | ${log.provider}` : ""}
                                                        {` | ${formatSystemLogTime(log.timestamp)}`}
                                                    </div>
                                                </div>
                                                <span className={`badge ${log.riskLevel === "HIGH" ? "bg-danger" : log.riskLevel === "MEDIUM" ? "bg-warning text-dark" : "bg-success"}`}>
                                                    {log.riskLevel ?? "LOW"} {log.riskScore ?? 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                            <AdminReportsLogsPage initialView={reportsInitialView} />
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
