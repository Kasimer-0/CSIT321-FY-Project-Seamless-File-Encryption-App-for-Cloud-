export type UserAccount = {
    id : number
    username : string
    email : string
    role : "admin" | "customer"
    isPremium : boolean
    isSuspended : Boolean
}

export type Plan = {
    planID : number
    planTitle : string
    planPrice : number
    planDescription : string
    planStatus : string
    encMethod : string
}

export type Ticket = {
    ticketID : number
    ticketTitle : string
    ticketDescription : string
    ticketStatus : string
    ticketRequester : UserAccount
    personInCharge : UserAccount | null
}