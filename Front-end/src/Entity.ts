/** Stable entity contracts for backend-owned data returned to the frontend. */
export type UserAccount = {
    userID: number
    username: string
    email: string
    role: "admin" | "customer"
    isSubscribed: boolean
    isSuspended: boolean
    subscription: number | SubscriptionDTO | null
}

export type Plan = {
    planID: number
    planTitle: string
    planPrice: number
    planDescription: string
    planStatus: "active" | "inactive"
    encMethod: string
}

export type SubscriptionDTO = {
    subscriptionID: number
    plan: Plan
    subscriber: UserAccount
    subcriptionStatus: string
    subcriptionStartDate: Date
    subscriptionEndDate: Date
}

export type EncryptionKeyRecord = {
    keyID: number
    ownerID: number
    keyName: string
    algorithm: string
    status: "active" | "inactive" | "retired"
    fingerprint: string
    salt: string | null
    passwordVerifier: string | null
    keyScheme: string | null
    kdfIterations: number | null
    kdfVersion: number | null
    createdAt: Date
    updatedAt: Date
}

export type CloudStorageUsage = {
    usedBytes: number
    totalBytes: number
    availableBytes: number
    fileCount: number
}

export type CloudProviderStatus = {
    provider: string
    configured: boolean
    connected: boolean
    reconnectRequired: boolean
    ownedEncryptedFileCount: number
}

export type GoogleDriveFile = {
    fileId: string
    fileName: string
    originalName: string
    fileSize: number
    createdAt: string | null
    modifiedAt: string | null
}

export type SystemLog = {
    logId: number
    userID: number | null
    username: string
    action: string
    ipAddress: string
    timestamp: string
    isSuspicious: boolean
    aiRiskReason: string
    riskScore: number
    riskLevel: "LOW" | "MEDIUM" | "HIGH"
    detectorVersion: string
    provider: string | null
    deviceIdentifierHash: string | null
}

export type UserDevice = {
    deviceID: number
    ownerID: number
    deviceName: string
    platform: string
    firstSeenAt: string
    lastSeenAt: string
    primaryDevice: boolean
    active: boolean
    revokedAt: string | null
    currentDevice: boolean
}

export type PurchasePlanRequest = {
    planID: number
}

export type PurchasePlanResponse = UserAccount
