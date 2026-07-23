import { base64UrlDecode, base64UrlEncode, concatenate, exactArrayBuffer, utf8 } from "./encoding.ts"

export type KeyAlgorithm = "AES-128" | "AES-256-GCM"

export const KEY_SCHEME_V2 = "webcrypto-pbkdf2-aes-gcm-v2"
export const KDF_ITERATIONS_V2 = 310_000
export const KDF_VERSION_V2 = 2
export const KEY_SALT_BYTES = 16

export type ClientKeyMetadata = {
    algorithm: KeyAlgorithm
    salt: string
    fingerprint: string
    passwordVerifier: string
    keyScheme: typeof KEY_SCHEME_V2
    kdfIterations: number
    kdfVersion: number
}

export type DerivedClientKey = ClientKeyMetadata & {
    cryptoKey: CryptoKey
}

export type ClientKeyMetadataRecord = {
    algorithm: string
    salt: string | null
    fingerprint: string
    passwordVerifier: string | null
    keyScheme: string | null
    kdfIterations: number | null
    kdfVersion: number | null
}

export function requireClientKeyMetadata(record: ClientKeyMetadataRecord): ClientKeyMetadata {
    if (record.algorithm !== "AES-128" && record.algorithm !== "AES-256-GCM") {
        throw new Error("This encryption key uses an unsupported algorithm.")
    }
    if (!record.salt || !record.passwordVerifier || record.keyScheme !== KEY_SCHEME_V2
        || record.kdfIterations !== KDF_ITERATIONS_V2 || record.kdfVersion !== KDF_VERSION_V2) {
        throw new Error("This is a legacy key and cannot be used by browser encryption.")
    }
    return {
        algorithm: record.algorithm,
        salt: record.salt,
        fingerprint: record.fingerprint,
        passwordVerifier: record.passwordVerifier,
        keyScheme: KEY_SCHEME_V2,
        kdfIterations: KDF_ITERATIONS_V2,
        kdfVersion: KDF_VERSION_V2
    }
}

function keyLength(algorithm: KeyAlgorithm) {
    return algorithm === "AES-256-GCM" ? 256 : 128
}

async function purposeDigest(purpose: string, keyBytes: Uint8Array) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        exactArrayBuffer(concatenate(utf8(`${purpose}:`), keyBytes))
    )
    return new Uint8Array(digest)
}

export async function deriveClientKey(
    password: string,
    saltValue: string | Uint8Array,
    algorithm: KeyAlgorithm,
    iterations = KDF_ITERATIONS_V2
): Promise<DerivedClientKey> {
    if (!password.trim()) throw new Error("Key password is required.")
    if (iterations !== KDF_ITERATIONS_V2) throw new Error("Unsupported key-derivation iteration count.")

    const salt = typeof saltValue === "string" ? base64UrlDecode(saltValue) : saltValue
    if (salt.byteLength !== KEY_SALT_BYTES) throw new Error("Encryption key salt is invalid.")

    const passwordMaterial = await crypto.subtle.importKey(
        "raw",
        exactArrayBuffer(utf8(password)),
        "PBKDF2",
        false,
        ["deriveBits"]
    )
    const rawBits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: exactArrayBuffer(salt), iterations, hash: "SHA-256" },
        passwordMaterial,
        keyLength(algorithm)
    )
    const rawKey = new Uint8Array(rawBits)
    try {
        const [fingerprintBytes, verifierBytes] = await Promise.all([
            purposeDigest("fingerprint", rawKey),
            purposeDigest("verifier", rawKey)
        ])
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            rawBits,
            { name: "AES-GCM", length: keyLength(algorithm) },
            false,
            ["encrypt", "decrypt"]
        )
        return {
            cryptoKey,
            algorithm,
            salt: base64UrlEncode(salt),
            fingerprint: base64UrlEncode(fingerprintBytes).slice(0, 16),
            passwordVerifier: base64UrlEncode(verifierBytes),
            keyScheme: KEY_SCHEME_V2,
            kdfIterations: iterations,
            kdfVersion: KDF_VERSION_V2
        }
    } finally {
        rawKey.fill(0)
    }
}

export async function createClientKeyMetadata(password: string, algorithm: KeyAlgorithm) {
    const salt = crypto.getRandomValues(new Uint8Array(KEY_SALT_BYTES))
    const derived = await deriveClientKey(password, salt, algorithm)
    return {
        algorithm: derived.algorithm,
        salt: derived.salt,
        fingerprint: derived.fingerprint,
        passwordVerifier: derived.passwordVerifier,
        keyScheme: derived.keyScheme,
        kdfIterations: derived.kdfIterations,
        kdfVersion: derived.kdfVersion
    }
}

export async function deriveAndVerifyClientKey(
    password: string,
    metadata: ClientKeyMetadata
) {
    if (metadata.keyScheme !== KEY_SCHEME_V2 || metadata.kdfVersion !== KDF_VERSION_V2) {
        throw new Error("This file uses a legacy server-encrypted key.")
    }
    const derived = await deriveClientKey(password, metadata.salt, metadata.algorithm, metadata.kdfIterations)
    if (derived.fingerprint !== metadata.fingerprint || derived.passwordVerifier !== metadata.passwordVerifier) {
        throw new Error("Wrong key password.")
    }
    return derived
}
