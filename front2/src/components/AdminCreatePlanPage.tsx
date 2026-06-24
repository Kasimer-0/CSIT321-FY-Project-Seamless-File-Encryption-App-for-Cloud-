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
    
    // Internal status banners replacing external toast instances
    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const handleSubmit = async () => {
        if (!form.planTitle || !form.encMethod) {
            triggerBanner("Please configure all required operational parameters.", "error")
            return
        }

        try {
            const response = await fetch("http://localhost:8080/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form)
            })

            if (!response.ok) {
                triggerBanner("Failed to register the requested service provision plan layer.", "error")
                return
            }

            const data: Plan = await response.json()
            onCreate(data)
            setForm(emptyForm)
            triggerBanner("Service layer provision configuration committed successfully.", "success")

        } catch (err) {
            triggerBanner("Server network handshake verification failed.", "error")
        }
    }

    return (
        <>
            <div className="d-flex align-items-center gap-3 mb-4">
                <button className="btn-navbar-logout py-2 px-3" onClick={onBack}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to Matrix
                </button>
                <h2 className="navbar-active-title m-0">Provision New Service Plan</h2>
            </div>

            {/* Premium Inline Status Message Banner */}
            <div className="status-message-container">
                {bannerMessage && (
                    <div className={`status-banner ${bannerType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{bannerMessage}</span>
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label">Plan Title</label>
                <input
                    className="form-control"
                    placeholder="e.g., Enterprise Quantum Shield"
                    value={form.planTitle}
                    onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label">Price Matrix ($ / Month)</label>
                <input
                    className="form-control"
                    type="number"
                    placeholder="0.00"
                    value={form.planPrice}
                    onChange={(e) => setForm({ ...form, planPrice: Number(e.target.value) || 0 })}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label">Provision Metadata Description</label>
                <textarea
                    className="form-control py-3"
                    rows={3}
                    placeholder="Provide parameters and limits bound to this cryptographic tier..."
                    value={form.planDescription}
                    onChange={(e) => setForm({ ...form, planDescription: e.target.value })}
                />
            </div>

            <div className="form-group-custom mb-5">
                <label className="input-label">Cryptographic Encryption Core Method</label>
                <select
                    className="form-control form-select-premium"
                    value={form.encMethod}
                    onChange={(e) => setForm({ ...form, encMethod: e.target.value })}
                >
                    <option value="">Select target cipher runtime array...</option>
                    {encMethods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
            </div>

            <button className="btn-premium-action w-auto px-5" onClick={handleSubmit}>
                Deploy Plan Protocol
            </button>
        </>
    )
}

export default AdminCreatePlan