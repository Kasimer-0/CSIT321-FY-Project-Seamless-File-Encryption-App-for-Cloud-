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
        <div className="card p-4">
            <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
                ← Back
            </button>

            <h5>{user.username}</h5>

            <p className="text-muted mb-1">User ID: {user.userID}</p>
            <p className="text-muted mb-1">Email: {user.email}</p>
            <p className="text-muted mb-1">Role: {user.role}</p>

            <p className="text-muted mb-2">
                Account Status:{" "}
                {user.isSuspended ? (
                    <span className="text-danger fw-medium">Suspended</span>
                ) : (
                    <span className="text-success fw-medium">Active</span>
                )}
            </p>

            {/* Subscription */}
            <h6 className="mb-2"><u>Subscription</u></h6>

            {user.isSubscribed && subscription && plan ? (
                <>
                    <p className="mb-1">
                        Plan: <strong>{plan.planTitle}</strong>
                    </p>

                    <p className="mb-1">
                        Price: ${plan.planPrice}
                    </p>

                    <p className="mb-1">
                        Status:{" "}
                        <span
                            className={
                                subscription.subcriptionStatus === "active"
                                    ? "text-success fw-medium"
                                    : "text-danger fw-medium"
                            }
                        >
                            {subscription.subcriptionStatus}
                        </span>
                    </p>

                    <p className="mb-1">
                            Duration:{" "}
                            <span className="text-muted">
                                {new Date(subscription.subcriptionStartDate).toLocaleDateString()}
                                {" → "}
                                {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                            </span>
                    </p>
                </>
            ) : (
                <p className="text-muted mb-0">Unsubscribed</p>
            )}


            {/* Suspend button */}
            <button
                className={`btn ${user.isSuspended ? "btn-success" : "btn-danger"}`}
                onClick={() => setShowConfirm(true)}
            >
                {user.isSuspended ? "Unsuspend Account" : "Suspend Account"}
            </button>

            {/* Confirmation prompt */}
            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                >
                    <div className="card p-4" style={{ width: 360 }}>
                        <h6 className="mb-2">
                            {user.isSuspended ? "Unsuspend Account?" : "Suspend Account?"}
                        </h6>

                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            {user.isSuspended
                                ? `This will restore access for ${user.username}.`
                                : `This will block access for ${user.username}.`}
                        </p>

                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className={`btn ${user.isSuspended ? "btn-success" : "btn-danger"}`}
                                onClick={onToggleSuspend}
                            >
                                {user.isSuspended ? "Yes, Unsuspend" : "Yes, Suspend"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewAccount