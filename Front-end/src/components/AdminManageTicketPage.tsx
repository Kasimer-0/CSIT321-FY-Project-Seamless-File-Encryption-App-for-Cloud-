import { useState, useEffect } from "react"
import type { UserAccount, TicketDTO } from "../Type"
import AdminViewTicket from "./AdminViewTicketPage"
import toast from "react-hot-toast"

type AdminManageTicketProps = {
    currentUser: UserAccount
}

function AdminManageTicket({ currentUser }: AdminManageTicketProps) {
    const [tickets, setTickets] = useState<TicketDTO[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedTicket, setSelectedTicket] = useState<TicketDTO | null>(null)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterPersonInCharge, setFilterPersonInCharge] = useState("all")
    const [filterRequester, setFilterRequester] = useState("all")
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchTickets = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append("search", search)
            if (filterStatus !== "all") params.append("status", filterStatus)
            if (filterPersonInCharge !== "all") params.append("personInCharge", filterPersonInCharge)
            if (filterRequester !== "all") params.append("requester", filterRequester)

            const response = await fetch(
                `http://localhost:8080/tickets?${params.toString()}`,
                { credentials: "include" }
            )

            if (!response.ok) {
                console.error("Failed to fetch tickets")
                return
            }

            const data = await response.json()
            setTickets(data)

        } catch (err) {
            console.error("Failed to fetch tickets")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchTickets, 300)
        return () => clearTimeout(timer)
    }, [search, filterStatus, filterPersonInCharge, filterRequester])

    const uniqueRequesters = Array.from(
        new Map(tickets.map(t => [t.ticketRequester.userID, t.ticketRequester])).values()
    )

    const uniqueAdmins = Array.from(
        new Map(
            tickets
                .filter(t => t.personInCharge)
                .map(t => [t.personInCharge!.userID, t.personInCharge!])
        ).values()
    )

    const handleSelect = (ticket: TicketDTO) => {
        setSelectedTicket(ticket)
        setView("detail")
    }

    const handleBack = () => {
        setView("list")
        setSelectedTicket(null)
        setShowConfirm(false)
        fetchTickets()
    }

    const handleAssignToMe = async () => {
        if (!selectedTicket) return

        try {
            const response = await fetch(
                `http://localhost:8080/tickets/${selectedTicket.ticketID}/assign`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ personInChargeId: currentUser.userID })
                }
            )

            if (!response.ok) {
                toast.error("Failed to assign ticket")
                return
            }

            await fetchTickets()
            setSelectedTicket({ ...selectedTicket, personInCharge: currentUser })
            toast.success("Ticket assigned to you successfully")

        } catch (err) {
            toast.error("Server connection failed")
        }
    }

    const handleCloseTicket = async () => {
        if (!selectedTicket) return

        try {
            const response = await fetch(
                `http://localhost:8080/tickets/${selectedTicket.ticketID}/close`,
                {
                    method: "PATCH",
                    credentials: "include"
                }
            )

            if (!response.ok) {
                toast.error("Failed to close ticket")
                return
            }

            await fetchTickets()
            setSelectedTicket({ ...selectedTicket, ticketStatus: "closed" })
            toast.success("Ticket closed successfully")

        } catch (err) {
            toast.error("Server connection failed")
        } finally {
            setShowConfirm(false)
        }
    }

    if (view === "detail" && selectedTicket) {
        return (
            <AdminViewTicket
                ticket={selectedTicket}
                onBack={handleBack}
                onAssignToMe={handleAssignToMe}
                onCloseTicket={handleCloseTicket}
                showConfirm={showConfirm}
                setShowConfirm={setShowConfirm}
            />
        )
    }

    return (
        <>
            <input
                className="form-control mb-2"
                placeholder="Search by title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="row g-2 mb-3">
                <div className="col-4">
                    <select
                        className="form-select form-select-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>

                <div className="col-4">
                    <select
                        className="form-select form-select-sm"
                        value={filterPersonInCharge}
                        onChange={(e) => setFilterPersonInCharge(e.target.value)}
                    >
                        <option value="all">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {uniqueAdmins.map(a => (
                            <option key={a.userID} value={a.userID}>{a.username}</option>
                        ))}
                    </select>
                </div>

                <div className="col-4">
                    <select
                        className="form-select form-select-sm"
                        value={filterRequester}
                        onChange={(e) => setFilterRequester(e.target.value)}
                    >
                        <option value="all">All Requesters</option>
                        {uniqueRequesters.map(r => (
                            <option key={r.userID} value={r.userID}>{r.username}</option>
                        ))}
                    </select>
                </div>
            </div>

            <ul className="list-group" style={{ maxHeight: 500, overflowY: "auto" }}>
                {loading ? (
                    <li className="list-group-item text-center text-muted">Loading...</li>
                ) : tickets.length === 0 ? (
                    <li className="list-group-item text-center text-muted">No tickets found</li>
                ) : (
                    tickets.map(ticket => (
                        <li
                            key={ticket.ticketID}
                            className="list-group-item d-flex justify-content-between align-items-center"
                            onClick={() => handleSelect(ticket)}
                            style={{ cursor: "pointer" }}
                        >
                            <div>
                                <div className="fw-medium">{ticket.ticketTitle}</div>
                                <small className="text-muted">
                                    #{ticket.ticketID} · {ticket.ticketRequester.username} ·{" "}
                                    {ticket.personInCharge
                                        ? `Assigned to ${ticket.personInCharge.username}`
                                        : "Unassigned"}
                                </small>
                            </div>
                            <span className={`badge ${ticket.ticketStatus === "open" ? "bg-warning text-dark" : "bg-secondary"}`}>
                                {ticket.ticketStatus}
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </>
    )
}

export default AdminManageTicket