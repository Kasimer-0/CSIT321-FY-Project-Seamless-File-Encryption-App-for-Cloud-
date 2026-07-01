import { useState } from "react"
import type { Plan } from "../Type"

type CreatePlanProps = {
    encMethods: string[]
    onBack: () => void
    onCreate: (plan: Plan) => void
}

const emptyForm: Omit<Plan, "planID"> = {
    planTitle: "",
    planPrice: 0,
    planDescription: "",
    planStatus: "inactive",
    encMethod: "",
}

function AdminCreatePlan({ encMethods, onBack, onCreate }: CreatePlanProps) {
    const [form, setForm] = useState<Omit<Plan, "planID">>(emptyForm)
    const [submitting, setSubmitting] = useState(false)
    
    const [confirmState, setConfirmState] = useState<"none" | "return" | "create">("none")

    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const handleCreateClick = () => {
        if (!form.planTitle || !form.encMethod) {
            triggerBanner("Please fill in all required fields.", "error")
            return
        }
        if (form.planPrice < 0) {
            triggerBanner("Price cannot be a negative value.", "error")
            return
        }
        setConfirmState("create")
    }

    const executeCreate = async () => {
        setConfirmState("none")
        try {
            setSubmitting(true)
            const response = await fetch("http://localhost:8080/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form)
            })

            if (!response.ok) {
                triggerBanner("Failed to create plan.", "error")
                return
            }

            const data: Plan = await response.json()
            onCreate(data)
            setForm(emptyForm)
            triggerBanner("Plan created successfully.", "success")

        } catch (err) {
            triggerBanner("An error occurred while creating the plan.", "error")
        } finally {
            setSubmitting(false)
        }
    }

    const inputStyle = {
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        color: "#ffffff",
        fontSize: "14px",
        borderRadius: "6px"
    }

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}>
            
            {confirmState !== "none" && (
                <div 
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                    style={{ backgroundColor: "rgba(9, 9, 11, 0.85)", zIndex: 1050, backdropFilter: "blur(4px)" }}
                >
                    <div 
                        className="p-4 text-center border" 
                        style={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px", width: "100%", maxWidth: "420px" }}
                    >
                        <div className="mb-3">
                            <div 
                                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                style={{ 
                                    width: "56px", 
                                    height: "56px", 
                                    backgroundColor: confirmState === "return" ? "rgba(239, 68, 68, 0.1)" : "rgba(6, 182, 212, 0.1)",
                                    color: confirmState === "return" ? "#ef4444" : "#06b6d4"
                                }}
                            >
                                {confirmState === "return" ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>

                        <h3 className="text-white mb-2" style={{ fontSize: "18px", fontWeight: 600 }}>
                            {confirmState === "return" ? "Exit Creation?" : "Create Plan?"}
                        </h3>
                        <p className="mb-4" style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.5" }}>
                            {confirmState === "return" 
                                ? "Are you sure you want to discard changes? Any unsaved development will be lost." 
                                : "Confirm creation of this plan to StealthSync."}
                        </p>

                        <div className="d-flex gap-2">
                            <button 
                                className="btn border-0 w-100 fw-semibold text-white py-2.5" 
                                style={{ backgroundColor: "#27272a", fontSize: "14px", borderRadius: "6px" }}
                                onClick={() => setConfirmState("none")}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn border-0 w-100 fw-semibold text-white py-2.5" 
                                style={{ 
                                    backgroundColor: confirmState === "return" ? "#ef4444" : "#06b6d4", 
                                    fontSize: "14px", 
                                    borderRadius: "6px" 
                                }}
                                onClick={confirmState === "return" ? onBack : executeCreate}
                            >
                                {confirmState === "return" ? "Confirm Exit" : "Confirm Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Interface Layout */}
            <div className="d-flex flex-column align-items-start gap-3 mb-2 border-bottom pb-2" style={{ borderColor: "#27272a" }}>
                <button 
                    className="btn border-0 fw-semibold text-white px-4 py-2.5 d-inline-flex align-items-center justify-content-center" 
                    style={{ fontSize: "14px", backgroundColor: "#ef4444", borderRadius: "6px", lineHeight: "1" }}
                    onClick={() => setConfirmState("return")} 
                    disabled={submitting}
                >
                    <svg width="14" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to Plan
                </button>
                
                <h2 className="navbar-active-title m-0 text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                    Create New Plan
                </h2>
            </div>

            {bannerMessage && (
                <div className="status-message-container mb-3">
                    <div className={`status-banner ${bannerType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{bannerMessage}</span>
                    </div>
                </div>
            )}

            <div className="d-flex flex-column gap-3 mb-4">
                <div>
                    <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Title</label>
                    <input
                        className="form-control"
                        style={inputStyle}
                        placeholder="e.g., Premium Gold Tier"
                        value={form.planTitle}
                        disabled={submitting}
                        onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                    />
                </div>

                <div>
                    <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Price ($ / Month)</label>
                    <input
                        className="form-control"
                        style={inputStyle}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.planPrice || ""}
                        disabled={submitting}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setForm({ ...form, planPrice: Math.max(0, val) })
                        }}
                    />
                </div>

                <div>
                    <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Encryption Method</label>
                    <select
                        className="form-select text-white"
                        style={inputStyle}
                        value={form.encMethod}
                        disabled={submitting}
                        onChange={(e) => setForm({ ...form, encMethod: e.target.value })}
                    >
                        <option value="" style={{ color: "#a1a1aa" }}>Select an encryption method...</option>
                        {encMethods.map((method) => (
                            <option key={method} value={method} style={{ backgroundColor: "#18181b" }}>{method.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="font-monospace fs-8 mb-1.5 d-block fw-medium" style={{ color: "#a1a1aa", letterSpacing: "0.02em" }}>Plan Description</label>
                    <textarea
                        className="form-control"
                        style={{ ...inputStyle, backgroundColor: "#09090b", lineHeight: "1.6" }}
                        rows={7}
                        placeholder="Provide description for the plan tier..."
                        value={form.planDescription}
                        disabled={submitting}
                        onChange={(e) => setForm({ ...form, planDescription: e.target.value })}
                    />
                </div>
            </div>

            <div className="text-start border-top pt-3" style={{ borderColor: "#27272a" }}>
                <button 
                    className="btn border-0 fw-bold text-white px-5 py-3" 
                    style={{ backgroundColor: "#06b6d4", fontSize: "15px", borderRadius: "6px", letterSpacing: "0.01em" }} 
                    onClick={handleCreateClick} 
                    disabled={submitting}
                >
                    {submitting ? "Creating Plan..." : "Create Plan"}
                </button>
            </div>
        </div>
    )
}

export default AdminCreatePlan