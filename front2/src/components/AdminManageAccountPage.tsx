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

            if (!response.ok) throw new Error(`${response.status}`)

            const data = await response.json()
            setUsers(data)
        } catch (err) {
            console.error("Failed to fetch user data", err)
            triggerBanner("Server connection failed", "error")
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

            if (!response.ok) throw new Error(`${response.status}`)

            await fetchUsers()
            setSelectedUser({ ...selectedUser, isSuspended: newStatus })
            triggerBanner(
                newStatus ? "User successfully suspended." : "User successfully unsuspended.", 
                "success"
            )
        } catch (err) {
            console.error("Suspension cancelled", err)
            triggerBanner("Server connection failed", "error")
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
        <div className="p-4 rounded border text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="mb-4">
                <h4 className="fw-semibold text-white m-0 mb-1" style={{ fontSize: "18px", letterSpacing: "-0.01em" }}>Accounts</h4>
                <p className="m-0" style={{ fontSize: "13px", color: "#a1a1aa" }}>Select a profile below to view its details.</p>
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
                        placeholder="Search for users by username or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded border" style={{ borderColor: "#27272a", backgroundColor: "#141417", maxHeight: "620px", overflowY: "auto" }}>
                <table className="table table-dark m-0" style={{ fontSize: "14px", borderCollapse: "separate" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #27272a" }}>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em", width: "25%" }}>Username</th>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em", width: "25%" }}>Email Address</th>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em", width: "25%" }}>User Role</th>
                            <th className="font-monospace text-uppercase fw-semibold px-4 py-3" style={{ color: "#a1a1aa", fontSize: "11px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", letterSpacing: "0.05em", width: "25%" }}>Subscription Tier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5 font-monospace" style={{ color: "#a1a1aa", fontSize: "13px", backgroundColor: "transparent" }}>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" style={{ color: "#06b6d4", width: "14px", height: "14px" }}></span>
                                    Querying User databases...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5 font-monospace" style={{ color: "#a1a1aa", fontSize: "13px", backgroundColor: "transparent" }}>
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            users.map(user => {
                                const isAdminNode = user.role === "admin" || user.username.toLowerCase() === "admin";
                                const badgeText = user.isSubscribed ? "PREMIUM TIER" : "BASE TIER";
                                const badgeColor = user.isSubscribed ? "#10b981" : "#a1a1aa";
                                const bgTheme = user.isSubscribed ? "rgba(16, 185, 129, 0.15)" : "rgba(113, 113, 122, 0.15)";

                                return (
                                    <tr 
                                        key={user.userID} 
                                        onClick={() => handleSelect(user)}
                                        style={{ cursor: "pointer", borderBottom: "1px solid #27272a" }}
                                    >
                                        <td className="px-4 py-3" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                            <div className="fw-semibold text-white" style={{ fontSize: "14px" }}>{user.username}</div>
                                            <div className="font-monospace mt-1" style={{ fontSize: "11px", color: "#71717a" }}>ID: {user.userID}</div>
                                        </td>
                                        <td className="px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            <span className="font-monospace" style={{ fontSize: "13px", color: "#a1a1aa" }}>{user.email}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="text-white" style={{ fontSize: "13px" }}>
                                                    {isAdminNode ? "Admin" : "Customer"}
                                                </span>
                                                {user.isSuspended && (
                                                    <span className="badge font-monospace px-2.5 py-1" style={{ fontSize: "11px", borderRadius: "4px", backgroundColor: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
                                                        SUSPENDED
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle" style={{ backgroundColor: "transparent", borderBottom: "1px solid #27272a" }}>
                                            <div className="d-flex gap-2 justify-content-start align-items-center">
                                                {!isAdminNode ? (
                                                    <span className="badge font-monospace px-2.5 py-1 fw-semibold" style={{ fontSize: "11px", borderRadius: "4px", backgroundColor: bgTheme, color: badgeColor, letterSpacing: "0.02em" }}>
                                                        {badgeText}
                                                    </span>
                                                ) : (
                                                    <span className="font-monospace opacity-50 small" style={{ color: "#71717a" }}>
                                                        --
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AdminManageAccount