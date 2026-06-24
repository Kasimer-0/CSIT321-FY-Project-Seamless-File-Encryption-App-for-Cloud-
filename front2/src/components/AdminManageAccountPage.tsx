import { useState, useEffect } from "react"
import type { UserAccountDTO } from "../Type"
import AdminViewAccount from "./AdminViewAccountPage"

function AdminManageAccount() {
    const [users, setUsers] = useState<UserAccountDTO[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedUser, setSelectedUser] = useState<UserAccountDTO | null>(null)
    const [search, setSearch] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)
    
    // Internal status state to replace react-hot-toast banners cleanly
    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.append("search", search)

            const response = await fetch(
                `http://localhost:8080/users?${params.toString()}`,
                { credentials: "include" }
            )

            if (!response.ok) {
                console.error("Failed to fetch users")
                return
            }

            const data = await response.json()
            setUsers(data)
        } catch (err) {
            console.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchUsers, 400)
        return () => clearTimeout(timer)
    }, [search])

    const handleSelect = (user: UserAccountDTO) => {
        setSelectedUser(user)
        setView("detail")
    }

    const handleBack = () => {
        setView("list")
        setSelectedUser(null)
        fetchUsers()
    }

    const handleToggleSuspend = async () => {
        if (!selectedUser) return
        const newStatus = !selectedUser.isSuspended

        try {
            const response = await fetch(
                `http://localhost:8080/users/${selectedUser.userID}/suspend`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ isSuspended: newStatus })
                }
            )

            if (!response.ok) {
                triggerBanner("Failed to modify operational suspension status", "error")
                return
            }

            await fetchUsers()
            setSelectedUser({ ...selectedUser, isSuspended: newStatus })
            triggerBanner(
                newStatus ? "Identity successfully suspended from environment" : "Identity operational clearance restored", 
                "success"
            )
        } catch (err) {
            triggerBanner("Server network handshake verification failed", "error")
        } finally {
            setShowConfirm(false)
        }
    }

    if (view === "detail" && selectedUser) {
        return (
            <AdminViewAccount
                user={selectedUser}
                onBack={handleBack}
                onToggleSuspend={handleToggleSuspend}
                showConfirm={showConfirm}
                setShowConfirm={setShowConfirm}
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
                        placeholder="Search system nodes by identity or email matrix..."
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
                            <th>Email Parameter</th>
                            <th className="text-end">Status Flags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="text-center text-muted py-5 font-monospace fs-7">
                                    <span className="spinner-border spinner-border-sm text-cyan me-2" role="status"></span>
                                    Querying ledger databases...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center text-muted py-5 font-monospace fs-7">
                                    No records returned within active directory
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.userID} onClick={() => handleSelect(user)}>
                                    <td>
                                        <div className="fw-semibold table-primary-text">{user.username}</div>
                                        <div className="text-muted table-sub-text">ID: {user.userID}</div>
                                    </td>
                                    <td>
                                        <span className="font-monospace text-muted fs-7">{user.email}</span>
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex gap-2 justify-content-end align-items-center">
                                            <span className={`badge-pill-premium ${user.isSubscribed ? "success" : "muted"}`}>
                                                {user.isSubscribed ? "PREMIUM_NODE" : "BASE_NODE"}
                                            </span>
                                            {user.isSuspended && (
                                                <span className="badge-pill-premium destructive">
                                                    SUSPENDED
                                                </span>
                                            )}
                                        </div>
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

export default AdminManageAccount