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

export type PurchasePlanRequest = {
    userID: number
    planID: number
}

export type PurchasePlanResponse = UserAccount
