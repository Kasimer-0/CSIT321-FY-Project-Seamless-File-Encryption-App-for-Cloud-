/**
 * Runtime-facing frontend contracts kept in sync with Entity.ts.
 * Existing components import Type.ts, so extending this file
 * it avoids a disruptive import rewrite while still typing every added API workflow.
 */
export type UserAccount = {
    userID : number
    username : string
    email : string
    role : "admin" | "customer"
    isSubscribed : boolean
    isSuspended : boolean
    subscription: number | SubscriptionDTO | null
}

export type Plan = {
    planID : number
    planTitle : string
    planPrice : number
    planDescription : string
    planStatus : "active" | "inactive"
    encMethod : string
}

export type Subscription = {
    subscriptionID : number
    plan: number 
    subscriber: number
    subcriptionStatus: string
    subcriptionStartDate: Date
    subscriptionEndDate: Date
}

export type EncryptedFile = {
    fileID: number
    fileName: string
    fileSize: number
    fileType: string
    uploadedAt: Date
    encMethod: string
    keyID: number
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

export type CloudStorageLink = {
    linkID: number
    provider: string
    accountEmail: string
    linkedAt: Date
    status: "connected" | "disconnected" | "expired"
    isActive: boolean
    ownerID: number
}

export type GoogleDriveFile = {
    fileId: string
    fileName: string
    originalName: string
    fileSize: number
    createdAt: string | null
    modifiedAt: string | null
}

export type PerformanceReport = {
    generatedAt: string
    totalUsers: number
    premiumUsers: number
    physicalTokens: number
    encryptedFiles: number
    cloudLinks: number
    activeCloudLinks: number
}

export type FinancialReport = {
    generatedAt: string
    activeSubscriptions: number
    monthlyRevenue: number
    paidPlanCount: number
    averageRevenuePerSubscription: number
    planRevenue: Array<{
        planTitle: string
        subscriberCount: number
        monthlyRevenue: number
    }>
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


export type MonthlyRevenue = {
    month: string;
    revenue: number;
}

export type DashboardStats = {
    totalUsers: number;
    premiumUsers: number;
    inactiveUsers: number;
    flaggedLogsCount: number;
    revenueStream: MonthlyRevenue[];
};


export type UserAccountDTO = {
    userID : number
    username : string
    email : string
    role : "admin" | "customer"
    isSubscribed : boolean
    isSuspended : boolean
    subscription: SubscriptionDTO | null
}


export type SubscriptionDTO = {
    subscriptionID : number
    plan: Plan 
    subscriber: UserAccount
    subcriptionStatus: string
    subcriptionStartDate: Date
    subscriptionEndDate: Date
}


export type PurchasePlanRequest = {
    userID: number
    planID: number
}

export type PurchasePlanResponse = UserAccount

