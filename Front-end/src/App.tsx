import { useState } from "react"
import type { UserAccount } from "./Type"
import Auth from "./components/Auth"
import AdminDashboard from "./components/AdminDashboard"
import CustomerDashboard from "./components/CustomerDashboard"
import CustomerEncryptFilePage from "./components/CustomerEncryptFilePage"
import CustomerDecryptFile from "./components/CustomerDecryptFilePage"
import CustomerManageEncryptionKeys from "./components/CustomerManageEncKeysPage"
import CustomerManageCloudAccLinks from "./components/CustomerManageCloudAccLinksPage"
import CustomerManageRecPhrase from "./components/CustomerManageRecPhrasePage"
import CustomerFAQPage from "./components/CustomerFAQPage"
import CustomerViewAccount from "./components/CustomerViewAccountPage"
import CustomerManagePTokens from "./components/CustomerManagePTokensPage"

function App() {
    const [user, setUser] = useState<UserAccount | null>(null)
    const [activeTab, setActiveTab] = useState<string>("encrypt-file")

    const handleLogin = (loggedInUser: UserAccount) => {
        setUser(loggedInUser)
        setActiveTab("encrypt-decrypt")
    }

    const handleLogout = () => {
        setUser(null)
    }

    const handleUserUpdate = (updatedUser: UserAccount) => {
        setUser(updatedUser)
    }

    const renderCustomerDashboardContent = () => {
        if (!user) return null

        switch (activeTab) {
            case "encrypt-file":
                return <CustomerEncryptFilePage user={user} />
            case "decrypt-file":
                return <CustomerDecryptFile user={user} />
            case "encryption-keys":
                return <CustomerManageEncryptionKeys user={user} />
            case "cloud-storage":
                return <CustomerManageCloudAccLinks user={user} />
            case "physical-tokens":
                return <CustomerManagePTokens user={user} />
            case "recovery-phrases":
                return <CustomerManageRecPhrase user={user} />
            case "faq":
                return <CustomerFAQPage user={user} />
            case "view-account":
                return <CustomerViewAccount user={user} onUserUpdate={handleUserUpdate} />

            // Safe fallback defaults for unlinked tabs or views under development
            case "view-account":
                return (
                    <div className="text-muted font-monospace p-4 text-center border border-dashed border-secondary rounded">
                        MODULE_STATUS: Coming Soon (Under Active Development)
                    </div>
                )

            default:
                return <CustomerDecryptFile user={user} />
        }
    }

    return (
        <div className="app-container">
            {!user && <Auth onLogin={handleLogin} />}

            {user?.role === "admin" && (
                <AdminDashboard user={user} onLogout={handleLogout} />
            )}

            {user?.role === "customer" && (
                <CustomerDashboard 
                    user={user} 
                    onLogout={handleLogout} 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                >
                    {renderCustomerDashboardContent()}
                </CustomerDashboard>
            )}
        </div>
    )
}

export default App