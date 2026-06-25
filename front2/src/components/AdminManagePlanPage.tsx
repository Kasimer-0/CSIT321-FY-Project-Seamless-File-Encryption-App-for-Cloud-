import { useState, useEffect } from "react"
import type { Plan } from "../Type"
import AdminCreatePlan from "./AdminCreatePlanPage"
import AdminViewPlan from "./AdminViewPlanPage"

function AdminManagePlan() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [encMethods, setEncMethods] = useState<string[]>([])
    const [view, setView] = useState<"list" | "detail" | "create">("list")
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [loading, setLoading] = useState(true)

    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchPlans = async () => {
        try {
            setLoading(true)
            const response = await fetch("http://localhost:8080/plans", {
                credentials: "include"
            })

            if (!response.ok) {
                triggerBanner("Failed to retrieve plans.", "error")
                return
            }

            const data = await response.json()
            setPlans(data)
        } catch (err) {
            triggerBanner("Server connection failed.", "error")
        } finally {
            setLoading(false)
        }
    }

    const fetchEncMethods = async () => {
        try {
            const response = await fetch("http://localhost:8080/enc-methods", {
                credentials: "include"
            })

            if (!response.ok) {
                triggerBanner("Failed to retrieve encryption methods.", "error")
                return
            }

            const data = await response.json()
            setEncMethods(data)
        } catch (err) {
            triggerBanner("Server connection failed.", "error")
        }
    }

    useEffect(() => {
        fetchPlans()
        fetchEncMethods()
    }, [])

    const handleSelect = (plan: Plan) => {
        setSelectedPlan(plan)
        setView("detail")
    }

    const handleBack = () => {
        setView("list")
        setSelectedPlan(null)
        fetchPlans()
    }

    const handleCreate = (plan: Plan) => {
        setPlans(prev => [...prev, plan])
        setView("list")
        triggerBanner("Plan created successfully.", "success")
    }

    const handleEdit = async (updated: Plan) => {
        try {
            const response = await fetch(
                `http://localhost:8080/plans/${updated.planID}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(updated)
                }
            )

            if (!response.ok) {
                triggerBanner("Failed to update plan.", "error")
                return
            }

            await fetchPlans()
            setSelectedPlan(updated)
            triggerBanner("Plan updated successfully.", "success")
        } catch (err) {
            triggerBanner("Failed to update plan.", "error")
        }
    }

    const handleUpdateStatus = async (plan: Plan, status: "active" | "inactive") => {
        try {
            const response = await fetch(
                `http://localhost:8080/plans/${plan.planID}/status`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ planStatus: status })
                }
            )

            if (!response.ok) {
                triggerBanner("Failed to update plan status.", "error")
                return
            }

            await fetchPlans()
            setSelectedPlan({ ...plan, planStatus: status })
            triggerBanner(`Plan status successfully set to: ${status.toUpperCase()}`, "success")
        } catch (err) {
            triggerBanner("Failed to update plan status.", "error")
        }
    }

    if (view === "create") {
        return (
            <AdminCreatePlan
                encMethods={encMethods}
                onBack={handleBack}
                onCreate={handleCreate}
            />
        )
    }

    if (view === "detail" && selectedPlan) {
        return (
            <AdminViewPlan
                plan={selectedPlan}
                encMethods={encMethods}
                onBack={handleBack}
                onEdit={handleEdit}
                onUpdateStatus={handleUpdateStatus}
            />
        )
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 position-relative text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "22px" }}>Plans</h3>
                    <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>Select a plan belowto view its details.</p>
                </div>
                <button
                    className="btn border-0 fw-semibold text-white px-4 py-3 d-inline-flex align-items-center justify-content-center"
                    style={{ 
                        fontSize: "15px", 
                        backgroundColor: "#06b6d4", 
                        borderRadius: "6px",
                        lineHeight: "1",
                        letterSpacing: "0.02em"
                    }}
                    onClick={() => setView("create")}
                >
                    + New Plan
                </button>
            </div>

            {bannerMessage && (
                <div className="p-3 mb-4 rounded border d-flex align-items-center gap-2" style={{ 
                    backgroundColor: bannerType === "error" ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)", 
                    borderColor: bannerType === "error" ? "#f43f5e" : "#10b981",
                    color: bannerType === "error" ? "#f43f5e" : "#10b981",
                    fontSize: "13px"
                }}>
                    <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }}></span>
                    <span>{bannerMessage}</span>
                </div>
            )}

            <div className="table-responsive" style={{ maxHeight: "620px", overflowY: "auto" }}>
                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#141417" }}>
                    <thead>
                        <tr className="small tracking-wider" style={{ borderBottom: "2px solid #27272a", color: "#a1a1aa" }}>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Plan Tier</th>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Encryption Method</th>
                            <th className="bg-transparent py-3 text-uppercase fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Pricing Tier</th>
                            <th className="bg-transparent py-3 text-uppercase text-end fw-semibold" style={{ fontSize: "12px", color: "#a1a1aa" }}>Plan Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                    <div className="spinner-border spinner-border-sm text-cyan me-2" role="status"></div>
                                    Querying Plan database...
                                </td>
                            </tr>
                        ) : plans.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-5" style={{ color: "#a1a1aa", backgroundColor: "transparent", borderBottom: "none", fontSize: "14px" }}>
                                    No plan records found.
                                </td>
                            </tr>
                        ) : (
                            plans.map(plan => (
                                <tr 
                                    key={plan.planID} 
                                    onClick={() => handleSelect(plan)}
                                    style={{ cursor: "pointer", borderBottom: "1px solid #27272a" }}
                                >
                                    <td className="bg-transparent py-3">
                                        <div className="fw-semibold text-white mb-0" style={{ fontSize: "15px" }}>{plan.planTitle}</div>
                                        <div className="small" style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}>Plan ID: {plan.planID}</div>
                                    </td>
                                    <td className="bg-transparent py-3" style={{ fontSize: "14px", color: "#e4e4e7" }}>
                                        {plan.encMethod || "Unspecified"}
                                    </td>
                                    <td className="bg-transparent py-3" style={{ fontSize: "14px" }}>
                                        <span className="fw-medium text-cyan">
                                            ${plan.planPrice.toFixed(2)}
                                            <span className="small ms-1" style={{ fontSize: "12px", color: "#a1a1aa" }}>/month</span>
                                        </span>
                                    </td>
                                    <td className="bg-transparent py-3 text-end">
                                        <span className="badge px-2.5 py-1 fw-medium" style={{
                                            fontSize: "12px",
                                            borderRadius: "4px",
                                            backgroundColor: plan.planStatus === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                                            color: plan.planStatus === "active" ? "#10b981" : "#f43f5e"
                                        }}>
                                            {plan.planStatus.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AdminManagePlan