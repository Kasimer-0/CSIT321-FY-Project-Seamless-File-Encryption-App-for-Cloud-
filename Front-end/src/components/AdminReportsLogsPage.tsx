import { useEffect, useState } from "react"
import type { FinancialReport, PerformanceReport, SystemLog } from "../Type"
import toast from "react-hot-toast"

type View = "reports" | "logs"

function AdminReportsLogsPage() {
    const [view, setView] = useState<View>("reports")
    const [performance, setPerformance] = useState<PerformanceReport | null>(null)
    const [financial, setFinancial] = useState<FinancialReport | null>(null)
    const [logs, setLogs] = useState<SystemLog[]>([])
    const [flaggedOnly, setFlaggedOnly] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchReports = async () => {
        try {
            setLoading(true)
            const [performanceResponse, financialResponse] = await Promise.all([
                fetch("http://localhost:8080/admin/reports/performance", { credentials: "include" }),
                fetch("http://localhost:8080/admin/reports/financial", { credentials: "include" }),
            ])
            if (!performanceResponse.ok || !financialResponse.ok) {
                toast.error("Failed to load reports")
                return
            }
            setPerformance(await performanceResponse.json())
            setFinancial(await financialResponse.json())
        } catch {
            toast.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    const fetchLogs = async (flagged: boolean) => {
        try {
            setLoading(true)
            const path = flagged ? "/admin/logs/flagged" : "/admin/logs"
            const response = await fetch(`http://localhost:8080${path}`, { credentials: "include" })
            if (!response.ok) {
                toast.error("Failed to load system logs")
                return
            }
            setLogs(await response.json())
        } catch {
            toast.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (view === "reports") {
            fetchReports()
        } else {
            fetchLogs(flaggedOnly)
        }
    }, [view, flaggedOnly])

    const download = (path: string) => {
        window.location.href = `http://localhost:8080${path}`
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="btn-group">
                    <button className={`btn btn-sm ${view === "reports" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setView("reports")}>
                        Reports
                    </button>
                    <button className={`btn btn-sm ${view === "logs" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setView("logs")}>
                        System Logs
                    </button>
                </div>
                {view === "logs" && (
                    <button className={`btn btn-sm ${flaggedOnly ? "btn-warning" : "btn-outline-warning"}`} onClick={() => setFlaggedOnly(v => !v)}>
                        {flaggedOnly ? "Showing Flagged" : "Show Flagged"}
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : view === "reports" ? (
                <div className="d-flex flex-column gap-3">
                    <div className="card p-3">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 className="mb-1">Performance Report</h6>
                                <small className="text-muted">Generated {performance?.generatedAt ? new Date(performance.generatedAt).toLocaleString() : "-"}</small>
                            </div>
                            <button className="btn btn-outline-primary btn-sm" onClick={() => download("/admin/reports/performance/download")}>
                                Download CSV
                            </button>
                        </div>
                        <div className="row g-2 mt-3">
                            {performance && [
                                ["Total Users", performance.totalUsers],
                                ["Premium Users", performance.premiumUsers],
                                ["Open Tickets", performance.openTickets],
                                ["Encrypted Files", performance.encryptedFiles],
                                ["Cloud Links", performance.cloudLinks],
                                ["Active Cloud Links", performance.activeCloudLinks],
                            ].map(([label, value]) => (
                                <div className="col-6 col-lg-4" key={label}>
                                    <div className="border rounded p-2">
                                        <small className="text-muted">{label}</small>
                                        <div className="fw-bold fs-5">{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-3">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 className="mb-1">Financial Report</h6>
                                <small className="text-muted">Generated {financial?.generatedAt ? new Date(financial.generatedAt).toLocaleString() : "-"}</small>
                            </div>
                            <button className="btn btn-outline-primary btn-sm" onClick={() => download("/admin/reports/financial/download")}>
                                Download CSV
                            </button>
                        </div>
                        <div className="row g-2 mt-3">
                            {financial && [
                                ["Active Subscriptions", financial.activeSubscriptions],
                                ["Monthly Revenue", `$${financial.monthlyRevenue.toFixed(2)}`],
                                ["Paid Plans", financial.paidPlanCount],
                                ["Avg Revenue", `$${financial.averageRevenuePerSubscription.toFixed(2)}`],
                            ].map(([label, value]) => (
                                <div className="col-6 col-lg-3" key={label}>
                                    <div className="border rounded p-2">
                                        <small className="text-muted">{label}</small>
                                        <div className="fw-bold fs-5">{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">{flaggedOnly ? "Flagged System Logs" : "System Logs"}</h6>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => download("/admin/logs/download")}>
                            Download CSV
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>IP</th>
                                    <th>Time</th>
                                    <th>Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.logId}>
                                        <td>{log.username}</td>
                                        <td>{log.action}</td>
                                        <td>{log.ipAddress}</td>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${log.isSuspicious ? "bg-danger" : "bg-success"}`}>
                                                {log.isSuspicious ? log.aiRiskReason : "Normal"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminReportsLogsPage
