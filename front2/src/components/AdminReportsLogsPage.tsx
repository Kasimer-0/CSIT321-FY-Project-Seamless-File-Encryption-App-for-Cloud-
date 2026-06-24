import { useEffect, useState } from "react"
import type { FinancialReport, PerformanceReport, SystemLog } from "../Type"

type View = "reports" | "logs"

function AdminReportsLogsPage() {
    const [view, setView] = useState<View>("reports")
    const [performance, setPerformance] = useState<PerformanceReport | null>(null)
    const [financial, setFinancial] = useState<FinancialReport | null>(null)
    const [logs, setLogs] = useState<SystemLog[]>([])
    const [flaggedOnly, setFlaggedOnly] = useState(false)
    const [loading, setLoading] = useState(true)

    // Inline dashboard diagnostic notification state
    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchReports = async () => {
        try {
            setLoading(true)
            const [performanceResponse, financialResponse] = await Promise.all([
                fetch("http://localhost:8080/admin/reports/performance", { credentials: "include" }),
                fetch("http://localhost:8080/admin/reports/financial", { credentials: "include" }),
            ])
            if (!performanceResponse.ok || !financialResponse.ok) {
                triggerBanner("Failed to aggregate downstream analytics telemetry profiles.", "error")
                return
            }
            setPerformance(await performanceResponse.json())
            setFinancial(await financialResponse.json())
        } catch {
            triggerBanner("Core telemetry server connection timeout.", "error")
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
                triggerBanner("Security incident audit log frame loading rejected.", "error")
                return
            }
            setLogs(await response.json())
        } catch {
            triggerBanner("Audit log index server handshake fault.", "error")
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
            {/* View Switcher Controls */}
            <div className="d-flex justify-content-between align-items-center mb-4 gap-3">
                <div className="workspace-tab-container d-flex border-bottom flex-grow-1">
                    <button 
                        className={`workspace-tab-btn font-monospace ${view === "reports" ? "active" : ""}`} 
                        onClick={() => setView("reports")}
                    >
                        METRIC_ANALYTICS_CORE
                    </button>
                    <button 
                        className={`workspace-tab-btn font-monospace ${view === "logs" ? "active" : ""}`} 
                        onClick={() => setView("logs")}
                    >
                        AUDIT_EVENT_TRAIL
                    </button>
                </div>

                {view === "logs" && (
                    <button 
                        className={`sidebar-nav-item w-auto px-3 py-1.5 m-0 font-monospace fs-7 ${flaggedOnly ? "active" : "border"}`} 
                        onClick={() => setFlaggedOnly(v => !v)}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2">
                            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                            <line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {flaggedOnly ? "FLAGGED_ONLY_ACTIVE" : "FILTER_SUSPICIOUS"}
                    </button>
                )}
            </div>

            {/* Premium Notification Banner Anchor */}
            <div className="status-message-container">
                {bannerMessage && (
                    <div className={`status-banner ${bannerType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{bannerMessage}</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center text-muted py-5 font-monospace fs-7">
                    <span className="spinner-border spinner-border-sm text-cyan me-2" role="status"></span>
                    Assembling target data metrics vectors...
                </div>
            ) : view === "reports" ? (
                <div className="d-flex flex-column gap-4">
                    
                    {/* Performance Metrics Group */}
                    <div className="premium-metric-card-wrapper border rounded p-4">
                        <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                            <div>
                                <h4 className="workspace-section-heading mb-1">System Operational Capacity</h4>
                                <p className="text-muted small mb-0 font-monospace">
                                    Matrix Generation Timestamp: {performance?.generatedAt ? new Date(performance.generatedAt).toLocaleString() : "SYNC_PENDING"}
                                </p>
                            </div>
                            <button className="btn-workspace-action font-monospace fs-8" onClick={() => download("/admin/reports/performance/download")}>
                                EXPORT_PERF_CSV
                            </button>
                        </div>
                        <div className="row g-3">
                            {performance && [
                                ["Total Directory Registries", performance.totalUsers],
                                ["Premium Route Allocations", performance.premiumUsers],
                                ["Open Pipeline Incidents", performance.openTickets],
                                ["Encrypted Vault Files", performance.encryptedFiles],
                                ["Global Cloud Node Vectors", performance.cloudLinks],
                                ["Active Route Disseminations", performance.activeCloudLinks],
                            ].map(([label, value]) => (
                                <div className="col-6 col-lg-4" key={label}>
                                    <div className="border rounded px-3 py-2 bg-workspace-card">
                                        <div className="text-muted small font-monospace fs-8 uppercase mb-1">{label}</div>
                                        <div className="fw-bold fs-4 font-monospace text-cyan">{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Metrics Group */}
                    <div className="premium-metric-card-wrapper border rounded p-4">
                        <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                            <div>
                                <h4 className="workspace-section-heading mb-1">Financial Allotment Ledger</h4>
                                <p className="text-muted small mb-0 font-monospace">
                                    Ledger Settlement Timestamp: {financial?.generatedAt ? new Date(financial.generatedAt).toLocaleString() : "SYNC_PENDING"}
                                </p>
                            </div>
                            <button className="btn-workspace-action font-monospace fs-8" onClick={() => download("/admin/reports/financial/download")}>
                                EXPORT_FIN_CSV
                            </button>
                        </div>
                        <div className="row g-3">
                            {financial && [
                                ["Active Service Subscriptions", financial.activeSubscriptions],
                                ["Aggregated Monthly Revenue Run-Rate", `$${financial.monthlyRevenue.toFixed(2)}`],
                                ["Premium Plan Deployments", financial.paidPlanCount],
                                ["Average Yield Per Allocation", `$${financial.averageRevenuePerSubscription.toFixed(2)}`],
                            ].map(([label, value]) => (
                                <div className="col-6 col-lg-3" key={label}>
                                    <div className="border rounded px-3 py-2 bg-workspace-card">
                                        <div className="text-muted small font-monospace fs-8 uppercase mb-1">{label}</div>
                                        <div className="fw-bold fs-4 font-monospace text-emerald">{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* System Audit Trail Stream Components */
                <div className="premium-metric-card-wrapper border rounded p-4">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                        <div>
                            <h4 className="workspace-section-heading mb-1">
                                {flaggedOnly ? "Anomalous Identity Activity Register" : "Global Master Access Audit Stream"}
                            </h4>
                            <p className="text-muted small mb-0 font-monospace">Live monitoring transaction buffer parameters.</p>
                        </div>
                        <button className="btn-workspace-action font-monospace fs-8" onClick={() => download("/admin/logs/download")}>
                            EXPORT_AUDIT_CSV
                        </button>
                    </div>
                    
                    <div className="premium-data-table-scroll" style={{ maxHeight: "480px", overflowY: "auto" }}>
                        <table className="premium-workspace-table">
                            <thead>
                                <tr>
                                    <th>Identity Coordinate</th>
                                    <th>Executed Operation Payload</th>
                                    <th>Origin Network Vector</th>
                                    <th>Execution Timestamp</th>
                                    <th className="text-end">Risk Flag Matrix Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center text-muted py-5 font-monospace fs-7">
                                            No tracking activities listed within the selected audit frame scope
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.logId}>
                                            <td className="fw-semibold font-monospace fs-7 table-primary-text">{log.username}</td>
                                            <td>
                                                <div className="table-primary-text">{log.action}</div>
                                                <div className="text-muted table-sub-text">EVENT_ID: {log.logId}</div>
                                            </td>
                                            <td>
                                                <span className="font-monospace text-muted fs-7">{log.ipAddress}</span>
                                            </td>
                                            <td>
                                                <span className="text-muted fs-7">{new Date(log.timestamp).toLocaleString()}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`badge-pill-premium ${log.isSuspicious ? "destructive" : "success"}`}>
                                                    {log.isSuspicious ? (log.aiRiskReason || "ANOMALY_DETECTED").toUpperCase() : "SECURE_ROUTE"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminReportsLogsPage