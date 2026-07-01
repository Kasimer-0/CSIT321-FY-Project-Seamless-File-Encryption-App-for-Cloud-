import { useEffect, useState } from "react"
import type { FinancialReport, PerformanceReport, SystemLog } from "../Type"

type View = "reports" | "logs"

function AdminReportsLogsPage() {
    const [view, setView] = useState<View>("reports")
    const [performance, setPerformance] = useState<PerformanceReport | null>(null)
    const [financial, setFinancial] = useState<FinancialReport | null>(null)
    const [logs, setLogs] = useState<SystemLog[]>([])
    const [flaggedOnly, setFlaggedOnly] = useState(false)
    
    const [reportsLoading, setReportsLoading] = useState(true)
    const [logsLoading, setLogsLoading] = useState(true)

    const [bannerMessage, setBannerMessage] = useState("")
    const [bannerType, setBannerType] = useState<"success" | "error">("success")

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setBannerMessage(msg)
        setBannerType(type)
        setTimeout(() => setBannerMessage(""), 4000)
    }

    const fetchReports = async () => {
        try {
            setReportsLoading(true)
            const [performanceResponse, financialResponse] = await Promise.all([
                fetch("http://localhost:8080/admin/reports/performance", { credentials: "include" }),
                fetch("http://localhost:8080/admin/reports/financial", { credentials: "include" }),
            ])
            if (!performanceResponse.ok || !financialResponse.ok) {
                triggerBanner("Failed to fetch reports.", "error")
                return
            }
            setPerformance(await performanceResponse.json())
            setFinancial(await financialResponse.json())
        } catch {
            triggerBanner("Failed to fetch reports.", "error")
        } finally {
            setReportsLoading(false)
        }
    }

    const fetchLogs = async (flagged: boolean) => {
        try {
            setLogsLoading(true)
            const path = flagged ? "/admin/logs/flagged" : "/admin/logs"
            const response = await fetch(`http://localhost:8080${path}`, { credentials: "include" })
            if (!response.ok) {
                triggerBanner("Failed to fetch logs.", "error")
                return
            }
            setLogs(await response.json())
        } catch {
            triggerBanner("Failed to fetch logs.", "error")
        } finally {
            setLogsLoading(false)
        }
    }

    useEffect(() => {
        if (view === "reports") {
            fetchReports()
        }
    }, [view])

    useEffect(() => {
        if (view === "logs") {
            fetchLogs(flaggedOnly)
        }
    }, [view, flaggedOnly])

    const download = (path: string) => {
        window.location.href = `http://localhost:8080${path}`
    }

    return (
        <div className="text-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="d-flex justify-content-between align-items-end mb-4 gap-3">
                <div className="d-flex flex-grow-1 gap-3" style={{ borderBottom: "1px solid #1f1f23" }}>
                    <button 
                        className="btn rounded-0 px-1 pb-2.5 pt-0 border-0" 
                        style={{ 
                            fontSize: "24px", 
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: view === "reports" ? "#06b6d4" : "#4b5563", 
                            borderBottom: view === "reports" ? "3px solid #06b6d4" : "3px solid transparent",
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            transition: "all 0.15s ease"
                        }} 
                        onClick={() => setView("reports")}
                    >
                        Reports
                    </button>
                    <button 
                        className="btn rounded-0 px-1 pb-2.5 pt-0 border-0" 
                        style={{ 
                            fontSize: "24px", 
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: view === "logs" ? "#06b6d4" : "#4b5563", 
                            borderBottom: view === "logs" ? "3px solid #06b6d4" : "3px solid transparent",
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            transition: "all 0.15s ease"
                        }} 
                        onClick={() => setView("logs")}
                    >
                        Activity Logs
                    </button>
                </div>

                {view === "logs" && (
                    <button 
                        className="btn d-flex align-items-center px-3 py-1.5 border-0 text-white" 
                        style={{ 
                            fontSize: "12px", 
                            fontWeight: 600,
                            borderRadius: "4px",
                            backgroundColor: flaggedOnly ? "#f43f5e" : "#1f1f23",
                            boxShadow: "none",
                            transition: "background-color 0.15s ease"
                        }} 
                        onClick={() => setFlaggedOnly(prev => !prev)}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-2">
                            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                            <line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {flaggedOnly ? "View All Logs" : "View Flagged Logs"}
                    </button>
                )}
            </div>

            {bannerMessage && (
                <div className="mb-4 p-3 rounded d-flex align-items-center gap-2" style={{ 
                    backgroundColor: bannerType === "error" ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)", 
                    border: bannerType === "error" ? "1px solid rgba(244, 63, 94, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)" 
                }}>
                    <span className="rounded-circle d-inline-block" style={{ 
                        width: "6px", 
                        height: "6px", 
                        backgroundColor: bannerType === "error" ? "#f43f5e" : "#10b981" 
                    }}></span>
                    <span style={{ fontSize: "13px", color: bannerType === "error" ? "#f43f5e" : "#10b981", fontWeight: 500 }}>
                        {bannerMessage}
                    </span>
                </div>
            )}

            {view === "reports" ? (
                reportsLoading ? (
                    <div className="text-center text-muted py-5" style={{ fontSize: "14px" }}>
                        <span className="spinner-border spinner-border-sm me-2" style={{ color: "#06b6d4" }} role="status"></span>
                        Fetching reports...
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-4">
                        <div className="p-4 rounded text-white" style={{ backgroundColor: "#0c0c0e", border: "1px solid #1f1f23" }}>
                            <div className="d-flex justify-content-between align-items-start pb-3 mb-4" style={{ borderBottom: "1px solid #1f1f23" }}>
                                <div>
                                    <h4 className="fw-semibold m-0 mb-1" style={{ fontSize: "16px", color: "#ffffff" }}>Application Performance</h4>
                                    <p className="m-0" style={{ fontSize: "12px", color: "#e4e4e7" }}>
                                        Detailed metrics for StealthSync's performance.
                                    </p>
                                </div>
                                <button 
                                    className="btn text-white px-3 py-1.5 border-0" 
                                    style={{ backgroundColor: "#06b6d4", fontSize: "13px", fontWeight: 600, borderRadius: "6px", boxShadow: "none" }}
                                    onClick={() => download("/admin/reports/performance/download")}
                                >
                                    + Download Performance Report
                                </button>
                            </div>
                            <div className="row g-3">
                                {performance && [
                                    ["Total Application Users", performance.totalUsers ?? 0],
                                    ["Premium Tier Users", performance.premiumUsers ?? 0],
                                    ["Physical Tokens Registered", performance.physicalTokens ?? 0],
                                    ["Encrypted Files", performance.encryptedFiles ?? 0],
                                    ["Total Cloud Links", performance.cloudLinks ?? 0],
                                    ["Active Cloud Links", performance.activeCloudLinks ?? 0],
                                ].map(([label, value]) => (
                                    <div className="col-6 col-lg-4" key={label}>
                                        <div className="p-3 rounded" style={{ backgroundColor: "#141417", border: "none" }}>
                                            <div className="mb-1 text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.03em", color: "#ffffff", fontWeight: 600 }}>{label}</div>
                                            <div className="fw-bold" style={{ fontSize: "22px", color: "#06b6d4" }}>{value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded text-white" style={{ backgroundColor: "#0c0c0e", border: "1px solid #1f1f23" }}>
                            <div className="d-flex justify-content-between align-items-start pb-3 mb-4" style={{ borderBottom: "1px solid #1f1f23" }}>
                                <div>
                                    <h4 className="fw-semibold m-0 mb-1" style={{ fontSize: "16px", color: "#ffffff" }}>Financial Performance</h4>
                                    <p className="m-0" style={{ fontSize: "12px", color: "#e4e4e7" }}>
                                        Daily financial insights for StealthSync.
                                    </p>
                                </div>
                                <button 
                                    className="btn text-white px-3 py-1.5 border-0" 
                                    style={{ backgroundColor: "#06b6d4", fontSize: "13px", fontWeight: 600, borderRadius: "6px", boxShadow: "none" }}
                                    onClick={() => download("/admin/reports/financial/download")}
                                >
                                    + Download Financial Report
                                </button>
                            </div>
                            <div className="row g-3">
                                {financial && [
                                    ["Active Subscriptions", financial.activeSubscriptions ?? 0],
                                    ["Aggregated Monthly Revenue", financial.monthlyRevenue !== undefined && financial.monthlyRevenue !== null ? `$${financial.monthlyRevenue.toFixed(2)}` : "$0.00"],
                                    ["Premium Plan Count", financial.paidPlanCount ?? 0],
                                    ["Average Revenue Per Subscription", financial.averageRevenuePerSubscription !== undefined && financial.averageRevenuePerSubscription !== null ? `$${financial.averageRevenuePerSubscription.toFixed(2)}` : "$0.00"],
                                ].map(([label, value]) => (
                                    <div className="col-6 col-lg-3" key={label}>
                                        <div className="p-3 rounded" style={{ backgroundColor: "#141417", border: "none" }}>
                                            <div className="mb-1 text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.03em", color: "#ffffff", fontWeight: 600 }}>{label}</div>
                                            <div className="fw-bold" style={{ fontSize: "22px", color: "#10b981" }}>{value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="p-4 rounded text-white" style={{ backgroundColor: "#0c0c0e", border: "1px solid #1f1f23" }}>
                    <div className="d-flex justify-content-between align-items-center pb-3 mb-4" style={{ borderBottom: "1px solid #1f1f23" }}>
                        <div>
                            <h4 className="fw-semibold m-0 mb-1" style={{ fontSize: "20px", color: "#ffffff" }}>Activity Logs</h4>
                            <p className="m-0" style={{ fontSize: "13px", color: "#a1a1aa" }}>All System Activity Logs for StealthSync.</p>
                        </div>
                        <button 
                            className="btn text-white px-3 py-1.5 border-0" 
                            style={{ backgroundColor: "#06b6d4", fontSize: "13px", fontWeight: 600, borderRadius: "6px", boxShadow: "none" }}
                            onClick={() => download("/admin/logs/download")}
                        >
                            + Download Logs
                        </button>
                    </div>
                    
                    <div>
                        {logsLoading ? (
                            <div className="text-center text-muted py-5" style={{ fontSize: "14px" }}>
                                <span className="spinner-border spinner-border-sm me-2" style={{ color: "#06b6d4" }} role="status"></span>
                                Querying activity logs...
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <div className="d-flex align-items-center px-3 mb-2 text-white fw-semibold text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.05em" }}>
                                    <div style={{ width: "25%", color: "#ffffff" }}>Username</div>
                                    <div style={{ width: "40%", color: "#ffffff" }}>Action</div>
                                    <div style={{ width: "20%", color: "#ffffff" }}>IP Address</div>
                                    <div style={{ width: "15%", color: "#ffffff" }} className="text-end">Risk Status</div>
                                </div>

                                <table className="table m-0 text-white align-middle" style={{ fontSize: "14px", backgroundColor: "transparent", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center text-muted py-5 border-0" style={{ fontSize: "13px", backgroundColor: "transparent" }}>
                                                    No activity logs found.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map(log => (
                                                <tr key={log.logId} className="admin-log-row" style={{ transition: "background-color 0.15s ease" }}>
                                                    <td className="py-3 border-0 ps-3" style={{ width: "25%", backgroundColor: "#141417", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>
                                                        <div className="fw-bold" style={{ color: "#ffffff", fontSize: "15px" }}>{log.username || "Unknown User"}</div>
                                                        <div style={{ fontSize: "12px", color: "#4b5563", fontWeight: 500, marginTop: "2px" }}>Log ID: {log.logId}</div>
                                                    </td>
                                                    <td className="py-3 border-0" style={{ width: "40%", color: "#a1a1aa", backgroundColor: "#141417" }}>
                                                        <div style={{ color: "#ffffff" }}>{log.action || "System Event"}</div>
                                                        <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown Time"}</div>
                                                    </td>
                                                    <td className="py-3 border-0" style={{ width: "20%", color: "#06b6d4", fontWeight: 600, backgroundColor: "#141417" }}>
                                                        {log.ipAddress || "0.0.0.0"}
                                                    </td>
                                                    <td className="py-3 text-end border-0 pe-3" style={{ width: "15%", backgroundColor: "#141417", borderTopRightRadius: "4px", borderBottomRightRadius: "4px" }}>
                                                        <span className="badge px-2.5 py-1 fw-bold text-uppercase" style={{
                                                            fontSize: "11px",
                                                            borderRadius: "4px",
                                                            backgroundColor: log.isSuspicious ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                                            color: log.isSuspicious ? "#f43f5e" : "#10b981",
                                                            letterSpacing: "0.02em"
                                                        }}>
                                                            {log.isSuspicious ? (log.aiRiskReason || "ANOMALY DETECTED") : "SAFE"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                
                                <style>{`
                                    .admin-log-row:hover td {
                                        background-color: #1f1f23 !important;
                                    }
                                `}</style>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminReportsLogsPage