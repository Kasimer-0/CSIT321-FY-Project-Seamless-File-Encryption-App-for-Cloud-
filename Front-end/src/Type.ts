export type UserAccount = {
    userID : number
    username : string
    email : string
    role : "admin" | "customer"
    isSubscribed : boolean
    isSuspended : boolean
    subscription: number|null
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

export type Ticket = {
    ticketID : number
    ticketTitle : string
    ticketDescription : string
    ticketStatus : string
    ticketRequester: number
    personInCharge: number | null
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



export type UserAccountDTO = {
    userID : number
    username : string
    email : string
    role : "admin" | "customer"
    isSubscribed : boolean
    isSuspended : boolean
    subscription: SubscriptionDTO
}


export type SubscriptionDTO = {
    subscriptionID : number
    plan: Plan 
    subscriber: UserAccount
    subcriptionStatus: string
    subcriptionStartDate: Date
    subscriptionEndDate: Date
}

export type TicketDTO = {
    ticketID : number
    ticketTitle : string
    ticketDescription : string
    ticketStatus : string
    ticketRequester: UserAccount
    personInCharge: UserAccount | null
}

export type CreateTicketDTO = {
    ticketTitle: string
    ticketDescription: string
    ticketRequesterID: number
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