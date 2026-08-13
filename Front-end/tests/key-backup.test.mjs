import test from "node:test"
import assert from "node:assert/strict"
import { webcrypto } from "node:crypto"

if (!globalThis.crypto) globalThis.crypto = webcrypto
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, "binary").toString("base64")
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, "base64").toString("binary")

const { createClientKeyMetadata } = await import("../src/crypto/keyDerivation.ts")
const { exportEncryptedKeyBackup, importEncryptedKeyBackup } = await import("../src/crypto/keyBackup.ts")

async function sourceKey(password = "Backup-Key@2026") {
    const metadata = await createClientKeyMetadata(password, "AES-256-GCM")
    return {
        keyName: "Final Project Key",
        ...metadata
    }
}

test("encrypted backup restores matching client metadata", async () => {
    const password = "Backup-Key@2026"
    const source = await sourceKey(password)
    const backup = await exportEncryptedKeyBackup(source, password)
    const restored = await importEncryptedKeyBackup(backup.serialized, password)

    assert.equal(backup.filename, "Final-Project-Key.sskey")
    assert.equal(restored.keyName, source.keyName)
    assert.equal(restored.metadata.algorithm, source.algorithm)
    assert.equal(restored.metadata.salt, source.salt)
    assert.equal(restored.metadata.fingerprint, source.fingerprint)
    assert.equal(restored.metadata.passwordVerifier, source.passwordVerifier)
})

test("backup serialization never exposes key password, verifier, or client-key metadata", async () => {
    const password = "Never-Serialize@2026"
    const source = await sourceKey(password)
    const backup = await exportEncryptedKeyBackup(source, password)

    assert.equal(backup.serialized.includes(password), false)
    assert.equal(backup.serialized.includes(source.passwordVerifier), false)
    assert.equal(backup.serialized.includes(source.salt), false)
    assert.equal(backup.serialized.includes(source.fingerprint), false)
    assert.equal(backup.serialized.includes(source.keyName), false)
})

test("wrong password and modified backup ciphertext are rejected", async () => {
    const password = "Correct-Backup@2026"
    const source = await sourceKey(password)
    const backup = await exportEncryptedKeyBackup(source, password)

    await assert.rejects(
        importEncryptedKeyBackup(backup.serialized, "Wrong@123"),
        /Wrong key password or damaged key backup/
    )

    const modified = JSON.parse(backup.serialized)
    const ciphertext = Buffer.from(
        modified.ciphertext.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
    )
    ciphertext[Math.floor(ciphertext.length / 2)] ^= 1
    modified.ciphertext = ciphertext
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
    await assert.rejects(
        importEncryptedKeyBackup(JSON.stringify(modified), password),
        /Wrong key password or damaged key backup/
    )
})

test("malformed and oversized backup files are rejected", async () => {
    await assert.rejects(importEncryptedKeyBackup("not-json", "Password@123"), /not valid JSON/)
    await assert.rejects(
        importEncryptedKeyBackup("x".repeat(256 * 1024 + 1), "Password@123"),
        /empty or too large/
    )
})
