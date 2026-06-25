import type { UserAccountDTO } from "../Type"

type AdminViewAccountProps = {
    user: UserAccountDTO
    onBack: () => void
    onToggleSuspend: () => void
    showConfirm: boolean
    setShowConfirm: (value: boolean) => void
}

function AdminViewAccount({
    user,
    onBack,
    onToggleSuspend,
    showConfirm,
    setShowConfirm
}: AdminViewAccountProps) {

    const subscription = user.subscription
    const plan = subscription?.plan
    const isAdmin = user.role.toLowerCase() === "admin"

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <button 
                    className="btn border-0 fw-semibold text-white px-4 py-2.5 d-inline-flex align-items-center justify-content-center" 
                    style={{ 
                        fontSize: "14px", 
                        backgroundColor: "#06b6d4", 
                        borderRadius: "6px",
                        lineHeight: "1",
                        letterSpacing: "0.01em"
                    }}
                    onClick={onBack}
                >
                    <svg width="14" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2" style={{ transform: "translateY(-0.5px)" }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to Accounts Tab
                </button>
            </div>

            <div className="row g-4 mb-4">
                <div className={isAdmin ? "col-12" : "col-12 col-md-6"}>
                    
                    <h3 className="fw-semibold mb-3 text-white d-flex align-items-center gap-2" style={{ fontSize: "22px" }}>
                        {user.username} 
                    </h3>
                    
                    <div className="d-flex flex-column gap-3">
                        <div style={{ fontSize: "14px" }}>
                            <span style={{ color: "#a1a1aa", fontWeight: 500 }}>USER ID:</span> 
                            <span className="text-white ms-2 fw-semibold">{user.userID}</span>
                        </div>
                        
                        <div style={{ fontSize: "14px" }}>
                            <span style={{ color: "#a1a1aa", fontWeight: 500 }}>EMAIL ADDRESS:</span> 
                            <span className="text-white ms-2 fw-semibold">{user.email}</span>
                        </div>
                        
                        <div style={{ fontSize: "14px" }}>
                            <span style={{ color: "#a1a1aa", fontWeight: 500 }}>USER ROLE:</span> 
                            <span className="ms-2 fw-bold" style={{ color: "#06b6d4" }}>
                                {user.role.toUpperCase()}
                            </span>
                        </div>
                        
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: "14px" }}>
                            <span style={{ color: "#a1a1aa", fontWeight: 500 }}>USER STATUS:</span>
                            <span className="badge px-2.5 py-1 ms-1 fw-semibold" style={{ 
                                fontSize: "12px", 
                                borderRadius: "4px", 
                                backgroundColor: user.isSuspended ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)", 
                                color: user.isSuspended ? "#f43f5e" : "#10b981" 
                            }}>
                                {user.isSuspended ? "SUSPENDED" : "ACTIVE"}
                            </span>
                        </div>
                    </div>
                </div>

                {!isAdmin && (
                    <div className="col-12 col-md-6">
                        <h4 className="fw-semibold mb-3 opacity-75" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa" }}>SUBSCRIPTION DETAILS</h4>
                        
                        <div className="h-100 position-relative" style={{ minHeight: "180px" }}>
                            {user.isSubscribed && subscription && plan ? (
                                <div className="d-flex flex-column gap-3">
                                    <div className="fw-semibold text-white mb-1" style={{ fontSize: "18px" }}>{plan.planTitle}</div>
                                    
                                    <div className="d-flex justify-content-between align-items-center pb-2" style={{ fontSize: "14px", borderBottom: "1px dashed #27272a" }}>
                                        <span style={{ color: "#a1a1aa" }}>SUBSCRIPTION PLAN PRICE:</span>
                                        <span style={{ color: "#10b981" }} className="fw-bold fs-5">${plan.planPrice.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-center pb-2" style={{ fontSize: "14px", borderBottom: "1px dashed #27272a" }}>
                                        <span style={{ color: "#a1a1aa" }}>SUBSCRIPTION STATUS:</span>
                                        <span style={{ color: subscription.subcriptionStatus === "active" ? "#10b981" : "#f43f5e" }} className="fw-bold">
                                            {subscription.subcriptionStatus.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-1" style={{ fontSize: "13px", color: "#a1a1aa" }}>
                                        <span style={{ color: "#71717a", fontWeight: 500 }}>SUBSCRIPTION PERIOD:</span> {new Date(subscription.subcriptionStartDate).toLocaleDateString()} &rarr; {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-3">
                                    <div className="fw-semibold mb-1 text-white" style={{ fontSize: "14px" }}>USER IS ON BASE PLAN</div>
                                    <div className="fst-italic" style={{ fontSize: "12px", color: "#71717a" }}>User is not subscribed to premium plan.</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="border-top pt-3 mt-4 text-end" style={{ borderColor: "#27272a" }}>
                <button
                    className="btn border-0 fw-semibold text-white px-4 py-3"
                    style={{ 
                        fontSize: "14px",
                        backgroundColor: user.isSuspended ? "#10b981" : "#f43f5e",
                        borderRadius: "6px",
                        lineHeight: "1"
                    }}
                    onClick={() => setShowConfirm(true)}
                >
                    {user.isSuspended ? "Unsuspend User" : "Suspend User"}
                </button>
            </div>

            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(4px)", zIndex: 999 }}
                >
                    <div className="border rounded p-4 text-white text-center" style={{ width: 360, maxWidth: "90%", backgroundColor: "#18181b", borderColor: "#27272a" }}>
                        
                        <div className="d-flex align-items-center justify-content-center mx-auto mb-3 rounded-circle" 
                             style={{ width: "48px", height: "48px", backgroundColor: user.isSuspended ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)", color: user.isSuspended ? "#10b981" : "#f43f5e" }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>

                        <h5 className="fw-semibold text-white mb-2" style={{ fontSize: "16px" }}>
                            {user.isSuspended ? "Confirm Unsuspend" : "Confirm Suspend"}
                        </h5>

                        <p className="mb-4" style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.5" }}>
                            {user.isSuspended
                                ? `Are you sure you want to restore access to StealthSync for [ ${user.username} ]?`
                                : `Are you sure you want to block access from StealthSync for [ ${user.username} ]?`}
                        </p>

                        <div className="d-flex gap-2 justify-content-center w-100">
                            <button
                                className="btn px-4 py-2.5 text-white fw-semibold flex-grow-1"
                                style={{ fontSize: "13px", border: "1px solid #27272a", backgroundColor: "transparent", borderRadius: "6px" }}
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn px-4 py-2.5 text-white fw-semibold border-0 flex-grow-1"
                                style={{ 
                                    fontSize: "13px", 
                                    backgroundColor: user.isSuspended ? "#10b981" : "#f43f5e",
                                    borderRadius: "6px"
                                }}
                                onClick={onToggleSuspend}
                            >
                                {user.isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewAccount