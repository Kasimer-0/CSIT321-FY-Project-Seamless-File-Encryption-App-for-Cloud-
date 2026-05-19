import { useState, useEffect } from "react"
import type { UserAccount } from "../Entity"
import AdminViewAccount from "./AdminViewAccountPage"

function AdminManageAccount() {
    const [users, setUsers] = useState<UserAccount[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
    const [search, setSearch] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)

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

    const handleSelect = (user: UserAccount) => {
        setSelectedUser(user)
        setView("detail")
    }

    const handleBack = () => {
        setView("list")
        setSelectedUser(null)
        fetchUsers() // refresh list
    }

    const handleToggleSuspend = async () => {
        if (!selectedUser) return

        const newStatus = !selectedUser.isSuspended

        try {
            const response = await fetch(
                `http://localhost:8080/users/${selectedUser.id}/suspend`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        isSuspended: newStatus
                    })
                }
            )

            if (!response.ok) {
                console.error("Failed to update suspension status")
                return
            }

            // refresh from backend instead of local update
            await fetchUsers()

            setSelectedUser({
                ...selectedUser,
                isSuspended: newStatus
            })

        } catch (err) {
            console.error("Server connection failed")
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
                            key={user.id}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelect(user)}
                        >
                            <div>
                                <div className="fw-medium">{user.username}</div>
                                <small className="text-muted">{user.email}</small>
                            </div>
                            <div className="d-flex gap-2">
                                <span className={`badge ${user.isPremium ? "bg-success" : "bg-secondary"}`}>
                                    {user.isPremium ? "Premium" : "Free"}
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