import { useState, useEffect } from "react"
import type { UserAccount } from "../Type"

type CustomerDashboardProps = {
    readonly user: UserAccount
    readonly onLogout: () => void
    readonly children: React.ReactNode 
    readonly activeTab: string
    readonly setActiveTab: (tab: any) => void
}

type CoreTab = "encrypt-file" | "decrypt-file" | "encryption-keys" | "cloud-storage"
type PremiumTab = "physical-tokens" | "recovery-phrases"
type BottomTab = "faq" | "view-account"

type Tab = CoreTab | PremiumTab | BottomTab

const pageTitles: Record<Tab, string> = {
    "encrypt-file": "Encrypt File",
    "decrypt-file": "Decrypt File",
    "encryption-keys": "Manage Encryption Keys",
    "cloud-storage": "Cloud Storage Links",
    "physical-tokens": "Manage Physical Tokens",
    "recovery-phrases": "Manage Recovery Phrases",
    "faq": "Frequently Asked Questions",
    "view-account": "Manage your Account"
}

const tabIcons: Record<string, (color: string) => React.ReactNode> = {
    "physical-tokens": (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    ),
    "recovery-phrases": (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="M12 6v6l4 2"></path>
        </svg>
    ),
    "faq": (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
    ),
    "view-account": (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
        </svg>
    )
}

function CustomerDashboard({ user, onLogout, children, activeTab, setActiveTab }: CustomerDashboardProps) {
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [fileOpsExpanded, setFileOpsExpanded] = useState(true)

    useEffect(() => {
        if (activeTab !== "encrypt-file" && activeTab !== "decrypt-file") {
            setFileOpsExpanded(false)
        }
    }, [activeTab])

    const handleLogout = async () => {
        try {
            const res = await fetch("http://localhost:8080/logout", {
                method: "POST",
                credentials: "include"
            })
            if (!res.ok) throw new Error(`${res.status}`)
        } catch (err) {
            console.error("Logout failed", err)
        }
        onLogout()
    }

    const initials = user.username.slice(0, 2).toUpperCase()
    const premiumTabs: PremiumTab[] = ["physical-tokens", "recovery-phrases"]
    const bottomTabs: BottomTab[] = ["faq", "view-account"]

    const isFileOpsActive = activeTab === "encrypt-file" || activeTab === "decrypt-file"

    return (
        <div className="dashboard-root">
            <aside className="dashboard-sidebar d-flex flex-column justify-content-between">
                <div>
                    <div className="sidebar-brand-area">
                        <div className="brand-dot-indicator"></div>
                        <div>
                            <div className="brand-text-main">STEALTH<span>SYNC</span></div>
                        </div>
                    </div>

                    <nav className="sidebar-nav-container">
                        <button
                            className={`sidebar-nav-item d-flex align-items-center justify-content-between ${isFileOpsActive ? "active" : ""}`}
                            onClick={() => setFileOpsExpanded(!fileOpsExpanded)}
                        >
                            <span className="d-flex align-items-center gap-2">
                                <span className="sidebar-nav-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFileOpsActive ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                                        <polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line>
                                    </svg>
                                </span>
                                File Operations
                            </span>
                            <span style={{ fontSize: "10px", transform: fileOpsExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "#a1a1aa" }}>
                                ➔
                            </span>
                        </button>

                        {fileOpsExpanded && (
                            <div className="ps-3 d-flex flex-column gap-1 my-1 border-start border-secondary ms-3">
                                <button
                                    className={`sidebar-nav-item py-1 fs-8 ${activeTab === "encrypt-file" ? "active text-cyan" : ""}`}
                                    style={{ color: activeTab === "encrypt-file" ? "#06b6d4" : "#a1a1aa" }}
                                    onClick={() => setActiveTab("encrypt-file")}
                                >
                                    ↳ Encrypt File
                                </button>
                                <button
                                    className={`sidebar-nav-item py-1 fs-8 ${activeTab === "decrypt-file" ? "active text-cyan" : ""}`}
                                    style={{ color: activeTab === "decrypt-file" ? "#06b6d4" : "#a1a1aa" }}
                                    onClick={() => setActiveTab("decrypt-file")}
                                >
                                    ↳ Decrypt File
                                </button>
                            </div>
                        )}

                        <button
                            className={`sidebar-nav-item ${activeTab === "encryption-keys" ? "active" : ""}`}
                            onClick={() => setActiveTab("encryption-keys")}
                        >
                            <span className="sidebar-nav-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === "encryption-keys" ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                                </svg>
                            </span>
                            Encryption Keys
                        </button>

                        <button
                            className={`sidebar-nav-item ${activeTab === "cloud-storage" ? "active" : ""}`}
                            onClick={() => setActiveTab("cloud-storage")}
                        >
                            <span className="sidebar-nav-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === "cloud-storage" ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </span>
                            Cloud Storage Links
                        </button>

                        {user.isSubscribed && (
                            <>
                                <div className="sidebar-section-divider mt-4 mb-2 px-3 text-uppercase font-monospace text-muted" style={{ fontSize: "10px", letterSpacing: "1px", fontWeight: "bold" }}>
                                    Premium Features
                                </div>

                                {premiumTabs.map((tab) => {
                                    const isActive = activeTab === tab
                                    const strokeColor = isActive ? "#06b6d4" : "#a1a1aa"
                                    return (
                                        <button
                                            key={tab}
                                            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                            onClick={() => setActiveTab(tab)}
                                        >
                                            <span className="sidebar-nav-icon">
                                                {tabIcons[tab]?.(strokeColor) || null}
                                            </span>
                                            {tab.replace("-", " ")}
                                        </button>
                                    )
                                })}
                            </>
                        )}
                    </nav>
                </div>

                <div>
                    <nav className="sidebar-nav-container px-0 mb-2">
                        {bottomTabs.map((tab) => {
                            const isActive = activeTab === tab
                            const strokeColor = isActive ? "#06b6d4" : "#a1a1aa"
                            return (
                                <button
                                    key={tab}
                                    className={`sidebar-nav-item w-100 ${isActive ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    <span className="sidebar-nav-icon">
                                        {tabIcons[tab]?.(strokeColor) || null}
                                    </span>
                                    {tab === "faq" ? "FAQ Support" : "View Account"}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="sidebar-footer-profile">
                        <div className="d-flex align-items-center gap-3">
                            <div className="profile-avatar-pill">{initials}</div>
                            <div className="overflow-hidden flex-grow-1">
                                <div className="profile-name-string">{user.username}</div>
                                <div className="profile-name-string">ID: {user.userID}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main-viewport">
                <header className="dashboard-top-navbar">
                    <h1 className="navbar-active-title">
                        {pageTitles[activeTab as Tab] || "Secure Area"}
                    </h1>
                    <button className="btn-navbar-logout d-flex align-items-center gap-2" onClick={() => setShowLogoutConfirm(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Log Out
                    </button>
                </header>

                <div className="dashboard-content-scroll container-fluid py-4 px-4">
                    {children}
                </div>
            </main>

            {showLogoutConfirm && (
                <dialog 
                    open
                    className="premium-modal-backdrop" 
                    onClick={() => setShowLogoutConfirm(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setShowLogoutConfirm(false);
                    }}
                >
                    <div 
                        className="premium-modal-surface" 
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        <div className="modal-accent-strip-alert"></div>
                        <h4 id="logout-modal-heading" className="modal-title-main">Confirm Logout?</h4>
                        <p className="modal-description-text">
                            Opening StealthSync next time will require you to Log In again.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" onClick={() => setShowLogoutConfirm(false)}>
                                Cancel
                            </button>
                            <button 
                                className="btn-modal-destructive" 
                                onClick={() => {
                                    handleLogout()
                                    setShowLogoutConfirm(false)
                                }}
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}

export default CustomerDashboard;