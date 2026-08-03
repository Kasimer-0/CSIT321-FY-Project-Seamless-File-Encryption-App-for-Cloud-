import test from "node:test"
import assert from "node:assert/strict"
import {
    cloudFileUploadTimestamp,
    formatCloudLinkedDate,
    formatCloudFileUploadTime,
    sortCloudFilesNewestFirst
} from "../src/lib/cloudFiles.ts"

test("cloud files are ordered newest upload first across providers", () => {
    const files = [
        { provider: "dropbox", createdAt: "2026-07-29T01:00:00Z", modifiedAt: null },
        { provider: "google_drive", createdAt: "2026-07-31T02:30:00Z", modifiedAt: null },
        { provider: "onedrive", createdAt: null, modifiedAt: "2026-07-30T03:00:00Z" }
    ]

    assert.deepEqual(
        sortCloudFilesNewestFirst(files).map(file => file.provider),
        ["google_drive", "onedrive", "dropbox"]
    )
})

test("upload time falls back to modified time and remains visible", () => {
    const localTime = new Date(2026, 6, 31, 13, 38)
    const file = { createdAt: null, modifiedAt: localTime.toISOString() }

    assert.equal(cloudFileUploadTimestamp(file), Date.parse(file.modifiedAt))
    assert.equal(formatCloudFileUploadTime(file), "Uploaded 2026/7/31 13:38")
    assert.equal(formatCloudLinkedDate(file.modifiedAt), "2026/7/31")
    assert.doesNotMatch(formatCloudFileUploadTime(file), /[年月日]/)
})
