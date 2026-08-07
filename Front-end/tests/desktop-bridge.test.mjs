import assert from "node:assert/strict"
import test from "node:test"

test("desktop OAuth uses only the injected native bridge", async () => {
    let opened = ""
    globalThis.window = {
        stealthSyncDesktop: {
            openExternal: url => { opened = url; return true },
            saveBase64File: () => true
        },
        location: { assign: () => assert.fail("desktop OAuth must not navigate the WebView") }
    }
    const { launchOAuthAuthorization } = await import("../src/lib/desktopBridge.ts")
    assert.equal(launchOAuthAuthorization("https://accounts.google.com/o/oauth2/v2/auth"), true)
    assert.equal(opened, "https://accounts.google.com/o/oauth2/v2/auth")
    delete globalThis.window
})

test("web OAuth keeps the existing same-tab navigation", async () => {
    let assigned = ""
    globalThis.window = { location: { assign: url => { assigned = url } } }
    const { launchOAuthAuthorization } = await import("../src/lib/desktopBridge.ts")
    assert.equal(launchOAuthAuthorization("https://www.dropbox.com/oauth2/authorize"), false)
    assert.equal(assigned, "https://www.dropbox.com/oauth2/authorize")
    delete globalThis.window
})
