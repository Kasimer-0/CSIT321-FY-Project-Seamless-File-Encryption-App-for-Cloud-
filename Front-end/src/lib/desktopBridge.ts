type StealthSyncDesktopBridge = {
    openExternal: (url: string) => boolean
    saveBase64File: (filename: string, base64Data: string) => boolean
}

declare global {
    interface Window {
        stealthSyncDesktop?: StealthSyncDesktopBridge
    }
}

/** Returns true only inside the signed desktop shell after its restricted bridge is injected. */
export function isDesktopClient() {
    return typeof window !== "undefined" && Boolean(window.stealthSyncDesktop)
}

/** Opens OAuth in the system browser for desktop, retaining normal same-tab navigation on the web. */
export function launchOAuthAuthorization(url: string) {
    const bridge = typeof window === "undefined" ? undefined : window.stealthSyncDesktop
    if (!bridge) {
        window.location.assign(url)
        return false
    }
    if (!bridge.openExternal(url)) {
        throw new Error("The desktop client blocked or could not open the authorization URL.")
    }
    return true
}

function bytesToBase64(bytes: Uint8Array) {
    const chunkSize = 0x8000
    let binary = ""
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
    }
    return btoa(binary)
}

/** Saves via a native dialog in the desktop shell and via browser download everywhere else. */
export async function saveUserFile(blob: Blob, filename: string) {
    const bridge = typeof window === "undefined" ? undefined : window.stealthSyncDesktop
    if (bridge) {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        return Boolean(bridge.saveBase64File(filename, bytesToBase64(bytes)))
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.style.display = "none"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
}

export {}
