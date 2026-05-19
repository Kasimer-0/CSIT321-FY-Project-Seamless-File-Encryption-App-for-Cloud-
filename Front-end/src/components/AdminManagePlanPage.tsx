import { useState, useEffect } from "react"
import type { Plan } from "../Entity"
import AdminCreatePlan from "./AdminCreatePlanPage"
import AdminViewPlan from "./AdminViewPlanPage"

function AdminManagePlan() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [encMethods, setEncMethods] = useState<string[]>([])
    const [view, setView] = useState<"list" | "detail" | "create">("list")
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [loading, setLoading] = useState(true)

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

    const handleCreate = async (form: Omit<Plan, "planID">) => {
        try {
            const response = await fetch("http://localhost:8080/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form)
            })

            if (!response.ok) {
                console.error("Failed to create plan")
                return
            }

            await fetchPlans()
            setView("list")

        } catch (err) {
            console.error("Server connection failed")
        }
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
                console.error("Failed to update plan")
                return
            }

            await fetchPlans()
            setSelectedPlan(updated)

        } catch (err) {
            console.error("Server connection failed")
        }
    }

    const handleToggleSuspend = async (plan: Plan) => {
        const newStatus = plan.planStatus === "active" ? "suspended" : "active"

        try {
            const response = await fetch(
                `http://localhost:8080/plans/${plan.planID}/suspend`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ planStatus: newStatus })
                }
            )

            if (!response.ok) {
                console.error("Failed to update plan status")
                return
            }

            await fetchPlans()
            setSelectedPlan({ ...plan, planStatus: newStatus })

        } catch (err) {
            console.error("Server connection failed")
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
                onToggleSuspend={handleToggleSuspend}
            />
        )
    }

    return (
        <>
            <div className="d-flex justify-content-end mb-3">
                <button
                    className="btn btn-primary"
                    onClick={() => setView("create")}
                >
                    + New Plan
                </button>
            </div>

            <ul className="list-group" style={{ maxHeight: 620, overflowY: "auto" }}>
                {loading ? (
                    <li className="list-group-item text-center text-muted">
                        Loading...
                    </li>
                ) : plans.length === 0 ? (
                    <li className="list-group-item text-muted text-center">
                        No plans found
                    </li>
                ) : (
                    plans.map(plan => (
                        <li
                            key={plan.planID}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelect(plan)}
                        >
                            <div>
                                <div className="fw-medium">{plan.planTitle}</div>
                                <small className="text-muted">
                                    {plan.encMethod} · ${plan.planPrice}/month
                                </small>
                            </div>
                            <span className={`badge ${plan.planStatus === "active" ? "bg-success" : "bg-danger"}`}>
                                {plan.planStatus}
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </>
    )
}

export default AdminManagePlan