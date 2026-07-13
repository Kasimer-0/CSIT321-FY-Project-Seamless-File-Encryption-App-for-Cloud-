import { useEffect, useState, type ReactNode } from "react"
import type { Plan, PurchasePlanRequest, UserAccount } from "../Type"
import CustomerEncryptFile from "./CustomerEncryptFilePage"
import CustomerDecryptFile from "./CustomerDecryptFilePage"
import CustomerManageCloudAccLinks from "./CustomerManageCloudAccLinksPage"
import CustomerViewAccount from "./CustomerViewAccountPage"
import CustomerManageEncryptionKeysPage from "./CustomerManageEncryptionKeysPage"
import CustomerManagePTokens from "./CustomerManagePTokensPage"
import CustomerManageRecPhrase from "./CustomerManageRecPhrasePage"
import CustomerFAQPage from "./CustomerFAQPage"
import { apiFetch } from "../lib/api"

type CustomerDashboardProps = {
    user: UserAccount
    onLogout: () => void
    onUserUpdate: (updatedUser: UserAccount) => void
}

type CustomerTab = "encrypt-file" | "decrypt-file" | "encryption-keys" | "cloud-storage" | "recovery-phrase" | "physical-tokens" | "faq" | "view-account"

const pageTitles: Record<CustomerTab, string> = {
    "encrypt-file": "Encrypt File",
    "decrypt-file": "Decrypt File",
    "encryption-keys": "Manage Encryption Keys",
    "cloud-storage": "Cloud Storage Links",
    "recovery-phrase": "Recovery Phrase",
    "physical-tokens": "Physical Tokens",
    "faq": "Frequently Asked Questions",
    "view-account": "Manage Account"
}

const tabIcons: Record<CustomerTab | "file-ops", (active: boolean) => ReactNode> = {
    "file-ops": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <polyline points="12 16 16 12 12 8"></polyline>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
    ),
    "encrypt-file": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15v2"></path>
            <rect x="4" y="11" width="16" height="10" rx="2"></rect>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
    ),
    "decrypt-file": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15v2"></path>
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.5-2.18"></path>
        </svg>
    ),
    "encryption-keys": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777z"></path>
            <path d="M13 11l7-7"></path>
            <path d="M17 7l3 3"></path>
        </svg>
    ),
    "cloud-storage": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H7a5 5 0 1 1 1.1-9.88A7 7 0 0 1 21 12.5a3.5 3.5 0 0 1-3.5 6.5z"></path>
        </svg>
    ),
    "recovery-phrase": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    ),
    "physical-tokens": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5"></circle>
            <path d="M21 2l-9.6 9.6"></path>
            <path d="M15.5 7.5l3 3L22 7"></path>
        </svg>
    ),
    "faq": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    ),
    "view-account": active => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#a1a1aa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    )
}

function CustomerDashboard({ user, onLogout, onUserUpdate }: CustomerDashboardProps) {
    const [activeTab, setActiveTab] = useState<CustomerTab>("encrypt-file")
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [fileOpsExpanded, setFileOpsExpanded] = useState(true)
    const initials = user.username.slice(0, 2).toUpperCase()

    useEffect(() => {
        if (activeTab !== "encrypt-file" && activeTab !== "decrypt-file") {
            setFileOpsExpanded(false)
        }
    }, [activeTab])

    useEffect(() => {
        // Recovery phrase and physical token pages are premium-only modules; if a
        // downgrade happens while the tab is open, return the user to account details.
        if (!user.isSubscribed && (activeTab === "recovery-phrase" || activeTab === "physical-tokens")) {
            setActiveTab("view-account")
        }
    }, [activeTab, user.isSubscribed])

    // Purchase still calls the JWT-protected backend endpoint; the redesigned
    // account view only changes how the action is presented.
    const handlePurchasePlan = async (plan: Plan) => {
        const request: PurchasePlanRequest = { planID: plan.planID }
        const response = await apiFetch("http://localhost:8080/subscriptions/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
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

    const isFileOpsActive = activeTab === "encrypt-file" || activeTab === "decrypt-file"

    const renderWorkspace = () => {
        switch (activeTab) {
            case "encrypt-file":
                return <CustomerEncryptFile />
            case "decrypt-file":
                return <CustomerDecryptFile user={user} />
            case "encryption-keys":
                return <CustomerManageEncryptionKeysPage user={user} />
            case "cloud-storage":
                return <CustomerManageCloudAccLinks user={user} />
            case "recovery-phrase":
                return <CustomerManageRecPhrase user={user} />
            case "physical-tokens":
                return <CustomerManagePTokens user={user} />
            case "faq":
                return <CustomerFAQPage />
            case "view-account":
                return (
                    <CustomerViewAccount
                        user={user}
                        onSubscribe={handlePurchasePlan}
                        onUpdateAccount={(updated) => onUserUpdate({ ...user, ...updated })}
                        onSuspendAccount={() => onUserUpdate({ ...user, isSuspended: true })}
                        onCancelSubscription={() => onUserUpdate({ ...user, isSubscribed: false, subscription: null })}
                    />
                )
        }
    }

    return (
        <div className="dashboard-root">
            <aside className="dashboard-sidebar d-flex flex-column justify-content-between">
                <div>
                    <div className="sidebar-brand-area">
                        <div className="brand-dot-indicator"></div>
                        <div>
                            <div className="brand-text-main">STEALTH<span>SYNC</span></div>
                            <div className="brand-text-sub">Encrypted cloud console</div>
                        </div>
                    </div>

                    <nav className="sidebar-nav-container">
                        <button
                            className={`sidebar-nav-item d-flex align-items-center justify-content-between ${isFileOpsActive ? "active" : ""}`}
                            type="button"
                            onClick={() => setFileOpsExpanded(value => !value)}
                        >
                            <span className="d-flex align-items-center gap-2">
                                <span className="sidebar-nav-icon">{tabIcons["file-ops"](isFileOpsActive)}</span>
                                File Operations
                            </span>
                            <span className="sidebar-chevron" style={{ transform: fileOpsExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                                &gt;
                            </span>
                        </button>

                        {fileOpsExpanded && (
                            <div className="ps-3 d-flex flex-column gap-1 my-1 border-start border-secondary ms-3">
                                <button
                                    className={`sidebar-nav-item py-1 ${activeTab === "encrypt-file" ? "active text-cyan" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("encrypt-file")}
                                >
                                    <span className="sidebar-nav-icon">{tabIcons["encrypt-file"](activeTab === "encrypt-file")}</span>
                                    Encrypt File
                                </button>
                                <button
                                    className={`sidebar-nav-item py-1 ${activeTab === "decrypt-file" ? "active text-cyan" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("decrypt-file")}
                                >
                                    <span className="sidebar-nav-icon">{tabIcons["decrypt-file"](activeTab === "decrypt-file")}</span>
                                    Decrypt File
                                </button>
                            </div>
                        )}

                        <button
                            className={`sidebar-nav-item ${activeTab === "encryption-keys" ? "active" : ""}`}
                            type="button"
                            onClick={() => setActiveTab("encryption-keys")}
                        >
                            <span className="sidebar-nav-icon">{tabIcons["encryption-keys"](activeTab === "encryption-keys")}</span>
                            Encryption Keys
                        </button>

                        <button
                            className={`sidebar-nav-item ${activeTab === "cloud-storage" ? "active" : ""}`}
                            type="button"
                            onClick={() => setActiveTab("cloud-storage")}
                        >
                            <span className="sidebar-nav-icon">{tabIcons["cloud-storage"](activeTab === "cloud-storage")}</span>
                            Cloud Storage Links
                        </button>

                        {/* Premium-only security modules are split from the old Security Center page. */}
                        {user.isSubscribed && (
                            <>
                                <button
                                    className={`sidebar-nav-item ${activeTab === "recovery-phrase" ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("recovery-phrase")}
                                >
                                    <span className="sidebar-nav-icon">{tabIcons["recovery-phrase"](activeTab === "recovery-phrase")}</span>
                                    Recovery Phrase
                                </button>

                                <button
                                    className={`sidebar-nav-item ${activeTab === "physical-tokens" ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("physical-tokens")}
                                >
                                    <span className="sidebar-nav-icon">{tabIcons["physical-tokens"](activeTab === "physical-tokens")}</span>
                                    Physical Tokens
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                <div>
                    <nav className="sidebar-nav-container px-0 mb-2">
                        <button
                            className={`sidebar-nav-item w-100 ${activeTab === "faq" ? "active" : ""}`}
                            type="button"
                            onClick={() => setActiveTab("faq")}
                        >
                            <span className="sidebar-nav-icon">{tabIcons.faq(activeTab === "faq")}</span>
                            FAQ Support
                        </button>
                        <button
                            className={`sidebar-nav-item w-100 ${activeTab === "view-account" ? "active" : ""}`}
                            type="button"
                            onClick={() => setActiveTab("view-account")}
                        >
                            <span className="sidebar-nav-icon">{tabIcons["view-account"](activeTab === "view-account")}</span>
                            View Account
                        </button>
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
                    <h1 className="navbar-active-title">{pageTitles[activeTab]}</h1>
                    <button className="btn-navbar-logout d-flex align-items-center gap-2" type="button" onClick={() => setShowLogoutConfirm(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Log Out
                    </button>
                </header>

                <div className="dashboard-content-scroll container-fluid py-4 px-4">
                    <section className="workspace-card-wrapper p-4">
                        {renderWorkspace()}
                    </section>
                </div>
            </main>

            {showLogoutConfirm && (
                <dialog
                    open
                    className="premium-modal-backdrop"
                    onClick={() => setShowLogoutConfirm(false)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") setShowLogoutConfirm(false)
                    }}
                >
                    <div className="premium-modal-surface" onClick={(event) => event.stopPropagation()} role="presentation">
                        <div className="modal-accent-strip-alert"></div>
                        <h4 id="logout-modal-heading" className="modal-title-main">Confirm Logout?</h4>
                        <p className="modal-description-text">
                            Opening StealthSync next time will require you to log in again.
                        </p>
                        <div className="d-flex gap-3 justify-content-end">
                            <button className="btn-modal-dismiss" type="button" onClick={() => setShowLogoutConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-modal-destructive"
                                type="button"
                                onClick={() => {
                                    onLogout()
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

export default CustomerDashboard
