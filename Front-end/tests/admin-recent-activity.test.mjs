import test from "node:test"
import assert from "node:assert/strict"
import { newestSystemLogs } from "../src/admin/recentActivity.ts"

function log(logId, timestamp) {
    return { logId, timestamp }
}

test("admin overview selects the five newest logs without mutating the API result", () => {
    const logs = [
        log(1, "2026-08-05T08:00:00"),
        log(2, "2026-08-05T09:00:00"),
        log(3, "2026-08-05T10:00:00"),
        log(4, "2026-08-05T11:00:00"),
        log(5, "2026-08-05T12:00:00"),
        log(6, "2026-08-05T13:00:00"),
    ]

    assert.deepEqual(newestSystemLogs(logs).map(item => item.logId), [6, 5, 4, 3, 2])
    assert.deepEqual(logs.map(item => item.logId), [1, 2, 3, 4, 5, 6])
})
