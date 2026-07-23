import { base64UrlDecode, base64UrlEncode, exactArrayBuffer, utf8 } from "./encoding.ts"
import {
    decodeEncryptedMetadata,
    decodeEnvelope,
    encodeEnvelope,
    ENVELOPE_MIME_TYPE,
    ENVELOPE_VERSION,
    type DecryptedFileMetadata,
    type EncryptedEnvelopeHeader
} from "./encryptedEnvelope.ts"
import type { DerivedClientKey } from "./keyDerivation.ts"

const IV_BYTES = 12

export async function encryptFileInBrowser(file: File, key: DerivedClientKey) {
    const contentIv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const metadataIv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const metadata: DecryptedFileMetadata = {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified
    }
    const [ciphertext, encryptedMetadata] = await Promise.all([
        crypto.subtle.encrypt(
            { name: "AES-GCM", iv: exactArrayBuffer(contentIv) },
            key.cryptoKey,
            await file.arrayBuffer()
        ),
        crypto.subtle.encrypt(
            { name: "AES-GCM", iv: exactArrayBuffer(metadataIv) },
            key.cryptoKey,
            exactArrayBuffer(utf8(JSON.stringify(metadata)))
        )
    ])
    const header: EncryptedEnvelopeHeader = {
        version: ENVELOPE_VERSION,
        algorithm: key.algorithm,
        keyFingerprint: key.fingerprint,
        iv: base64UrlEncode(contentIv),
        metadataIv: base64UrlEncode(metadataIv),
        encryptedMetadata: base64UrlEncode(new Uint8Array(encryptedMetadata))
    }
    const bytes = encodeEnvelope(header, new Uint8Array(ciphertext))
    return {
        bytes,
        blob: new Blob([exactArrayBuffer(bytes)], { type: ENVELOPE_MIME_TYPE }),
        header,
        objectName: `stealthsync-${crypto.randomUUID()}.ssenc`,
        plaintextSize: file.size
    }
}

export async function decryptFileInBrowser(envelopeBytes: ArrayBuffer, key: DerivedClientKey) {
    const { header, ciphertext } = decodeEnvelope(envelopeBytes)
    if (header.keyFingerprint !== key.fingerprint || header.algorithm !== key.algorithm) {
        throw new Error("The selected encryption key does not match this file.")
    }
    try {
        const [plaintext, metadataBytes] = await Promise.all([
            crypto.subtle.decrypt(
                { name: "AES-GCM", iv: exactArrayBuffer(base64UrlDecode(header.iv)) },
                key.cryptoKey,
                exactArrayBuffer(ciphertext)
            ),
            crypto.subtle.decrypt(
                { name: "AES-GCM", iv: exactArrayBuffer(base64UrlDecode(header.metadataIv)) },
                key.cryptoKey,
                decodeEncryptedMetadata(header.encryptedMetadata)
            )
        ])
        const metadata = JSON.parse(new TextDecoder().decode(metadataBytes)) as DecryptedFileMetadata
        return {
            metadata,
            blob: new Blob([plaintext], { type: metadata.mimeType || "application/octet-stream" })
        }
    } catch {
        throw new Error("Wrong key password or modified ciphertext.")
    }
}

export function saveDecryptedFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.style.display = "none"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
