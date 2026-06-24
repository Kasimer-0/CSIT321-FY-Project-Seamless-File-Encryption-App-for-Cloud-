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

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative">
            {/* Header Control Row */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <button className="btn-workspace-action font-monospace fs-8" onClick={onBack}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    RETURN_TO_INDEX
                </button>
                <span className="font-monospace text-muted fs-8">IDENTITY_NODE_VIEW</span>
            </div>

            {/* Main Details Grid */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-6">
                    <h3 className="workspace-section-heading mb-3">{user.username}</h3>
                    
                    <div className="d-flex flex-column gap-2">
                        <div className="p-2 border rounded bg-workspace-card font-monospace fs-7">
                            <span className="text-muted">NODE_ID:</span> <span className="table-primary-text fw-medium">{user.userID}</span>
                        </div>
                        <div className="p-2 border rounded bg-workspace-card font-monospace fs-7">
                            <span className="text-muted">EMAIL:</span> <span className="table-primary-text fw-medium">{user.email}</span>
                        </div>
                        <div className="p-2 border rounded bg-workspace-card font-monospace fs-7">
                            <span className="text-muted">ACCESS_ROLE:</span> <span className="table-primary-text fw-semibold text-cyan">{user.role.toUpperCase()}</span>
                        </div>
                        <div className="p-2 border rounded bg-workspace-card font-monospace fs-7 d-flex justify-content-between align-items-center">
                            <span className="text-muted">CORE_LIFECYCLE_STATE:</span>
                            <span className={`badge-pill-premium ${user.isSuspended ? "destructive" : "success"}`}>
                                {user.isSuspended ? "SUSPENDED" : "ACTIVE_ROUTE"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Subscription Matrix Detail View */}
                <div className="col-12 col-md-6">
                    <h4 className="workspace-section-heading mb-3" style={{ opacity: 0.85 }}>SERVICE_ALLOTMENT_LEDGER</h4>
                    
                    <div className="border rounded p-3 h-100 min-h-140 bg-workspace-card position-relative">
                        {user.isSubscribed && subscription && plan ? (
                            <div className="d-flex flex-column gap-2">
                                <div className="fs-6 fw-semibold table-primary-text mb-1">{plan.planTitle}</div>
                                
                                <div className="d-flex justify-content-between font-monospace fs-7 border-bottom pb-1">
                                    <span className="text-muted">RATE_CONFIGURATION:</span>
                                    <span className="text-emerald fw-medium">${plan.planPrice.toFixed(2)}</span>
                                </div>
                                <div className="d-flex justify-content-between font-monospace fs-7 border-bottom pb-1">
                                    <span className="text-muted">ALLOTMENT_STATE:</span>
                                    <span className={subscription.subcriptionStatus === "active" ? "text-emerald fw-semibold" : "text-destructive fw-semibold"}>
                                        {subscription.subcriptionStatus.toUpperCase()}
                                    </span>
                                </div>
                                <div className="font-monospace fs-8 text-muted mt-1">
                                    TERM: {new Date(subscription.subcriptionStartDate).toLocaleDateString()} &rarr; {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                                </div>
                            </div>
                        ) : (
                            <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-3">
                                <div className="font-monospace text-muted fs-7 mb-1">NO_ACTIVE_PROVISION_POLICIES</div>
                                <div className="fs-8 text-muted italic">Identity is currently operating on generic infrastructure limits.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* State Alteration Controls */}
            <div className="border-top pt-3 mt-4 text-end">
                <button
                    className={`sidebar-nav-item w-auto d-inline-flex px-4 py-2 m-0 font-monospace fs-7 ${user.isSuspended ? "active border-success text-success" : "border-danger text-danger"}`}
                    style={{ background: "transparent" }}
                    onClick={() => setShowConfirm(true)}
                >
                    {user.isSuspended ? "EXECUTE_REVOCATION_RESTORATION" : "INITIALIZE_TERMINAL_SUSPENSION"}
                </button>
            </div>

            {/* Modal Layer Backdrop System */}
            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(10, 14, 22, 0.75)", backdropFilter: "blur(4px)", zIndex: 999 }}
                >
                    <div className="premium-metric-card-wrapper border rounded p-4 bg-workspace-card" style={{ width: 400, maxWidth: "90%" }}>
                        <div className="d-flex align-items-center mb-3 text-warning gap-2 font-monospace fs-7 fw-semibold">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            CONFIRM_OPERATIONAL_OVERRIDE
                        </div>

                        <p className="text-muted font-monospace fs-7 mb-4">
                            {user.isSuspended
                                ? `Confirming this instruction will restore network access and allocation matrices for node target identifier [ ${user.username} ].`
                                : `Confirming this instruction will drop all active route allocations and block access mechanics for node target identifier [ ${user.username} ].`}
                        </p>

                        <div className="d-flex gap-2 justify-content-end border-top pt-3">
                            <button
                                className="btn-workspace-action font-monospace fs-8 px-3"
                                onClick={() => setShowConfirm(false)}
                            >
                                ABORT_OPERATION
                            </button>

                            <button
                                className={`sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-8 ${user.isSuspended ? "bg-emerald text-white" : "bg-destructive text-white"}`}
                                onClick={onToggleSuspend}
                            >
                                {user.isSuspended ? "COMMIT_RESTORATION" : "COMMIT_SUSPENSION"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewAccount