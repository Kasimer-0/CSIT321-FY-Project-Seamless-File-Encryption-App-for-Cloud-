import { useEffect, useState } from "react"
import type { UserAccount } from "./Type"
import Auth from "./components/Auth"
import AdminDashboard from "./components/AdminDashboardPage"
import CustomerDashboard from "./components/CustomerDashboard"
import { Toaster } from "react-hot-toast"
import { apiFetch, clearAuthToken, getAuthToken } from "./lib/api"
import OAuthCompletionPage from "./components/OAuthCompletionPage"

function App() {
    const [user, setUser] = useState<UserAccount | null>(null)
    const [restoringSession, setRestoringSession] = useState(true)
    const oauthReturnWithoutSession = !getAuthToken()
        && new URLSearchParams(window.location.search).has("oauth")

    // Restore the signed-in account from the saved JWT when the desktop window reloads.
    useEffect(() => {
        if (!getAuthToken()) {
            setRestoringSession(false)
            return
        }

        apiFetch("/me")
            .then(response => {
                if (!response.ok) throw new Error("Session expired")
                return response.json()
            })
            .then((currentUser: UserAccount) => setUser(currentUser))
            .catch(() => clearAuthToken())
            .finally(() => setRestoringSession(false))
    }, [])

    const handleLogin = (authenticatedUser: UserAccount) => {
        setUser(authenticatedUser)
    }

    const handleLogout = async () => {
        try {
            // The server releases this device's active slot before local credentials are removed.
            await apiFetch("/logout", { method: "POST" })
        } finally {
            clearAuthToken()
            setUser(null)
        }
    }

    const handleUserUpdate = (updatedUser: UserAccount) => {
        setUser(updatedUser)
    }

    if (oauthReturnWithoutSession) {
        return <OAuthCompletionPage />
    }

    if (restoringSession) {
        return null
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
