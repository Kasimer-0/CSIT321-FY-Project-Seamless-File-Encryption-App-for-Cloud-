import { useState, useEffect } from "react"
import type { UserAccount } from "../Entity"
import AdminManageAccount from "./AdminManageAccountPage"
import AdminManagePlan from "./AdminManagePlanPage"
import AdminManageTicket from "./AdminManageTicketPage"

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

type Tab = "overview" | "users" | "plans" | "tickets"

const pageTitles: Record<Tab, string> = {
    overview: "Overview",
    users: "Manage Users",
    plans: "Manage Plans",
    tickets: "Manage Tickets",
}

function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        premiumUsers: 0,
        inactiveUsers: 0,
        openTickets: 0,
    })

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

    return (
        <div className="d-flex vh-100 overflow-hidden">

            <aside className="d-flex flex-column flex-shrink-0 bg-white border-end" style={{ width: 220 }}>

                <div className="px-3 py-3 border-bottom">
                    <h5 className="mb-0 fw-bold text-primary">Admin</h5>
                    <small className="text-muted">Dashboard</small>
                </div>

                <nav className="flex-grow-1 p-2">
                    <small className="text-muted px-2">MAIN</small>

                    {(["overview", "users", "plans", "tickets"] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            className={`btn w-100 text-start mb-1 mt-1 ${activeTab === tab ? "btn-primary" : "btn-outline-light text-dark"}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            <span className="me-2">
                                {{ overview: "📊", users: "👥", plans: "💳", tickets: "🎫" }[tab]}
                            </span>
                            {pageTitles[tab]}
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
                            <div className="fw-medium" style={{ fontSize: 13 }}>{user.username}</div>
                            <small className="text-primary">Admin</small>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="d-flex flex-column flex-grow-1 overflow-hidden bg-light">

                <div className="d-flex align-items-center gap-3 px-4 bg-white border-bottom" style={{ height: 56, flexShrink: 0 }}>
                    <div className="flex-grow-1 fw-semibold">{pageTitles[activeTab]}</div>


                <button className="btn btn-outline-danger" onClick={handleLogout}>
                        🚪 Logout
                </button>
                </div>

                <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>

                    {activeTab === "overview" && (
                        <>
                            <div className="row g-3 mb-4">
                        {[
                            { label: "Total Users", value: stats.totalUsers, sub: "Registered accounts", color: "text-primary" },
                            { label: "Premium", value: stats.premiumUsers, sub: "Active subscribers", color: "text-success" },
                            { label: "Inactive", value: stats.inactiveUsers, sub: "No activity for 1 year", color: "text-warning" },
                            { label: "Tickets opened", value: stats.openTickets, sub: "Needs review", color: "text-danger" },
                            ].map((stat) => (
                                    <div className="col-3" key={stat.label}>
                                        <div className="card p-3">
                                            <small className="text-muted text-uppercase">{stat.label}</small>
                                            <div className={`fs-3 fw-bold ${stat.color}`}>{stat.value}</div>
                                            <small className="text-muted">{stat.sub}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card p-4">
                                <h6 className="text-muted text-uppercase mb-3">Recent Activity</h6>
                                <p className="text-muted mb-0">.....</p>
                            </div>
                        </>
                    )}

                    {activeTab === "users" && (
                        <div className="card p-4">
                            <AdminManageAccount/>

                        </div>
                    )}

                    {activeTab === "plans" && (
                        <div className="card p-4">
                            <AdminManagePlan/>
                        </div>
                    )}

                    {activeTab === "tickets" && (
                        <div className="card p-4">
                            <AdminManageTicket currentUser={user}/>
                        </div>
                    )}

                </div>
            </main>
        </div>
    )
}

export default AdminDashboard