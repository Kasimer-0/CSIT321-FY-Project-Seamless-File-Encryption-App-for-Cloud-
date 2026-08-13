import test from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { scanFileLocally, scanSensitiveText } from "../src/security/privacyScanner.ts"

test("privacy warning scans a bounded browser-local sample without fetch", async () => {
    let fetchCalls = 0
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
        fetchCalls += 1
        throw new Error("Privacy scanner must not use the network")
    }
    try {
        const warnings = await scanFileLocally({
            text: async () => "Contact demo@example.com or use S1234567D for this sample."
        })
        assert.ok(warnings.includes("Email address"))
        assert.ok(warnings.includes("NRIC/FIN-like identifier"))
        assert.equal(fetchCalls, 0)
        assert.deepEqual(scanSensitiveText("ordinary project notes"), [])
    } finally {
        globalThis.fetch = originalFetch
    }
})

test("frontend source never serializes key passwords or calls the removed privacy endpoint", async () => {
    const sources = await Promise.all([
        "../src/components/CustomerManageEncryptionKeysPage.tsx",
        "../src/components/CustomerEncryptFilePage.tsx",
        "../src/components/CustomerDecryptFilePage.tsx"
    ].map(path => readFile(new URL(path, import.meta.url), "utf8")))
    const combined = sources.join("\n")

    assert.equal(combined.includes('append("keyPassword"'), false)
    assert.equal(combined.includes("/privacy/scan"), false)
    assert.equal(/JSON\.stringify\s*\(\s*\{[^}]*keyPassword/s.test(combined), false)
    assert.equal(combined.includes('"X-Key-Password"'), false)
})

test("frontend components contain no hardcoded localhost API origin", async () => {
    const components = new URL("../src/components/", import.meta.url)
    const names = await readdir(components)
    const source = (await Promise.all(names
        .filter(name => name.endsWith(".tsx") || name.endsWith(".ts"))
        .map(name => readFile(new URL(name, components), "utf8"))))
        .join("\n")

    assert.equal(source.includes("http://localhost:8080"), false)
})

test("encryption key controls keep English labels and branded application rendering", async () => {
    const source = await readFile(
        new URL("../src/components/CustomerManageEncryptionKeysPage.tsx", import.meta.url),
        "utf8"
    )

    assert.match(source, /role="radiogroup" aria-label="Encryption algorithm"/)
    assert.match(source, />\s*Choose Backup\s*</)
    assert.match(source, /"No backup selected"/)
    assert.equal(source.includes('<select className="form-select" value={algorithm}'), false)
    assert.equal(source.includes('className="form-control"\n                            type="file"'), false)
})
