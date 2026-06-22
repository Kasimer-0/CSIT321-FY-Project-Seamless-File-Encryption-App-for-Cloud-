import { apiFetch } from "../lib/api"
import { useState, useEffect } from "react"
import type { UserAccountDTO } from "../Type"
import AdminViewAccount from "./AdminViewAccountPage"
import toast from "react-hot-toast"

function AdminManageAccount() {
    const [users, setUsers] = useState<UserAccountDTO[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedUser, setSelectedUser] = useState<UserAccountDTO | null>(null)
    const [search, setSearch] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchUsers = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams()
            if (search) params.append("search", search)

            const response = await apiFetch(
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
            const response = await apiFetch(
                `http://localhost:8080/users/${selectedUser.userID}/suspend`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ isSuspended: newStatus })
                }
            )

            if (!response.ok) {
                toast.error("Failed to update suspension status")
                return
            }

            await fetchUsers()
            setSelectedUser({ ...selectedUser, isSuspended: newStatus })
            toast.success(newStatus ? "Account suspended successfully" : "Account unsuspended successfully")

        } catch (err) {
            toast.error("Server connection failed")
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
            <input
                className="form-control mb-3"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <ul className="list-group" style={{ maxHeight: 620, overflowY: "auto" }}>
                {loading ? (
                    <li className="list-group-item text-center text-muted">
                        Loading...
                    </li>
                ) : users.length === 0 ? (
                    <li className="list-group-item text-muted text-center">
                        No users found
                    </li>
                ) : (
                    users.map(user => (
                        <li
                            key={user.userID}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelect(user)}
                        >
                            <div>
                                <div className="fw-medium">{user.username}</div>
                                <small className="text-muted">{user.email}</small>
                            </div>
                            <div className="d-flex gap-2">
                                <span className={`badge ${user.isSubscribed ? "bg-success" : "bg-secondary"}`}>
                                    {user.isSubscribed ? "Subscribed" : "Unsubscribed"}
                                </span>
                                {user.isSuspended && (
                                    <span className="badge bg-danger">Suspended</span>
                                )}
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </>
    )
}

export default AdminManageAccount