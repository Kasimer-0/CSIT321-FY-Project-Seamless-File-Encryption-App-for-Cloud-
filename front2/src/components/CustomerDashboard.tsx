import { useState, useEffect } from "react"
import type {Plan, PurchasePlanRequest, UserAccount } from "../Type"
import CustomerEncryptFile from "./CustomerEncryptFilePage"
import CustomerDecryptFile from "./CustomerDecryptFilePage"
import CustomerManageCloudAccLinks from "./CustomerManageCloudAccLinksPage"
import CustomerViewAccount from "./CustomerViewAccountPage"
import CustomerManageEncryptionKeysPage from "./CustomerManageEncryptionKeysPage"
import CustomerSecurityPage from "./CustomerSecurityPage"

type CustomerDashboardProps = {
    user: UserAccount
    onLogout: () => void
    // Child workflows return fresh account data after plan and security changes.
    // Lifting that state to App keeps all customer sections consistent without a page reload.
    onUserUpdate: (updatedUser: UserAccount) => void
}

// Keys and security follow the existing navigation section pattern.
type TopSection = "files" | "keys" | "tickets" | "cloud" | "security" | "account"
type FileSub = "encrypt" | "decrypt"
type TicketSub = "createTicket" | "manageMyTicket"

const topSections: { key: TopSection; label: string; icon: string }[] = [
    { key: "files", label: "FILE_OPERATIONS", icon: "📁" },
    { key: "keys", label: "CRYPTO_KEYCHAIN", icon: "🔑" },
    { key: "cloud", label: "CLOUD_STORAGE_MOUNT", icon: "☁️" },
    { key: "tickets", label: "SUPPORT_TICKETS", icon: "🎫" },
    { key: "security", label: "SECURITY_OVERRIDE", icon: "🛡️" },
]

const fileSidebarItems: { key: FileSub; label: string; icon: string }[] = [
    { key: "encrypt", label: "ENCRYPT_&_UPLOAD", icon: "📤" },
    { key: "decrypt", label: "DECRYPT_&_DOWNLOAD", icon: "📥" },
]

const ticketSideBarItems: { key: TicketSub; label: string; icon: string }[] = [
    { key: "createTicket", label: "OPEN_NEW_TICKET", icon: "➕" },
    { key: "manageMyTicket", label: "MANAGE_PENDING", icon: "📄" },
]

function CustomerDashboard({ user, onLogout, onUserUpdate }: CustomerDashboardProps) {
    const [activeSection, setActiveSection] = useState<TopSection>("files")
    const [fileSub, setFileSub] = useState<FileSub>("encrypt")
    const [ticketSub, setTicketSub] = useState<TicketSub>("createTicket")
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    
    // Internal workspace diagnostics replacing external toast architecture
    const [consoleBanner, setConsoleBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerConsoleBanner = (msg: string, type: "success" | "error") => {
        setConsoleBanner({ msg, type })
        setTimeout(() => setConsoleBanner(null), 5000)
    }

    const initials = user.username.slice(0, 2).toUpperCase()

    const handlePurchasePlan = async (plan: Plan) => {
        const request: PurchasePlanRequest = {
            userID: user.userID,
            planID: plan.planID
        }

        const response = await fetch("http://localhost:8080/subscriptions/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(request)
        })

        if (!response.ok) {
            const error = await response.json().catch(() => null)
            const message = error?.message ?? "Failed to upgrade subscription architecture allocation allocation"
            triggerConsoleBanner(`MUTATION_FAILURE: ${message}`, "error")
            throw new Error(message)
        }

        const updatedUser: UserAccount = await response.json()
        onUserUpdate(updatedUser)
        triggerConsoleBanner(`METRIC_MUTATION: Allocation strategy shifted to ${plan.planTitle.toUpperCase()}`, "success")
        return updatedUser
    }

    const getPageTitle = () => {
        if (activeSection === "files") return fileSidebarItems.find(i => i.key === fileSub)?.label ?? "FILE_OPERATIONS"
        if (activeSection === "tickets") return ticketSideBarItems.find(i => i.key === ticketSub)?.label ?? "SUPPORT_TICKETS"
        if (activeSection === "cloud") return "CLOUD_STORAGE_MOUNT"
        if (activeSection === "keys") return "CRYPTO_KEYCHAIN"
        if (activeSection === "security") return "SECURITY_OVERRIDE_PANEL"
        if (activeSection === "account") return "USER_ACCOUNT_COORDINATES"
        return ""
    }

    return (
        <div className="d-flex vh-100 overflow-hidden bg-dark-panel">

            {/* Sidebar Terminal Link Panel */}
            <aside className="d-flex flex-column flex-shrink-0 bg-workspace-card border-end border-muted text-white" style={{ width: 240 }}>
                <div className="px-4 py-3 border-bottom border-muted d-flex align-items-center justify-content-between">
                    <div>
                        <h6 className="mb-0 fw-bold font-monospace text-cyan tracking-wider">CLIENT_RUNTIME</h6>
                        <small className="text-muted font-monospace fs-9">NODE_CONTEXT_WORKSPACE</small>
                    </div>
                    <span className="status-indicator-dot animation-pulse"></span>
                </div>

                <nav className="flex-grow-1 p-3 overflow-y-auto">
                    <small className="text-muted font-monospace fs-9 d-block mb-2 uppercase tracking-widest">SYSTEM_DIRECTORIES</small>

                    {topSections.map(section => (
                        <div key={section.key} className="mb-1">
                            <button
                                className={`sidebar-nav-item w-100 font-monospace text-start py-2 px-3 fs-7 d-flex align-items-center gap-2 border-0 ${
                                    activeSection === section.key 
                                        ? "active text-cyan bg-dark-panel fw-semibold" 
                                        : "bg-transparent text-muted"
                                }`}
                                onClick={() => setActiveSection(section.key)}
                            >
                                <span className="fs-6">{section.icon}</span>
                                {section.label}
                            </button>

                            {/* Sub-directory Pipeline: File Management */}
                            {activeSection === "files" && section.key === "files" && (
                                <div className="ms-3 border-start border-muted ps-2 my-1 d-flex flex-column gap-1">
                                    {fileSidebarItems.map(item => (
                                        <button
                                            key={item.key}
                                            className={`sidebar-nav-item w-100 text-start py-1.5 px-3 font-monospace fs-8 border-0 bg-transparent ${
                                                fileSub === item.key ? "text-white fw-bold" : "text-muted"
                                            }`}
                                            onClick={() => setFileSub(item.key)}
                                        >
                                            <span className="me-2">{item.icon}</span>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Sub-directory Pipeline: Support Ticket Center */}
                            {activeSection === "tickets" && section.key === "tickets" && (
                                <div className="ms-3 border-start border-muted ps-2 my-1 d-flex flex-column gap-1">
                                    {ticketSideBarItems.map(item => (
                                        <button
                                            key={item.key}
                                            className={`sidebar-nav-item w-100 text-start py-1.5 px-3 font-monospace fs-8 border-0 bg-transparent ${
                                                ticketSub === item.key ? "text-white fw-bold" : "text-muted"
                                            }`}
                                            onClick={() => setTicketSub(item.key)}
                                        >
                                            <span className="me-2">{item.icon}</span>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footprint Account Section */}
                <div className="p-3 border-top border-muted bg-dark-panel text-start">
                    <button
                        className={`w-100 text-start p-2 d-flex align-items-center gap-2 bg-transparent border-0 rounded ${
                            activeSection === "account" ? "border border-cyan bg-workspace-card" : ""
                        }`}
                        onClick={() => setActiveSection("account")}
                    >
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold bg-cyan text-dark font-monospace"
                            style={{ width: 34, height: 34, fontSize: 12 }}
                        >
                            {initials}
                        </div>
                        <div className="text-start overflow-hidden">
                            <div className="fw-semibold font-monospace text-white text-truncate fs-7 mb-0">
                                {user.username}
                            </div>
                            <small className={`font-monospace fs-9 d-block uppercase ${
                                user.isSubscribed ? "text-emerald" : "text-muted"
                            }`}>
                                {user.isSubscribed ? "✦ PREMIUM_CORE" : "⚡ FREE_ALLOTMENT"}
                            </small>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Core Execution Frame Container */}
            <main className="d-flex flex-column flex-grow-1 overflow-hidden bg-dark-panel">

                {/* Dashboard Operational Top Navigation Menu */}
                <div className="d-flex align-items-center gap-3 px-4 border-bottom border-muted bg-workspace-card text-white" style={{ height: 56, flexShrink: 0 }}>
                    <div className="flex-grow-1 font-monospace fs-7 text-muted tracking-wider">
                        WORKSPACE_PATH: <span className="text-cyan">{getPageTitle()}</span>
                    </div>
                    <button className="sidebar-nav-item w-auto px-3 py-1.5 font-monospace fs-8 border border-danger text-danger bg-transparent" onClick={() => setShowLogoutConfirm(true)}>
                        DISCONNECT_SESSION 🚪
                    </button>
                </div>

                {/* Central Application Workspace Container */}
                <div className="flex-grow-1 p-4 overflow-y-auto">
                    
                    {/* Diagnostic Console Alert Banner Framework */}
                    {consoleBanner && (
                        <div className={`status-banner ${consoleBanner.type === "error" ? "status-error" : "status-success"} mb-4 py-2 px-3 rounded font-monospace fs-8 d-flex align-items-center gap-2 shadow-sm`}>
                            <span className="status-indicator-dot"></span>
                            <span className="status-text text-white">{consoleBanner.msg}</span>
                        </div>
                    )}

                    {activeSection === "files" && (
                        <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card text-white">
                            {fileSub === "encrypt" && <CustomerEncryptFile user={user} />}
                            {fileSub === "decrypt" && <CustomerDecryptFile user={user} />}
                        </div>
                    )}

                    {activeSection === "cloud" && (
                        <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card text-white">
                            <CustomerManageCloudAccLinks user={user} />
                        </div>
                    )}

                    {activeSection === "keys" && (
                        <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card text-white">
                            <CustomerManageEncryptionKeysPage user={user} />
                        </div>
                    )}

                    {activeSection === "security" && (
                        <CustomerSecurityPage user={user} onUserUpdate={onUserUpdate} />
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

            {/* Logout Context Disconnect Confirmation Interceptor Dialog */}
            {showLogoutConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 999 }}
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card text-white" style={{ width: 400, maxWidth: "90%" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex align-items-center mb-2 text-danger gap-2 font-monospace fs-7 fw-semibold">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                            TERMINATE_WORKSPACE_SESSION
                        </div>
                        
                        <p className="text-muted font-monospace fs-7 mb-4">
                            You are closing the operational console pipeline interface. Local cryptomaterial and ephemeral interface state descriptors will clear from RAM cache. Confirm disconnect sequence?
                        </p>
                        
                        <div className="d-flex gap-2 justify-content-end border-top border-muted pt-3">
                            <button className="btn-workspace-action font-monospace fs-8 px-3" onClick={() => setShowLogoutConfirm(false)}>
                                ABORT_DISCONNECT
                            </button>
                            <button className="sidebar-nav-item w-auto px-4 py-1.5 m-0 font-monospace fs-8 bg-destructive text-white border-0" onClick={onLogout}>
                                EXECUTE_DISCONNECT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerDashboard