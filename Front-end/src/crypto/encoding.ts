const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function utf8(value: string) {
    return textEncoder.encode(value)
}

export function decodeUtf8(value: BufferSource) {
    return textDecoder.decode(value)
}

export function base64UrlEncode(value: Uint8Array) {
    let binary = ""
    for (const byte of value) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function base64UrlDecode(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4)
    const binary = atob(padded)
    return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export function exactArrayBuffer(value: Uint8Array) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer
}

export function concatenate(...values: Uint8Array[]) {
    const length = values.reduce((total, value) => total + value.byteLength, 0)
    const result = new Uint8Array(length)
    let offset = 0
    for (const value of values) {
        result.set(value, offset)
        offset += value.byteLength
    }
    return result
}
