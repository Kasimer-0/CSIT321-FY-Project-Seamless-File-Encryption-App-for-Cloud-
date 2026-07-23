import { base64UrlDecode, decodeUtf8, exactArrayBuffer, utf8 } from "./encoding.ts"
import type { KeyAlgorithm } from "./keyDerivation.ts"

export const ENVELOPE_VERSION = 2
export const ENVELOPE_MIME_TYPE = "application/vnd.stealthsync.encrypted"
const MAGIC = Uint8Array.from([0x53, 0x53, 0x45, 0x4e, 0x43, 0x56, 0x32, 0x00])

export type EncryptedEnvelopeHeader = {
    version: typeof ENVELOPE_VERSION
    algorithm: KeyAlgorithm
    keyFingerprint: string
    iv: string
    metadataIv: string
    encryptedMetadata: string
}

export type DecryptedFileMetadata = {
    filename: string
    mimeType: string
    size: number
    lastModified: number
}

export function encodeEnvelope(header: EncryptedEnvelopeHeader, ciphertext: Uint8Array) {
    const headerBytes = utf8(JSON.stringify(header))
    const result = new Uint8Array(MAGIC.byteLength + 4 + headerBytes.byteLength + ciphertext.byteLength)
    result.set(MAGIC, 0)
    new DataView(result.buffer).setUint32(MAGIC.byteLength, headerBytes.byteLength, false)
    result.set(headerBytes, MAGIC.byteLength + 4)
    result.set(ciphertext, MAGIC.byteLength + 4 + headerBytes.byteLength)
    return result
}

export function decodeEnvelope(value: ArrayBuffer | Uint8Array) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
    if (bytes.byteLength < MAGIC.byteLength + 4) throw new Error("Encrypted envelope is truncated.")
    for (let index = 0; index < MAGIC.byteLength; index += 1) {
        if (bytes[index] !== MAGIC[index]) throw new Error("This is not a StealthSync V2 encrypted file.")
    }
    const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        .getUint32(MAGIC.byteLength, false)
    const headerStart = MAGIC.byteLength + 4
    const ciphertextStart = headerStart + headerLength
    if (headerLength < 2 || ciphertextStart > bytes.byteLength - 16) throw new Error("Encrypted envelope header is invalid.")
    const header = JSON.parse(decodeUtf8(bytes.slice(headerStart, ciphertextStart))) as EncryptedEnvelopeHeader
    if (header.version !== ENVELOPE_VERSION) throw new Error("Unsupported encrypted envelope version.")
    if (!header.keyFingerprint || !header.iv || !header.metadataIv || !header.encryptedMetadata) {
        throw new Error("Encrypted envelope metadata is incomplete.")
    }
    return { header, ciphertext: bytes.slice(ciphertextStart) }
}

export function decodeEncryptedMetadata(value: string) {
    return exactArrayBuffer(base64UrlDecode(value))
}
