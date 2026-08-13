import {
    KDF_ITERATIONS_V2,
    KDF_VERSION_V2,
    KEY_SCHEME_V2,
    deriveAndVerifyClientKey,
    deriveClientKey,
    requireClientKeyMetadata,
    type ClientKeyMetadata,
    type ClientKeyMetadataRecord,
    type KeyAlgorithm
} from "./keyDerivation.ts"
import { base64UrlDecode, base64UrlEncode, decodeUtf8, exactArrayBuffer, utf8 } from "./encoding.ts"

const BACKUP_FORMAT = "stealthsync-encrypted-key-backup"
const BACKUP_VERSION = 1
const BACKUP_SALT_BYTES = 16
const BACKUP_IV_BYTES = 12
const MAX_BACKUP_BYTES = 256 * 1024
const BACKUP_AAD = utf8("StealthSync encrypted key backup v1")

type KeyBackupSource = ClientKeyMetadataRecord & {
    keyName: string
}

type EncryptedKeyBackup = {
    format: typeof BACKUP_FORMAT
    version: typeof BACKUP_VERSION
    kdf: {
        name: "PBKDF2"
        hash: "SHA-256"
        iterations: typeof KDF_ITERATIONS_V2
        salt: string
    }
    cipher: {
        name: "AES-GCM"
        iv: string
    }
    ciphertext: string
}

type BackupPayload = {
    keyName: string
    algorithm: KeyAlgorithm
    salt: string
    fingerprint: string
    keyScheme: typeof KEY_SCHEME_V2
    kdfIterations: typeof KDF_ITERATIONS_V2
    kdfVersion: typeof KDF_VERSION_V2
}

export type ImportedKeyBackup = {
    keyName: string
    metadata: ClientKeyMetadata
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string, maxLength: number) {
    if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
        throw new Error(`Key backup ${field} is invalid.`)
    }
    return value
}

function decodeFixedBytes(value: unknown, field: string, expectedBytes: number) {
    const encoded = requireString(value, field, 512)
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
        throw new Error(`Key backup ${field} is invalid.`)
    }
    let decoded: Uint8Array
    try {
        decoded = base64UrlDecode(encoded)
    } catch {
        throw new Error(`Key backup ${field} is invalid.`)
    }
    if (decoded.byteLength !== expectedBytes) {
        throw new Error(`Key backup ${field} is invalid.`)
    }
    return decoded
}

async function deriveBackupKey(password: string, salt: Uint8Array) {
    if (!password.trim()) throw new Error("Key password is required.")
    const material = await crypto.subtle.importKey(
        "raw",
        exactArrayBuffer(utf8(password)),
        "PBKDF2",
        false,
        ["deriveKey"]
    )
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: exactArrayBuffer(salt),
            iterations: KDF_ITERATIONS_V2,
            hash: "SHA-256"
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    )
}

function safeBackupName(keyName: string) {
    const normalized = keyName
        .normalize("NFKD")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
    return `${normalized || "stealthsync-key"}.sskey`
}

/**
 * Creates a portable backup encrypted locally with the original Key Password.
 * Raw key bytes, the password, and the password verifier are never serialized.
 */
export async function exportEncryptedKeyBackup(source: KeyBackupSource, password: string) {
    const metadata = requireClientKeyMetadata(source)
    await deriveAndVerifyClientKey(password, metadata)

    const payload: BackupPayload = {
        keyName: source.keyName,
        algorithm: metadata.algorithm,
        salt: metadata.salt,
        fingerprint: metadata.fingerprint,
        keyScheme: metadata.keyScheme,
        kdfIterations: KDF_ITERATIONS_V2,
        kdfVersion: KDF_VERSION_V2
    }
    const backupSalt = crypto.getRandomValues(new Uint8Array(BACKUP_SALT_BYTES))
    const iv = crypto.getRandomValues(new Uint8Array(BACKUP_IV_BYTES))
    const backupKey = await deriveBackupKey(password, backupSalt)
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: exactArrayBuffer(iv), additionalData: exactArrayBuffer(BACKUP_AAD) },
        backupKey,
        exactArrayBuffer(utf8(JSON.stringify(payload)))
    )
    const backup: EncryptedKeyBackup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        kdf: {
            name: "PBKDF2",
            hash: "SHA-256",
            iterations: KDF_ITERATIONS_V2,
            salt: base64UrlEncode(backupSalt)
        },
        cipher: {
            name: "AES-GCM",
            iv: base64UrlEncode(iv)
        },
        ciphertext: base64UrlEncode(new Uint8Array(ciphertext))
    }
    return {
        filename: safeBackupName(source.keyName),
        serialized: JSON.stringify(backup, null, 2)
    }
}

function parseBackup(serialized: string) {
    if (!serialized.trim() || utf8(serialized).byteLength > MAX_BACKUP_BYTES) {
        throw new Error("Key backup file is empty or too large.")
    }
    let value: unknown
    try {
        value = JSON.parse(serialized)
    } catch {
        throw new Error("Key backup file is not valid JSON.")
    }
    if (!isObject(value) || value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
        throw new Error("Key backup format or version is unsupported.")
    }
    if (!isObject(value.kdf) || value.kdf.name !== "PBKDF2" || value.kdf.hash !== "SHA-256"
        || value.kdf.iterations !== KDF_ITERATIONS_V2) {
        throw new Error("Key backup derivation settings are unsupported.")
    }
    if (!isObject(value.cipher) || value.cipher.name !== "AES-GCM") {
        throw new Error("Key backup cipher is unsupported.")
    }
    return {
        salt: decodeFixedBytes(value.kdf.salt, "salt", BACKUP_SALT_BYTES),
        iv: decodeFixedBytes(value.cipher.iv, "IV", BACKUP_IV_BYTES),
        ciphertext: base64UrlDecode(requireString(value.ciphertext, "ciphertext", MAX_BACKUP_BYTES))
    }
}

function validatePayload(value: unknown): BackupPayload {
    if (!isObject(value)) throw new Error("Decrypted key backup payload is invalid.")
    const algorithm = value.algorithm
    if (algorithm !== "AES-128" && algorithm !== "AES-256-GCM") {
        throw new Error("Key backup algorithm is unsupported.")
    }
    if (value.keyScheme !== KEY_SCHEME_V2 || value.kdfIterations !== KDF_ITERATIONS_V2
        || value.kdfVersion !== KDF_VERSION_V2) {
        throw new Error("Key backup metadata version is unsupported.")
    }
    const salt = requireString(value.salt, "key salt", 128)
    decodeFixedBytes(salt, "key salt", 16)
    const fingerprint = requireString(value.fingerprint, "fingerprint", 32)
    if (!/^[A-Za-z0-9_-]{16}$/.test(fingerprint)) {
        throw new Error("Key backup fingerprint is invalid.")
    }
    return {
        keyName: requireString(value.keyName, "key name", 120).trim(),
        algorithm,
        salt,
        fingerprint,
        keyScheme: KEY_SCHEME_V2,
        kdfIterations: KDF_ITERATIONS_V2,
        kdfVersion: KDF_VERSION_V2
    }
}

/** Decrypts and verifies a backup locally, then rebuilds non-secret server metadata. */
export async function importEncryptedKeyBackup(serialized: string, password: string): Promise<ImportedKeyBackup> {
    const backup = parseBackup(serialized)
    const backupKey = await deriveBackupKey(password, backup.salt)
    let plaintext: ArrayBuffer
    try {
        plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: exactArrayBuffer(backup.iv),
                additionalData: exactArrayBuffer(BACKUP_AAD)
            },
            backupKey,
            exactArrayBuffer(backup.ciphertext)
        )
    } catch {
        throw new Error("Wrong key password or damaged key backup.")
    }

    let decoded: unknown
    try {
        decoded = JSON.parse(decodeUtf8(plaintext))
    } catch {
        throw new Error("Decrypted key backup payload is invalid.")
    }
    const payload = validatePayload(decoded)
    const derived = await deriveClientKey(
        password,
        payload.salt,
        payload.algorithm,
        payload.kdfIterations
    )
    if (derived.fingerprint !== payload.fingerprint) {
        throw new Error("Wrong key password or damaged key backup.")
    }
    return {
        keyName: payload.keyName,
        metadata: {
            algorithm: derived.algorithm,
            salt: derived.salt,
            fingerprint: derived.fingerprint,
            passwordVerifier: derived.passwordVerifier,
            keyScheme: derived.keyScheme,
            kdfIterations: derived.kdfIterations,
            kdfVersion: derived.kdfVersion
        }
    }
}
