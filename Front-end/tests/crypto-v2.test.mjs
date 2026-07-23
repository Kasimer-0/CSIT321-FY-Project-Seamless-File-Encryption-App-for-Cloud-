import test from "node:test"
import assert from "node:assert/strict"
import { webcrypto } from "node:crypto"

if (!globalThis.crypto) globalThis.crypto = webcrypto
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, "binary").toString("base64")
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, "base64").toString("binary")

const {
    createClientKeyMetadata,
    deriveAndVerifyClientKey,
    deriveClientKey
} = await import("../src/crypto/keyDerivation.ts")
const { encryptFileInBrowser, decryptFileInBrowser } = await import("../src/crypto/fileEncryption.ts")
const { decodeEnvelope, encodeEnvelope } = await import("../src/crypto/encryptedEnvelope.ts")

function testFile(content, name = "multi-device-note.txt") {
    const bytes = new TextEncoder().encode(content)
    return {
        name,
        type: "text/plain",
        size: bytes.byteLength,
        lastModified: 1_720_000_000_000,
        arrayBuffer: async () => bytes.buffer,
        text: async () => content
    }
}

test("PBKDF2 metadata is deterministic for the same password, salt, and algorithm", async () => {
    const salt = new Uint8Array(16).fill(7)
    const first = await deriveClientKey("Correct Horse Battery Staple", salt, "AES-256-GCM")
    const second = await deriveClientKey("Correct Horse Battery Staple", salt, "AES-256-GCM")

    assert.equal(first.fingerprint, second.fingerprint)
    assert.equal(first.passwordVerifier, second.passwordVerifier)
    assert.equal(first.kdfIterations, 310_000)
    assert.equal(first.keyScheme, "webcrypto-pbkdf2-aes-gcm-v2")

    const different = await deriveClientKey("Different Password", salt, "AES-256-GCM")
    assert.notEqual(first.fingerprint, different.fingerprint)
})

test("AES-128 uses random IVs and its envelope codec round-trips", async () => {
    const metadata = await createClientKeyMetadata("free-tier-password", "AES-128")
    const key = await deriveAndVerifyClientKey("free-tier-password", metadata)
    const file = testFile("free tier payload", "free-note.txt")
    const first = await encryptFileInBrowser(file, key)
    const second = await encryptFileInBrowser(file, key)

    assert.notDeepEqual(first.bytes, second.bytes)
    assert.notEqual(first.header.iv, second.header.iv)
    const decoded = decodeEnvelope(first.bytes)
    assert.deepEqual(encodeEnvelope(decoded.header, decoded.ciphertext), first.bytes)
    const decrypted = await decryptFileInBrowser(first.bytes.buffer, key)
    assert.equal(await decrypted.blob.text(), "free tier payload")
    assert.equal(decrypted.metadata.filename, "free-note.txt")
})

test("V2 envelope round-trips on another derived key instance and hides plaintext metadata", async () => {
    const password = "Premium Device Password 2026"
    const metadata = await createClientKeyMetadata(password, "AES-256-GCM")
    const deviceAKey = await deriveAndVerifyClientKey(password, metadata)
    const encrypted = await encryptFileInBrowser(testFile("device A encrypted payload"), deviceAKey)

    assert.equal(new TextDecoder().decode(encrypted.bytes).includes("multi-device-note.txt"), false)
    assert.equal(new TextDecoder().decode(encrypted.bytes).includes("device A encrypted payload"), false)

    const deviceBKey = await deriveAndVerifyClientKey(password, metadata)
    const decrypted = await decryptFileInBrowser(encrypted.bytes.buffer, deviceBKey)
    assert.equal(decrypted.metadata.filename, "multi-device-note.txt")
    assert.equal(await decrypted.blob.text(), "device A encrypted payload")
})

test("wrong password and modified ciphertext are rejected", async () => {
    const metadata = await createClientKeyMetadata("right-password", "AES-128")
    await assert.rejects(
        deriveAndVerifyClientKey("wrong-password", metadata),
        /Wrong key password/
    )

    const key = await deriveAndVerifyClientKey("right-password", metadata)
    const encrypted = await encryptFileInBrowser(testFile("authenticated ciphertext"), key)
    const modified = encrypted.bytes.slice()
    modified[modified.length - 1] ^= 1
    await assert.rejects(
        decryptFileInBrowser(modified.buffer, key),
        /modified ciphertext/
    )
})
