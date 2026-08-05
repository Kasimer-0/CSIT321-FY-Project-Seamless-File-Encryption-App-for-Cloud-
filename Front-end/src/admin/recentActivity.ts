import type { SystemLog } from "../Type"

export function newestSystemLogs(logs: SystemLog[], limit = 5) {
    return [...logs]
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, Math.max(0, limit))
}

export function formatSystemLogTime(timestamp: string) {
    return new Intl.DateTimeFormat("en-SG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(timestamp))
}
