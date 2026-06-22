import { useState } from "react"
import type { Plan, PurchasePlanRequest, UserAccount } from "../Type"
import CustomerEncryptFile from "./CustomerEncryptFilePage"
import CustomerDecryptFile from "./CustomerDecryptFilePage"
import CustomerManageCloudAccLinks from "./CustomerManageCloudAccLinksPage"
import CustomerViewAccount from "./CustomerViewAccountPage"
import CustomerManageEncryptionKeysPage from "./CustomerManageEncryptionKeysPage"
import CustomerSecurityPage from "./CustomerSecurityPage"
import CustomerFAQPage from "./CustomerFAQPage"
import { apiFetch } from "../lib/api"

type CustomerDashboardProps = {
    user: UserAccount
    onLogout: () => void
    onUserUpdate: (updatedUser: UserAccount) => void
}

type TopSection = "files" | "keys" | "cloud" | "security" | "faq" | "account"
type FileSub = "encrypt" | "decrypt"

const topSections: { key: TopSection; label: string; icon: string }[] = [
    { key: "files", label: "File Management", icon: "Files" },
    { key: "keys", label: "Encryption Keys", icon: "Keys" },
    { key: "cloud", label: "Cloud Storage Link", icon: "Cloud" },
    { key: "security", label: "Security", icon: "Security" },
    { key: "faq", label: "FAQ", icon: "FAQ" },
]

const fileSidebarItems: { key: FileSub; label: string; icon: string }[] = [
    { key: "encrypt", label: "Encrypt and Upload File", icon: "Upload" },
    { key: "decrypt", label: "Decrypt and Download File", icon: "Download" },
]

function CustomerDashboard({ user, onLogout, onUserUpdate }: CustomerDashboardProps) {
    const [activeSection, setActiveSection] = useState<TopSection>("files")
    const [fileSub, setFileSub] = useState<FileSub>("encrypt")
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    const initials = user.username.slice(0, 2).toUpperCase()

    // The authenticated backend resolves the customer from the JWT; the request only selects a plan.
    const handlePurchasePlan = async (plan: Plan) => {
        const request: PurchasePlanRequest = { planID: plan.planID }
        const response = await apiFetch("http://localhost:8080/subscriptions/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        })

        if (!response.ok) {
            const error = await response.json().catch(() => null)
            throw new Error(error?.message ?? "Failed to update subscription")
        }

        const updatedUser: UserAccount = await response.json()
        onUserUpdate(updatedUser)
        return updatedUser
    }

    const getPageTitle = () => {
        if (activeSection === "files") return fileSidebarItems.find(i => i.key === fileSub)?.label ?? "Files"
        if (activeSection === "cloud") return "Cloud Storage Link"
        if (activeSection === "keys") return "Encryption Keys"
        if (activeSection === "security") return "Security"
        if (activeSection === "faq") return "Frequently Asked Questions"
        if (activeSection === "account") return "My Account"
        return ""
    }

    return (
        <div className="d-flex vh-100 overflow-hidden">
            <aside className="d-flex flex-column flex-shrink-0 bg-white border-end" style={{ width: 220 }}>
                <div className="px-3 py-3 border-bottom">
                    <h5 className="mb-0 fw-bold text-primary">Dashboard</h5>
                    <small className="text-muted">Customer</small>
                </div>

                <nav className="flex-grow-1 p-2">
                    <small className="text-muted px-2">MAIN</small>
                    {topSections.map(section => (
                        <div key={section.key}>
                            <button
                                className={`btn w-100 text-start mb-1 mt-1 d-flex align-items-center gap-2 ${activeSection === section.key ? "btn-primary" : "btn-outline-light text-dark"}`}
                                onClick={() => setActiveSection(section.key)}
                            >
                                <span>{section.icon}</span>
                                {section.label}
                            </button>

                            {activeSection === "files" && section.key === "files" && (
                                <div className="ms-3 mb-1">
                                    {fileSidebarItems.map(item => (
                                        <button
                                            key={item.key}
                                            className={`btn w-100 text-start mb-1 d-flex align-items-center gap-2 ${fileSub === item.key ? "btn-primary" : "btn-outline-light text-dark"}`}
                                            style={{ fontSize: 12 }}
                                            onClick={() => setFileSub(item.key)}
                                        >
                                            <span>{item.icon}</span>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-top">
                    <button
                        className={`btn w-100 text-start p-2 d-flex align-items-center gap-2 ${activeSection === "account" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setActiveSection("account")}
                    >
                        <div
                            className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold ${activeSection === "account" ? "bg-white text-primary" : "bg-primary text-white"}`}
                            style={{ width: 36, height: 36, fontSize: 13 }}
                        >
                            {initials}
                        </div>
                        <div className="text-start">
                            <div className={`fw-medium ${activeSection === "account" ? "text-white" : "text-dark"}`} style={{ fontSize: 13 }}>
                                {user.username}
                            </div>
                            <small className={activeSection === "account" ? "text-white opacity-75" : user.isSubscribed ? "text-success" : "text-muted"}>
                                {user.isSubscribed ? "Premium" : "Free Plan"}
                            </small>
                        </div>
                    </button>
                </div>
            </aside>

            <main className="d-flex flex-column flex-grow-1 overflow-hidden bg-light">
                <div className="d-flex align-items-center gap-3 px-4 bg-white border-bottom" style={{ height: 56, flexShrink: 0 }}>
                    <div className="flex-grow-1 fw-semibold">{getPageTitle()}</div>
                    <button className="btn btn-outline-danger" onClick={() => setShowLogoutConfirm(true)}>
                        Logout
                    </button>
                </div>

                <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>
                    {activeSection === "files" && (
                        <div className="card p-4">
                            {fileSub === "encrypt" && <CustomerEncryptFile />}
                            {fileSub === "decrypt" && <CustomerDecryptFile user={user} />}
                        </div>
                    )}

                    {activeSection === "cloud" && (
                        <div className="card p-4"><CustomerManageCloudAccLinks user={user} /></div>
                    )}

                    {activeSection === "keys" && (
                        <div className="card p-4"><CustomerManageEncryptionKeysPage /></div>
                    )}

                    {activeSection === "security" && (
                        <CustomerSecurityPage user={user} onUserUpdate={onUserUpdate} />
                    )}

                    {activeSection === "faq" && (
                        <div className="card p-4"><CustomerFAQPage /></div>
                    )}

                    {activeSection === "account" && (
                        <CustomerViewAccount
                            user={user}
                            onSubscribe={handlePurchasePlan}
                            onUpdateAccount={(updated) => onUserUpdate({ ...user, ...updated })}
                            onSuspendAccount={() => onUserUpdate({ ...user, isSuspended: true })}
                            onCancelSubscription={() => onUserUpdate({ ...user, isSubscribed: false, subscription: null })}
                        />
                    )}
                </div>
            </main>

            {showLogoutConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div className="card p-4" style={{ width: 360 }} onClick={(event) => event.stopPropagation()}>
                        <h6 className="mb-2">Logout?</h6>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>Are you sure you want to logout from your account?</p>
                        <div className="d-flex gap-2 justify-content-end">
                            <button className="btn btn-outline-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={onLogout}>Yes, Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerDashboard