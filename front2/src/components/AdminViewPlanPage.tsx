import { useState } from "react"
import type { Plan } from "../Type"

type AdminViewPlanProps = {
    plan: Plan
    encMethods: string[]
    onBack: () => void
    onEdit: (updated: Plan) => void
    onUpdateStatus: (plan: Plan, status: "active" | "inactive") => void
}

function AdminViewPlan({
    plan,
    encMethods,
    onBack,
    onEdit,
    onUpdateStatus
}: AdminViewPlanProps) {

    const [isEditing, setIsEditing] = useState(false)

    const [form, setForm] = useState({
        planTitle: plan.planTitle,
        planPrice: plan.planPrice,
        planDescription: plan.planDescription,
        encMethod: plan.encMethod,
    })

    const [showConfirm, setShowConfirm] = useState(false)
    const [actionType, setActionType] = useState<"publish" | "suspend" | "save" | "cancel" | null>(null)

    const openConfirm = (type: "publish" | "suspend" | "save" | "cancel") => {
        setActionType(type)
        setShowConfirm(true)
    }

    const handleConfirm = () => {
        if (!actionType) return

        if (actionType === "save") {
            onEdit({ ...plan, ...form })
            setIsEditing(false)
        } else if (actionType === "cancel") {
            setForm({
                planTitle: plan.planTitle,
                planPrice: plan.planPrice,
                planDescription: plan.planDescription,
                encMethod: plan.encMethod,
            })
            setIsEditing(false)
        } else {
            const newStatus: "active" | "inactive" = actionType === "publish" ? "active" : "inactive"
            onUpdateStatus(plan, newStatus)
        }

        setShowConfirm(false)
        setActionType(null)
    }

    if (isEditing) {
        return (
            <div className="premium-metric-card-wrapper border rounded p-4 text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                    <button 
                        className="btn border-0 fw-semibold text-white px-3 py-2 d-inline-flex align-items-center justify-content-center" 
                        style={{ 
                            fontSize: "13px", 
                            backgroundColor: "#27272a", 
                            borderRadius: "6px",
                            lineHeight: "1"
                        }}
                        onClick={() => openConfirm("cancel")}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        CANCEL EDIT
                    </button>
                </div>

                <h4 className="fw-semibold mb-4 text-white" style={{ fontSize: "18px" }}>Edit Plan</h4>

                <div className="d-flex flex-column gap-3 mb-4">
                    <div>
                        <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Title</label>
                        <input
                            className="form-control text-white border px-3 py-2.5"
                            style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", borderRadius: "6px" }}
                            value={form.planTitle}
                            onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Monthly Price (USD)</label>
                        <div className="input-group">
                            <span className="input-group-text border px-3" style={{ backgroundColor: "#141417", borderColor: "#27272a", color: "#a1a1aa", fontSize: "14px" }}>$</span>
                            <input
                                className="form-control text-white border px-3 py-2.5"
                                style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", borderTopLeftRadius: "0", borderBottomLeftRadius: "0" }}
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.planPrice}
                                onChange={(e) => {
                                    const parsedVal = parseFloat(e.target.value) || 0
                                    setForm({ ...form, planPrice: Math.max(0, parsedVal) })
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Encryption Method</label>
                        <select
                            className="form-select text-white border px-3 py-2.5"
                            style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", borderRadius: "6px" }}
                            value={form.encMethod}
                            onChange={(e) => setForm({ ...form, encMethod: e.target.value })}
                        >
                            <option value="" style={{ color: "#a1a1aa" }}>Select an encryption method...</option>
                            {encMethods.map((method) => (
                                <option key={method} value={method} style={{ backgroundColor: "#18181b" }}>
                                    {method.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Description</label>
                        <textarea
                            className="form-control text-white border px-3 py-2.5"
                            style={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "14px", borderRadius: "6px", lineHeight: "1.6" }}
                            rows={7}
                            value={form.planDescription}
                            onChange={(e) => setForm({ ...form, planDescription: e.target.value })}
                        />
                    </div>
                </div>

                <div className="text-end border-top pt-3" style={{ borderColor: "#27272a" }}>
                    <button 
                        className="btn border-0 fw-semibold text-white px-4 py-2.5" 
                        style={{ backgroundColor: "#06b6d4", fontSize: "14px", borderRadius: "6px" }} 
                        onClick={() => openConfirm("save")}
                    >
                        Save Changes
                    </button>
                </div>

                {showConfirm && (actionType === "save" || actionType === "cancel") && (
                    <div
                        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{ background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(4px)", zIndex: 999 }}
                    >
                        <div className="border rounded p-4 text-white text-center" style={{ width: 360, maxWidth: "90%", backgroundColor: "#18181b", borderColor: "#27272a" }}>
                            <div className="d-flex align-items-center justify-content-center mx-auto mb-3 rounded-circle" 
                                 style={{ 
                                     width: "48px", 
                                     height: "48px", 
                                     backgroundColor: actionType === "save" ? "rgba(6, 182, 212, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                                     color: actionType === "save" ? "#06b6d4" : "#ef4444" 
                                 }}>
                                {actionType === "save" ? (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                ) : (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                                    </svg>
                                )}
                            </div>
                            
                            <h5 className="fw-semibold text-white mb-2" style={{ fontSize: "16px" }}>
                                {actionType === "save" ? "Save Changes" : "Cancel Edit"}
                            </h5>
                            
                            <p className="mb-4" style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.5" }}>
                                {actionType === "save" 
                                    ? "Are you sure you want to update these modifications?" 
                                    : "Are you sure you want to discard your edits? All updates in this plan tier will be lost."}
                            </p>
                            
                            <div className="d-flex gap-2 justify-content-center w-100">
                                <button className="btn px-4 py-2.5 text-white fw-semibold flex-grow-1" style={{ fontSize: "13px", border: "1px solid #27272a", backgroundColor: "transparent", borderRadius: "6px" }} onClick={() => { setShowConfirm(false); setActionType(null); }}>Cancel</button>
                                <button 
                                    className="btn px-4 py-2.5 text-white fw-semibold border-0 flex-grow-1" 
                                    style={{ 
                                        fontSize: "13px", 
                                        backgroundColor: actionType === "save" ? "#06b6d4" : "#ef4444", 
                                        borderRadius: "6px" 
                                    }} 
                                    onClick={handleConfirm}
                                >
                                    {actionType === "save" ? "Save Changes" : "Discard Edits"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <button 
                    className="btn border-0 fw-semibold text-white px-3 py-2 d-inline-flex align-items-center justify-content-center" 
                    style={{ fontSize: "13px", backgroundColor: "#06b6d4", borderRadius: "6px", lineHeight: "1" }}
                    onClick={onBack}
                >
                    <svg width="12" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to Plans Tab
                </button>
                
                <span className="badge px-2.5 py-1 fw-semibold" style={{
                    fontSize: "12px",
                    borderRadius: "4px",
                    backgroundColor: plan.planStatus === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                    color: plan.planStatus === "active" ? "#10b981" : "#f43f5e"
                }}>
                    {plan.planStatus.charAt(0).toUpperCase() + plan.planStatus.slice(1)} Status
                </span>
            </div>

            <div className="d-flex flex-column gap-4 mb-4">
                <div>
                    <div className="font-monospace fs-8 mb-1 fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Title</div>
                    <div className="text-white fw-semibold" style={{ fontSize: "16px" }}>
                        {plan.planTitle}
                    </div>
                </div>

                <div>
                    <div className="font-monospace fs-8 mb-1 fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Price</div>
                    <div className="font-monospace fs-6 fw-semibold" style={{ color: "#10b981" }}>
                        ${plan.planPrice.toFixed(2)} / mo
                    </div>
                </div>

                <div>
                    <div className="font-monospace fs-8 mb-1 fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Encryption Method</div>
                    <div className="font-monospace fs-6 fw-semibold" style={{ color: "#06b6d4" }}>
                        {plan.encMethod ? plan.encMethod.toUpperCase() : "NULL_CYPHER"}
                    </div>
                </div>

                <div>
                    <div className="font-monospace fs-8 mb-1 fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Description</div>
                    <p className="text-white fs-7 mb-0" style={{ lineHeight: "1.6", color: "#e4e4e7" }}>
                        {plan.planDescription}
                    </p>
                </div>
            </div>

            <div className="d-flex gap-2 border-top pt-3 mt-4 flex-wrap" style={{ borderColor: "#27272a" }}>
                <button
                    className="btn border-0 fw-semibold text-white px-3 py-2.5"
                    style={{ backgroundColor: "#27272a", fontSize: "13px", borderRadius: "6px" }}
                    onClick={() => setIsEditing(true)}
                >
                    Update Plan
                </button>

                <button
                    className="btn fw-semibold px-3 py-2 border-0 text-white"
                    style={{ 
                        fontSize: "13px",
                        borderRadius: "6px",
                        backgroundColor: plan.planStatus === "active" ? "#27272a" : "#10b981",
                        color: plan.planStatus === "active" ? "#71717a" : "#ffffff",
                        cursor: plan.planStatus === "active" ? "not-allowed" : "pointer"
                    }}
                    disabled={plan.planStatus === "active"}
                    onClick={() => openConfirm("publish")}
                >
                    Publish Plan
                </button>

                <button
                    className="btn fw-semibold px-3 py-2 border-0 text-white"
                    style={{ 
                        fontSize: "13px",
                        borderRadius: "6px",
                        backgroundColor: plan.planStatus === "inactive" ? "#27272a" : "#f43f5e",
                        color: plan.planStatus === "inactive" ? "#71717a" : "#ffffff",
                        cursor: plan.planStatus === "inactive" ? "not-allowed" : "pointer"
                    }}
                    disabled={plan.planStatus === "inactive"}
                    onClick={() => openConfirm("suspend")}
                >
                    Suspend Plan
                </button>
            </div>

            {showConfirm && (actionType === "publish" || actionType === "suspend") && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(4px)", zIndex: 999 }}
                >
                    <div className="border rounded p-4 text-white text-center" style={{ width: 360, maxWidth: "90%", backgroundColor: "#18181b", borderColor: "#27272a" }}>
                        
                        <div className="d-flex align-items-center justify-content-center mx-auto mb-3 rounded-circle" 
                             style={{ width: "48px", height: "48px", backgroundColor: actionType === "publish" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)", color: actionType === "publish" ? "#10b981" : "#f43f5e" }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>

                        <h5 className="fw-semibold text-white mb-2" style={{ fontSize: "16px" }}>
                            {actionType === "publish" ? "Confirm Publish?" : "Confirm Suspension?"}
                        </h5>

                        <p className="mb-4" style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.5" }}>
                            {actionType === "publish"
                                ? `Confirming this will publish [ ${plan.planTitle} ] for purchase.`
                                : `Confirming this will suspend [ ${plan.planTitle} ] from customer access.`}
                        </p>

                        <div className="d-flex gap-2 justify-content-center w-100">
                            <button
                                className="btn px-4 py-2.5 text-white fw-semibold flex-grow-1"
                                style={{ fontSize: "13px", border: "1px solid #27272a", backgroundColor: "transparent", borderRadius: "6px" }}
                                onClick={() => { setShowConfirm(false); setActionType(null); }}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn px-4 py-2.5 text-white fw-semibold border-0 flex-grow-1"
                                style={{ 
                                    fontSize: "13px", 
                                    backgroundColor: actionType === "publish" ? "#10b981" : "#f43f5e",
                                    borderRadius: "6px"
                                }}
                                onClick={handleConfirm}
                            >
                                {actionType === "publish" ? "Publish Plan" : "Suspend Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewPlan