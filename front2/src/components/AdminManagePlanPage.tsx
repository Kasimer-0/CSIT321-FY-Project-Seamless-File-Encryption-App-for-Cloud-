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

    // Inline notifications replacing toaster overhead
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
                console.error("Failed to fetch plans")
                return
            }

            const data = await response.json()
            setPlans(data)
        } catch (err) {
            console.error("Server connection failed")
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
                console.error("Failed to fetch encryption methods")
                return
            }

            const data = await response.json()
            setEncMethods(data)
        } catch (err) {
            console.error("Server connection failed")
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
        triggerBanner("Provision layer matrix successfully initialized.", "success")
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
                triggerBanner("Failed to sync parameter modifications.", "error")
                return
            }

            await fetchPlans()
            setSelectedPlan(updated)
            triggerBanner("Plan parameters modified and distributed.", "success")
        } catch (err) {
            triggerBanner("Network handshake fault during synchronization.", "error")
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
                triggerBanner("Failed to transition route status state.", "error")
                return
            }

            await fetchPlans()
            setSelectedPlan({ ...plan, planStatus: status })
            triggerBanner(`Service tier route successfully set to: ${status.toUpperCase()}`, "success")
        } catch (err) {
            triggerBanner("Network layer dropped during state configuration change.", "error")
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
        <>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h3 className="workspace-section-heading mb-1">Active Provision Profiles</h3>
                    <p className="text-muted small mb-0 font-monospace">Manage service tier pricing and internal cipher arrays.</p>
                </div>
                <button
                    className="sidebar-nav-item active w-auto px-4 m-0"
                    onClick={() => setView("create")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Plan Profile
                </button>
            </div>

            {/* Inline Workspace Context Status Banner */}
            <div className="status-message-container">
                {bannerMessage && (
                    <div className={`status-banner ${bannerType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{bannerMessage}</span>
                    </div>
                )}
            </div>

            <div className="premium-data-table-scroll" style={{ maxHeight: "620px", overflowY: "auto" }}>
                <table className="premium-workspace-table">
                    <thead>
                        <tr>
                            <th>Service Provision Core</th>
                            <th>Encryption Core Protocol</th>
                            <th>Pricing Tier</th>
                            <th className="text-end">Routing State Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center text-muted py-5 font-monospace fs-7">
                                    <span className="spinner-border spinner-border-sm text-cyan me-2" role="status"></span>
                                    Querying catalog matrix definitions...
                                </td>
                            </tr>
                        ) : plans.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-muted py-5 font-monospace fs-7">
                                    No registered plan configurations discovered inside core databases
                                </td>
                            </tr>
                        ) : (
                            plans.map(plan => (
                                <tr key={plan.planID} onClick={() => handleSelect(plan)}>
                                    <td>
                                        <div className="fw-semibold table-primary-text">{plan.planTitle}</div>
                                        <div className="text-muted table-sub-text">UUID Ref: {plan.planID}</div>
                                    </td>
                                    <td>
                                        <span className="font-monospace text-muted fs-7">{plan.encMethod || "UNASSIGNED_CORE"}</span>
                                    </td>
                                    <td>
                                        <span className="fw-medium text-cyan font-monospace">${plan.planPrice}<span className="text-muted fs-8">/mo</span></span>
                                    </td>
                                    <td className="text-end">
                                        <span className={`badge-pill-premium ${plan.planStatus === "active" ? "success" : "destructive"}`}>
                                            {plan.planStatus.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default AdminManagePlan