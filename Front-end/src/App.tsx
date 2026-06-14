import { useState } from "react"
import type { UserAccount } from "./Type"
import Auth from "./components/Auth"
import AdminDashboard from "./components/AdminDashboardPage"
import CustomerDashboard from "./components/CustomerDashboard"
import { Toaster } from "react-hot-toast"

function App() {
    const [user, setUser] = useState<UserAccount | null>(null)

    const handleLogin = (user: UserAccount) => {
        setUser(user)
    }

    const handleLogout = () => {
        setUser(null)
    }

    // Keep the authenticated user object in the app root.
    // Purchase and security APIs return updated account data, so the dashboard can refresh without another login.
    const handleUserUpdate = (updatedUser: UserAccount) => {
        setUser(updatedUser)
    }

    return (
        <>
            <Toaster position="top-center" />

            {!user && <Auth onLogin={handleLogin} />}

            {user?.role === "admin" && (
                <AdminDashboard user={user} onLogout={handleLogout} />
            )}

            {user?.role === "customer" && (
                <CustomerDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            )}
        </>
    )
}

export default App
