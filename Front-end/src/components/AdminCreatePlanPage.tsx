import { apiFetch } from "../lib/api"
import { useState } from "react"
import type { Plan } from "../Type"
import toast from "react-hot-toast"

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

    const handleSubmit = async () => {
        if (!form.planTitle || !form.encMethod) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            const response = await apiFetch("http://localhost:8080/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form)
            })

            if (!response.ok) {
                toast.error("Failed to create plan")
                return
            }

            const data: Plan = await response.json()
            onCreate(data)
            setForm(emptyForm)
            toast.success("Plan created successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    return (
        <div className="card p-4">
            <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
                ← Back
            </button>

            <h5 className="mb-3">Create New Plan</h5>

            <div className="mb-3">
                <label className="form-label">Plan Title</label>
                <input
                    className="form-control"
                    value={form.planTitle}
                    onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                />
            </div>

            <div className="mb-3">
                <label className="form-label">Price ($/month)</label>
                <input
                    className="form-control"
                    type="number"
                    value={form.planPrice}
                    onChange={(e) => setForm({ ...form, planPrice: Number(e.target.value) || 0 })}
                />
            </div>

            <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                    className="form-control"
                    rows={3}
                    value={form.planDescription}
                    onChange={(e) => setForm({ ...form, planDescription: e.target.value })}
                />
            </div>

            <div className="mb-4">
                <label className="form-label">Encryption Method</label>
                <select
                    className="form-select"
                    value={form.encMethod}
                    onChange={(e) => setForm({ ...form, encMethod: e.target.value })}
                >
                    <option value="">Select encryption method...</option>
                    {encMethods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
            </div>

            <button className="btn btn-primary" onClick={handleSubmit}>
                Create Plan
            </button>
        </div>
    )
}

export default AdminCreatePlan