const inMemoryKeys = new Map<number, CryptoKey>()

export function rememberSessionKey(keyID: number, key: CryptoKey) {
    inMemoryKeys.set(keyID, key)
}

export function sessionKey(keyID: number) {
    return inMemoryKeys.get(keyID) ?? null
}

export function clearKeySession() {
    inMemoryKeys.clear()
}

if (typeof window !== "undefined") {
    window.addEventListener("stealthsync:session-cleared", clearKeySession)
    window.addEventListener("pagehide", clearKeySession)
}
