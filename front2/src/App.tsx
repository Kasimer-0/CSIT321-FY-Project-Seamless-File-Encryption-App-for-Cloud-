import { useState } from "react"
import type { UserAccount } from "./Type"
import Auth from "./components/Auth"
import AdminDashboard from "./components/AdminDashboardPage"
import CustomerDashboard from "./components/CustomerDashboard"

function App() {
    const [user, setUser] = useState<UserAccount | null>(null)

    const handleLogin = (user: UserAccount) => {
        setUser(user)
    }

    const handleLogout = () => {
        setUser(null)
    }

    const handleUserUpdate = (updatedUser: UserAccount) => {
        setUser(updatedUser)
    }

    return (
        <div className="app-container">
            {!user && <Auth onLogin={handleLogin} />}

            {user?.role === "admin" && (
                <AdminDashboard user={user} onLogout={handleLogout} />
            )}

            {user?.role === "customer" && (
                <CustomerDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            )}
        </div>
    )
}

export default App