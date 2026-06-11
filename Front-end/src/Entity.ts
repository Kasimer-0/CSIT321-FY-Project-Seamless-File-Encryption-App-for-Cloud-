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

export type Ticket = {
    ticketID: number
    ticketTitle: string
    ticketDescription: string
    ticketStatus: string
    ticketRequester: UserAccount
    personInCharge: UserAccount | null
    responses: TicketResponse[]
}

export type TicketResponse = {
    responseId: number
    message: string
    senderRole: "admin" | "customer"
    timestamp: string
}

export type EncryptionKeyRecord = {
    keyID: number
    ownerID: number
    keyName: string
    algorithm: string
    status: "active" | "inactive" | "retired"
    fingerprint: string
    createdAt: Date
    updatedAt: Date
}

export type PhysicalTokenRecord = {
    tokenID: number
    ownerID: number
    tokenName: string
    serialNumber: string
    status: "active" | "inactive"
    registeredAt: Date
    lastUsedAt: Date | null
}

export type CloudStorageUsage = {
    usedBytes: number
    totalBytes: number
    availableBytes: number
    fileCount: number
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
    username: string
    action: string
    ipAddress: string
    timestamp: string
    isSuspicious: boolean
    aiRiskReason: string
}

export type PurchasePlanRequest = {
    userID: number
    planID: number
}

export type PurchasePlanResponse = UserAccount
