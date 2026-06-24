import { useState, useEffect } from "react"
import type { UserAccount, DashboardStats} from "../Type"
import AdminManageAccount from "./AdminManageAccountPage"
import AdminManagePlan from "./AdminManagePlanPage"
import AdminManageSubscription from "./AdminManageSubscriptionPage"
import AdminReportsLogsPage from "./AdminReportsLogsPage"


type AdminDashboardProps = {
    readonly user: UserAccount
    readonly onLogout: () => void
}

type Tab = "overview" | "users" | "plans" | "subscription" | "reports"

const pageTitles: Record<Tab, string> = {
    overview: "Dashboard",
    users: "Manage Users",
    plans: "Manage Plans",
    subscription: "Manage Subscriptions",
    reports: "Manage Reports"
}


const tabConfig: Record<Tab, { label: string; renderIcon: (color: string) => React.ReactNode }> = {
    overview: { 
        label: "Dashboard", 
        renderIcon: (c) => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>
            </svg>
        )
    },
    users: { 
        label: "Manage Users", 
        renderIcon: (c) => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        )
    },
    plans: { 
        label: "Manage Plans", 
        renderIcon: (c) => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
        )
    },
    subscription: { 
        label: "Manage Subscriptions", 
        renderIcon: (c) => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
        )
    },
    reports: { 
        label: "Manage Reports", 
        renderIcon: (c) => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        )
    }
}

function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        premiumUsers: 0,
        inactiveUsers: 0,
        flaggedLogsCount: 0,
        revenueStream: []
    })
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("http://localhost:8080/admin/dashboard-stats", {
                    credentials: "include"
                })
                if (!res.ok) throw new Error(`${res.status}`)
                const data = await res.json()
                setStats(data)
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err)
            }
        }
        fetchStats()
    }, [])

    const handleLogout = async () => {
        try {
            const res = await fetch("http://localhost:8080/logout", {
                method: "POST",
                credentials: "include"
            })
            if (!res.ok) throw new Error(`${res.status}`)
        } catch (err) {
            console.error("Logout failed", err)
        }
        onLogout()
    }

    const initials = user.username.slice(0, 2).toUpperCase()
    const tabs: Tab[] = ["overview", "users", "plans", "subscription", "reports"]

    return (
        <div className="dashboard-root">
            {/* Sidebar Shell */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand-area">
                    <div className="brand-dot-indicator"></div>
                    <div>
                        <div className="brand-text-main">STEALTH<span>SYNC</span></div>
                    </div>
                </div>

                <nav className="sidebar-nav-container">

                    {tabs.map((tab) => {
                        const isActive = activeTab === tab
                        const strokeColor = isActive ? "#06b6d4" : "#a1a1aa"
                        return (
                            <button
                                key={tab}
                                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                <span className="sidebar-nav-icon">
                                    {tabConfig[tab].renderIcon(strokeColor)}
                                </span>
                                {tabConfig[tab].label}
                            </button>
                        )
                    })}
                </nav>

                {/* User Info Footing Block */}
                <div className="sidebar-footer-profile">
                    <div className="d-flex align-items-center gap-3">
                        <div className="profile-avatar-pill">
                            {initials}
                        </div>
                        <div className="overflow-hidden">
                            <div className="profile-name-string">{user.username}</div>
                            <div className="profile-name-string">{user.userID}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Application Matrix viewport */}
            <main className="dashboard-main-viewport">
                <header className="dashboard-top-navbar">
                    <h1 className="navbar-active-title">{pageTitles[activeTab]}</h1>
                    <button
                        className="btn-navbar-logout"
                        onClick={() => setShowLogoutConfirm(true)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Log Out
                    </button>
                </header>

                <div className="dashboard-content-scroll container-fluid py-4 px-4">
                    {/* View Switcher Core */}
                    {activeTab === "overview" && (
                        <>
                            <div className="row g-4 mb-4">
                                {[
                                    { label: "Registered Users", value: stats.totalUsers, sub: "Total Count of Registered Users", accent: "var(--accent)" },
                                    { label: "Premium Users", value: stats.premiumUsers, sub: "Total Count of Premium Users", accent: "#10b981" },
                                    { label: "Inactive Users", value: stats.inactiveUsers, sub: "Total Count of Users inactive for 365+ days", accent: "#f59e0b" },
                                    { label: "Flagged Logs", value: stats.flaggedLogsCount, sub: "Requires immediate attention", accent: "#f43f5e" }
                                ].map((stat) => (
                                    <div className="col-12 col-md-6 col-xl-3" key={stat.label}>
                                        <div className="metric-card-premium">
                                            <div className="metric-top-row">
                                                <span className="metric-label-text">{stat.label}</span>
                                                <span className="metric-status-dot" style={{ backgroundColor: stat.accent }}></span>
                                            </div>
                                            <div className="metric-huge-number" style={{ color: stat.accent }}>
                                                {stat.value}
                                            </div>
                                            <div className="metric-sub-explanation">{stat.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="row g-4 mt-2">
                                {/* Graph A: Premium Users Allocation */}
                                <div className="col-12 col-xl-5">
                                    <div className="workspace-card-wrapper p-4 d-flex flex-column justify-content-between" style={{ minHeight: "380px" }}>
                                        <div>
                                            <h3 className="workspace-section-heading mb-2 text-white">User Distribution Graph</h3>
                                            <p className="text-light opacity-75 small mb-4">Breakdown of user types across StealthSync.</p>
                                        </div>
                                        
                                        <div className="d-flex align-items-center justify-content-center flex-column py-3 flex-grow-1">
                                            <svg width="200" height="200" viewBox="0 0 36 36" className="mb-4">
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#27272a" strokeWidth="3" />
                                                <circle 
                                                    cx="18" 
                                                    cy="18" 
                                                    r="15.915" 
                                                    fill="none" 
                                                    stroke="#10b981" 
                                                    strokeWidth="3.2" 
                                                    strokeDasharray={`${stats.totalUsers > 0 ? (stats.premiumUsers / stats.totalUsers) * 100 : 0} ${100 - (stats.totalUsers > 0 ? (stats.premiumUsers / stats.totalUsers) * 100 : 0)}`}
                                                    strokeDashoffset="25" 
                                                    strokeLinecap="round"
                                                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                                                />
                                                <text x="18" y="20.5" className="font-monospace" fill="#ffffff" fontSize="7" textAnchor="middle" fontWeight="bold">
                                                    {stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}%
                                                </text>
                                            </svg>
                                            
                                            <div className="w-100 px-3 mt-auto">
                                                <div className="d-flex justify-content-between align-items-center small mb-2 text-light opacity-75">
                                                    <span><span className="d-inline-block me-2 rounded-circle" style={{ width: "8px", height: "8px", backgroundColor: "#10b981" }}></span>Active Premium Users</span>
                                                    <span className="text-white font-monospace fw-bold">{stats.premiumUsers}</span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center small text-light opacity-75">
                                                    <span><span className="d-inline-block me-2 rounded-circle" style={{ width: "8px", height: "8px", backgroundColor: "#27272a" }}></span>Standard Tier Accounts</span>
                                                    <span className="text-white font-monospace fw-bold">{stats.totalUsers - stats.premiumUsers}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Graph B: Live Backend Revenue Stream Bar Chart */}
                                <div className="col-12 col-xl-7">
                                    <div className="workspace-card-wrapper p-4 d-flex flex-column justify-content-between" style={{ minHeight: "380px" }}>
                                        <div>
                                            <h3 className="workspace-section-heading mb-2 text-white">Annual Revenue Metrics</h3>
                                            <p className="text-light opacity-75 small mb-4">Calculated Gross Valuation for the current year.</p>
                                        </div>
                                        
                                        <div className="d-flex align-items-end justify-content-between pt-4 px-2 flex-grow-1" style={{ height: "240px", borderBottom: "1px solid #27272a" }}>
                                            {stats.revenueStream && stats.revenueStream.length > 0 ? (
                                                stats.revenueStream.map((item) => {
                                                    const maxRevenue = Math.max(...stats.revenueStream.map(i => i.revenue), 1000);
                                                    const percentageHeight = (item.revenue / maxRevenue) * 180;
                                                    
                                                    return (
                                                        <div key={item.month} className="d-flex flex-column align-items-center flex-grow-1" style={{ maxWidth: "55px" }}>
                                                            <div className="font-monospace mb-2 text-center fw-bold" style={{ fontSize: "10px", color: "#06b6d4" }}>
                                                                ${item.revenue >= 1000 ? `${(item.revenue / 1000).toFixed(1)}k` : item.revenue}
                                                            </div>
                                                            <div 
                                                                className="w-50 rounded-top" 
                                                                style={{ 
                                                                    height: `${Math.max(percentageHeight, 4)}px`,
                                                                    backgroundColor: "var(--accent, #06b6d4)",
                                                                    boxShadow: "0 0 12px rgba(6, 182, 212, 0.2)",
                                                                    transition: "height 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                                                                }}
                                                            ></div>
                                                            <div className="text-light opacity-50 font-monospace mt-2 small fw-bold">{item.month}</div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="w-100 text-center text-muted font-monospace py-5">
                                                    Data Unavailable.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "users" && <div className="workspace-card-wrapper p-4"><AdminManageAccount /></div>}
                    {activeTab === "plans" && <div className="workspace-card-wrapper p-4"><AdminManagePlan /></div>}
                    {activeTab === "subscription" && <div className="workspace-card-wrapper p-4"><AdminManageSubscription /></div>}
                    {activeTab === "reports" && <div className="workspace-card-wrapper p-4"><AdminReportsLogsPage /></div>}
                </div>
            </main>

            {/* Premium Overlay Context Modal */}
            {showLogoutConfirm && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => setShowLogoutConfirm(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setShowLogoutConfirm(false);
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert"></div>
                        {/* Added id matching the aria-labelledby parent property above */}
                        <h4 id="logout-modal-heading" className="modal-title-main">Confirm Logout?</h4>
                        <p className="modal-description-text">
                            Opening StealthSync next time will require you to Log In again.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => setShowLogoutConfirm(false)}>
                                Cancel
                            </button>
                            <button 
                                className="btn-modal-destructive" 
                                onClick={() => {
                                    handleLogout()
                                    setShowLogoutConfirm(false)
                                }}
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default AdminDashboard