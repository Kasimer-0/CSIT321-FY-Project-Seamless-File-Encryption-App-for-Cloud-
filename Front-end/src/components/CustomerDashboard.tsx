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
    { key: "files", label: "File Management", icon: "FILE" },
    { key: "keys", label: "Encryption Keys", icon: "KEY" },
    { key: "cloud", label: "Cloud Storage Link", icon: "DRV" },
    { key: "security", label: "Security", icon: "SEC" },
    { key: "faq", label: "FAQ", icon: "FAQ" },
]

const fileSidebarItems: { key: FileSub; label: string; icon: string }[] = [
    { key: "encrypt", label: "Encrypt and Upload File", icon: "UP" },
    { key: "decrypt", label: "Decrypt and Download File", icon: "DL" },
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

    const subscriptionLabel = user.isSubscribed ? "Premium access" : "Free plan"

    return (
        <div className="dashboard-root">
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand-area">
                    <div className="d-flex align-items-center gap-3">
                        <span className="brand-dot-indicator" aria-hidden="true" />
                        <div>
                            <div className="brand-text-main">STEALTHSYNC</div>
                            <div className="brand-text-sub">Root level console</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav-container" aria-label="Customer workspace navigation">
                    <div className="sidebar-nav-group">
                        <div className="sidebar-section-tag px-2">Main modules</div>
                        {topSections.map(section => (
                            <div key={section.key}>
                                <button
                                    className={`sidebar-nav-item ${activeSection === section.key ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setActiveSection(section.key)}
                                >
                                    <span className="sidebar-nav-icon">{section.icon}</span>
                                    <span>{section.label}</span>
                                </button>

                                {activeSection === "files" && section.key === "files" && (
                                    <div className="ps-3">
                                        {fileSidebarItems.map(item => (
                                            <button
                                                key={item.key}
                                                className={`sidebar-nav-item ${fileSub === item.key ? "active" : ""}`}
                                                type="button"
                                                onClick={() => setFileSub(item.key)}
                                            >
                                                <span className="sidebar-nav-icon">{item.icon}</span>
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer-profile">
                    <button
                        className={`sidebar-nav-item m-0 ${activeSection === "account" ? "active" : ""}`}
                        type="button"
                        onClick={() => setActiveSection("account")}
                    >
                        <span className="profile-avatar-pill">{initials}</span>
                        <span className="min-w-0">
                            <span className="d-block fw-bold text-truncate">{user.username}</span>
                            <small className={user.isSubscribed ? "text-success" : "console-muted"}>{subscriptionLabel}</small>
                        </span>
                    </button>
                </div>
            </aside>

            <main className="dashboard-main-viewport">
                <header className="dashboard-top-navbar">
                    <div>
                        <div className="console-kicker">Customer workspace</div>
                        <h2 className="navbar-active-title">{getPageTitle()}</h2>
                    </div>
                    <button className="btn-navbar-logout" type="button" onClick={() => setShowLogoutConfirm(true)}>
                        Logout
                    </button>
                </header>

                <div className="dashboard-content-scroll">
                    {activeSection === "files" && (
                        <section className="workspace-card-wrapper p-4">
                            {fileSub === "encrypt" && <CustomerEncryptFile />}
                            {fileSub === "decrypt" && <CustomerDecryptFile user={user} />}
                        </section>
                    )}

                    {activeSection === "cloud" && (
                        <section className="workspace-card-wrapper p-4"><CustomerManageCloudAccLinks user={user} /></section>
                    )}

                    {activeSection === "keys" && (
                        <section className="workspace-card-wrapper p-4"><CustomerManageEncryptionKeysPage /></section>
                    )}

                    {activeSection === "security" && (
                        <CustomerSecurityPage user={user} onUserUpdate={onUserUpdate} />
                    )}

                    {activeSection === "faq" && (
                        <section className="workspace-card-wrapper p-4"><CustomerFAQPage /></section>
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
                <div className="premium-modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="premium-modal-surface" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-accent-strip-alert" />
                        <div className="premium-modal-content">
                            <div className="modal-title-main">End console session?</div>
                            <p className="modal-description-text">You will be returned to the authentication screen.</p>
                            <div className="d-flex gap-2 justify-content-end">
                                <button className="btn-modal-dismiss" type="button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                                <button className="btn-modal-destructive" type="button" onClick={onLogout}>Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerDashboard
