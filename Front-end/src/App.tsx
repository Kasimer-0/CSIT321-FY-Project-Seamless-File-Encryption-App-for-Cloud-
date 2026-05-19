import { useState } from "react"
import type { UserAccount } from "./Entity"
import Auth from "./components/Auth"
import AdminDashboard from "./components/AdminDashboardPage"
import CustomerDashboard from "./components/CustomerDashboard"

function App() {
    const [user, setUser] = useState<UserAccount | null>(null)

    const handleLogin = (user: UserAccount) => {
        setUser(user)
    }

    const handleLogout = () => {
        setUser(null) // 
    }

    if (!user) return <Auth onLogin={handleLogin} />


    if (user.role === "admin") return <AdminDashboard user={user} onLogout={handleLogout} />
    if (user.role === "customer") return <CustomerDashboard user={user} onLogout={handleLogout} />
}

export default App