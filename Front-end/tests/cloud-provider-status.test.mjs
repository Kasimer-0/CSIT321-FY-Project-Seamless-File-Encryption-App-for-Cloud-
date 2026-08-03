import assert from "node:assert/strict"
import test from "node:test"
import { reconnectRequiredProviders } from "../src/lib/cloudProviderStatus.ts"

test("returns only disconnected providers that still own encrypted file records", () => {
    const statuses = {
        google_drive: {
            provider: "google_drive",
            configured: true,
            connected: false,
            reconnectRequired: true,
            ownedEncryptedFileCount: 1,
        },
        dropbox: {
            provider: "dropbox",
            configured: true,
            connected: true,
            reconnectRequired: false,
            ownedEncryptedFileCount: 2,
        },
        onedrive: {
            provider: "onedrive",
            configured: true,
            connected: false,
            reconnectRequired: false,
            ownedEncryptedFileCount: 0,
        },
    }

    assert.deepEqual(reconnectRequiredProviders(statuses), [statuses.google_drive])
})
