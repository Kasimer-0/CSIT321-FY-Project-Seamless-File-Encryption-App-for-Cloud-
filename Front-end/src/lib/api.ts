const TOKEN_STORAGE_KEY = "stealthsync.auth.token"

export function getAuthToken() {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/** Adds the current Bearer token to protected API calls while preserving caller headers. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    const token = getAuthToken()
    if (token) {
        headers.set("Authorization", `Bearer ${token}`)
    }
    return window.fetch(input, { ...init, headers })
}
