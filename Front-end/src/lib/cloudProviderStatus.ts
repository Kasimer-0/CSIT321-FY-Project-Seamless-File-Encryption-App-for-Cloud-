import type { CloudProviderStatus } from "../Type"

export const cloudProviderKeys = ["google_drive", "dropbox", "onedrive"] as const

export function reconnectRequiredProviders(statuses: Record<string, CloudProviderStatus>) {
    return cloudProviderKeys
        .map(provider => statuses[provider])
        .filter((status): status is CloudProviderStatus => status?.reconnectRequired === true)
}
