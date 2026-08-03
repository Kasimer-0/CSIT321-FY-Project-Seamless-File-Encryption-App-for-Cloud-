import type { GoogleDriveFile } from "../Type"

type CloudFileTime = Pick<GoogleDriveFile, "createdAt" | "modifiedAt">

function numericLocalDate(timestamp: number, includeTime: boolean) {
    const date = new Date(timestamp)
    const datePart = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    if (!includeTime) return datePart
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${datePart} ${hours}:${minutes}`
}

export function cloudFileUploadTimestamp(file: CloudFileTime) {
    const value = file.createdAt ?? file.modifiedAt
    if (!value) return null
    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : timestamp
}

/** Returns a copy ordered by the best provider upload timestamp, newest first. */
export function sortCloudFilesNewestFirst<T extends CloudFileTime>(files: T[]) {
    return [...files].sort((left, right) => {
        const leftTime = cloudFileUploadTimestamp(left)
        const rightTime = cloudFileUploadTimestamp(right)
        if (leftTime === null) return rightTime === null ? 0 : 1
        if (rightTime === null) return -1
        return rightTime - leftTime
    })
}

export function formatCloudFileUploadTime(file: CloudFileTime) {
    const timestamp = cloudFileUploadTimestamp(file)
    if (timestamp === null) return "Upload time unavailable"
    return `Uploaded ${numericLocalDate(timestamp, true)}`
}

/** Uses a stable numeric date so cloud links never inherit the browser UI language. */
export function formatCloudLinkedDate(value: string | Date | null | undefined) {
    if (!value) return "Date unavailable"
    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
    return Number.isNaN(timestamp) ? "Date unavailable" : numericLocalDate(timestamp, false)
}
