export type PrivacyWarningType =
    | "Email address"
    | "NRIC/FIN-like identifier"
    | "Credit-card-like number"
    | "Phone number"
    | "Long numeric identifier"

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const NRIC_FIN = /\b[STFGM]\d{7}[A-Z]\b/i
const PHONE = /(?<!\d)(?:\+?65[ -]?)?[689]\d{3}[ -]?\d{4}(?!\d)/
const LONG_NUMBER = /(?<!\d)\d{10,20}(?!\d)/

function luhn(value: string) {
    const digits = value.replace(/\D/g, "")
    if (digits.length < 13 || digits.length > 19) return false
    let sum = 0
    let doubleDigit = false
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index])
        if (doubleDigit) {
            digit *= 2
            if (digit > 9) digit -= 9
        }
        sum += digit
        doubleDigit = !doubleDigit
    }
    return sum % 10 === 0
}

export function scanSensitiveText(text: string): PrivacyWarningType[] {
    const warnings = new Set<PrivacyWarningType>()
    if (EMAIL.test(text)) warnings.add("Email address")
    if (NRIC_FIN.test(text)) warnings.add("NRIC/FIN-like identifier")
    if (PHONE.test(text)) warnings.add("Phone number")
    const cardCandidates = text.match(/(?:\d[ -]?){13,19}/g) ?? []
    if (cardCandidates.some(luhn)) warnings.add("Credit-card-like number")
    if (LONG_NUMBER.test(text)) warnings.add("Long numeric identifier")
    return [...warnings]
}

/** Reads at most a small local text sample and never sends or persists its contents. */
export async function scanFileLocally(file: File) {
    try {
        return scanSensitiveText((await file.text()).slice(0, 20_000))
    } catch {
        return []
    }
}
