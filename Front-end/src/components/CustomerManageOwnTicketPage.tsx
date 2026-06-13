import { useState } from "react"
import type { TicketDTO, TicketResponse, UserAccount } from "../Type"
import CustomerViewTicket from "./CustomerViewTicketPage"
import toast from "react-hot-toast"

type Props = {
    user: UserAccount
    tickets: TicketDTO[]
    onCloseTicket: (ticketID: number) => void
    onTicketResponseAdded: (ticketID: number, response: TicketResponse) => void
}

function CustomerManageOwnTicket({ user, tickets, onCloseTicket, onTicketResponseAdded }: Props) {
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterAssignee, setFilterAssignee] = useState("all")
    const [selectedTicket, setSelectedTicket] = useState<TicketDTO | null>(null)

    const myTickets = tickets.filter(t => t.ticketRequester.userID === user.userID)

    const uniqueAssignees = Array.from(
        new Map(
            myTickets
                .filter(t => t.personInCharge !== null)
                .map(t => [t.personInCharge!.userID, t.personInCharge!])
        ).values()
    )

    const filteredTickets = myTickets.filter(t => {
        const matchSearch = t.ticketTitle.toLowerCase().includes(search.toLowerCase())
        const matchStatus = filterStatus === "all" || t.ticketStatus === filterStatus
        const matchAssignee =
            filterAssignee === "all" ||
            (filterAssignee === "unassigned" && t.personInCharge === null) ||
            (t.personInCharge !== null && t.personInCharge.userID === parseInt(filterAssignee))
        return matchSearch && matchStatus && matchAssignee
    })

    const handleCloseTicket = async (ticketID: number) => {
        try {
            const response = await fetch(`http://localhost:8080/tickets/${ticketID}/close`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ticketStatus: "closed" })
            })

            if (!response.ok) {
                toast.error("Failed to close ticket")
                return
            }

            onCloseTicket(ticketID)

            if (selectedTicket?.ticketID === ticketID) {
                setSelectedTicket({ ...selectedTicket, ticketStatus: "closed" })
            }

            toast.success("Ticket closed successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    // Codex integration note: synchronize both the selected detail and dashboard ticket list
    // after a response is saved, preventing the conversation from disappearing on navigation.
    const handleResponseAdded = (response: TicketResponse) => {
        if (!selectedTicket) return

        const updatedTicket = {
            ...selectedTicket,
            responses: [...(selectedTicket.responses ?? []), response]
        }

        setSelectedTicket(updatedTicket)
        onTicketResponseAdded(updatedTicket.ticketID, response)
    }

    if (selectedTicket) {
        return (
            <CustomerViewTicket
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                onClose={handleCloseTicket}
                onResponseAdded={handleResponseAdded}
            />
        )
    }

    return (
        <>
            <h5 className="mb-3">My Tickets</h5>

            <input
                className="form-control mb-2"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="row g-2 mb-3">
                <div className="col-6">
                    <select
                        className="form-select form-select-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>

                <div className="col-6">
                    <select
                        className="form-select form-select-sm"
                        value={filterAssignee}
                        onChange={(e) => setFilterAssignee(e.target.value)}
                    >
                        <option value="all">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {uniqueAssignees.map(admin => (
                            <option key={admin.userID} value={admin.userID}>{admin.username}</option>
                        ))}
                    </select>
                </div>
            </div>

            {myTickets.length === 0 ? (
                <p className="text-muted">No tickets found.</p>
            ) : (
                <div className="d-flex flex-column gap-3" style={{ maxHeight: 500, overflowY: "auto" }}>
                    {filteredTickets.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: 13 }}>No tickets match your search.</p>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div
                                key={ticket.ticketID}
                                className="border rounded p-3"
                                style={{ cursor: "pointer" }}
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <div className="d-flex justify-content-between">
                                    <h6 className="mb-1">{ticket.ticketTitle}</h6>
                                    <span className={`badge ${
                                        ticket.ticketStatus === "open" ? "bg-primary" :
                                        ticket.ticketStatus === "closed" ? "bg-success" :
                                        "bg-secondary"
                                    }`}>
                                        {ticket.ticketStatus}
                                    </span>
                                </div>
                                <p className="text-muted mb-2" style={{ fontSize: 14 }}>
                                    {ticket.ticketDescription}
                                </p>
                                <div style={{ fontSize: 12 }} className="text-muted">
                                    <div><b>Ticket ID:</b> #{ticket.ticketID}</div>
                                    <div><b>Assigned To:</b> {ticket.personInCharge?.username ?? <span className="text-danger">Unassigned</span>}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    )
}

export default CustomerManageOwnTicket
