import { useState, useEffect } from "react"
import type { UserAccount } from "../Entity"
import type { Ticket } from "../Entity"
import AdminViewTicket from "./AdminViewTicketPage"

type AdminManageTicketProps = {
    currentUser: UserAccount
}

function AdminManageTicket({ currentUser }: AdminManageTicketProps) {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [view, setView] = useState<"list" | "detail">("list")
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterPersonInCharge, setFilterPersonInCharge] = useState("all")
    const [filterRequester, setFilterRequester] = useState("all")
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchTickets = async () => {
        try {
            setLoading(true)

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
            console.error("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTickets()
        }, 400)

        return () => clearTimeout(timer)
    }, [search, filterStatus, filterPersonInCharge, filterRequester])

    const uniqueRequesters = Array.from(
        new Map(tickets.map(t => [t.ticketRequester.id, t.ticketRequester])).values()
    )

    const uniqueAdmins = Array.from(
        new Map(
            tickets
                .filter(t => t.personInCharge !== null)
                .map(t => [t.personInCharge!.id, t.personInCharge!])
        ).values()
    )

    const handleSelect = (ticket: Ticket) => {
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
                    body: JSON.stringify({ personInChargeId: currentUser.id })
                }
            )

            if (!response.ok) {
                console.error("Failed to assign ticket")
                return
            }

            await fetchTickets()

            setSelectedTicket({
                ...selectedTicket,
                personInCharge: currentUser
            })

        } catch (err) {
            console.error("Server connection failed")
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
                console.error("Failed to close ticket")
                return
            }

            await fetchTickets()

            setSelectedTicket({
                ...selectedTicket,
                ticketStatus: "closed"
            })

        } catch (err) {
            console.error("Server connection failed")
        } finally {
            setShowConfirm(false)
        }
    }

    if (view === "detail" && selectedTicket) {
        return (
            <AdminViewTicket
                ticket={selectedTicket}
                currentUser={currentUser}
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
                        <option value="all">All Statuses</option>
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
                        {uniqueAdmins.map(admin => (
                            <option key={admin.id} value={admin.id}>
                                {admin.username}
                            </option>
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
                        {uniqueRequesters.map(req => (
                            <option key={req.id} value={req.id}>
                                {req.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <ul className="list-group" style={{ maxHeight: 500, overflowY: "auto" }}>
                {loading ? (
                    <li className="list-group-item text-center text-muted">
                        Loading...
                    </li>
                ) : tickets.length === 0 ? (
                    <li className="list-group-item text-muted text-center">
                        No tickets found
                    </li>
                ) : (
                    tickets.map(ticket => (
                        <li
                            key={ticket.ticketID}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelect(ticket)}
                        >
                            <div>
                                <div className="fw-medium">{ticket.ticketTitle}</div>
                                <small className="text-muted">
                                    #{ticket.ticketID} · {ticket.ticketRequester.username} ·{" "}
                                    {ticket.personInCharge
                                        ? `Assigned to ${ticket.personInCharge.username}`
                                        : <span className="text-danger">Unassigned</span>
                                    }
                                </small>
                            </div>

                            <span className={`badge ${ticket.ticketStatus === "open"
                                ? "bg-warning text-dark"
                                : "bg-secondary"
                                }`}>
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