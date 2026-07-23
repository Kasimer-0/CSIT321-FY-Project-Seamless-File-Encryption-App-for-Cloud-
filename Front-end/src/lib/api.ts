const TOKEN_STORAGE_KEY = "stealthsync.auth.token"
const DEVICE_STORAGE_KEY = "stealthsync.device.id"

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim()

/**
 * Development keeps the separate Spring port, while production defaults to the
 * page origin so a single hosted StealthSync URL needs no client configuration.
 */
export const API_BASE_URL = (configuredApiBase
    || (import.meta.env.DEV ? "http://localhost:8080" : window.location.origin))
    .replace(/\/+$/, "")

export function apiUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export function getDeviceID() {
    let deviceID = window.localStorage.getItem(DEVICE_STORAGE_KEY)
    if (!deviceID) {
        deviceID = window.crypto.randomUUID()
        window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceID)
    }
    return deviceID
}

export function getDeviceName() {
    const platform = navigator.platform || "Windows"
    return `${platform} web client`
}

export function getAuthToken() {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.dispatchEvent(new Event("stealthsync:session-cleared"))
}

/** Resolves relative API paths and attaches the device-bound Bearer credentials. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set("X-StealthSync-Device-ID", getDeviceID())
    const token = getAuthToken()
    if (token) {
        headers.set("Authorization", `Bearer ${token}`)
    }
    const resolvedInput = typeof input === "string" ? apiUrl(input) : input
    return window.fetch(resolvedInput, { ...init, headers })
}
