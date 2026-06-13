import { useState } from "react"
import type { TicketDTO, TicketResponse } from "../Type"
import toast from "react-hot-toast"

/**
 * Codex-added ticket conversation view for administrators.
 * Replies are persisted as TicketResponse records, and senderRole controls the visual
 * side of each message without exposing or duplicating a user ID in every response.
 */
type AdminViewTicketProps = {
    ticket: TicketDTO
    onBack: () => void
    onAssignToMe: () => void
    onCloseTicket: () => void
    onResponseAdded: (response: TicketResponse) => void
    showConfirm: boolean
    setShowConfirm: (value: boolean) => void
}

function AdminViewTicket({
    ticket,
    onBack,
    onAssignToMe,
    onCloseTicket,
    onResponseAdded,
    showConfirm,
    setShowConfirm
}: AdminViewTicketProps) {
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)

    const responses = ticket.responses ?? []

    // Save the reply first, then let the parent merge the returned database record into local state.
    const handleSendResponse = async () => {
        const trimmedMessage = message.trim()
        if (!trimmedMessage) return

        setSending(true)

        try {
            const response = await fetch(`http://localhost:8080/tickets/${ticket.ticketID}/responses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    message: trimmedMessage,
                    senderRole: "admin"
                })
            })

            if (!response.ok) {
                toast.error("Failed to send response")
                return
            }

            const savedResponse: TicketResponse = await response.json()
            onResponseAdded(savedResponse)
            setMessage("")
            toast.success("Response sent")
        } catch {
            toast.error("Server connection failed")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="card p-4">
            <button className="btn btn-outline-secondary mb-3 align-self-start" onClick={onBack}>
                Back
            </button>

            <div className="d-flex justify-content-between align-items-start mb-3">
                <h5 className="mb-0">{ticket.ticketTitle}</h5>
                <span className={`badge ${ticket.ticketStatus === "open" ? "bg-warning text-dark" : "bg-secondary"}`}>
                    {ticket.ticketStatus}
                </span>
            </div>

            <p className="text-muted mb-1">Ticket ID: #{ticket.ticketID}</p>
            <p className="text-muted mb-1">
                Requester: {ticket.ticketRequester.username} ({ticket.ticketRequester.email})
            </p>
            <p className="text-muted mb-3">
                Person in Charge: {ticket.personInCharge
                    ? ticket.personInCharge.username
                    : <span className="text-danger">Unassigned</span>
                }
            </p>

            <div className="border rounded bg-light p-3 mb-4">
                <small className="text-muted fw-semibold mb-1 d-block">Description</small>
                <p className="mb-0" style={{ fontSize: 14 }}>{ticket.ticketDescription}</p>
            </div>

            <div className="mb-4">
                <small className="text-muted fw-semibold mb-2 d-block">Conversation</small>
                <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 300, overflowY: "auto" }}>
                    {responses.length === 0 ? (
                        <div className="text-muted" style={{ fontSize: 13 }}>No responses yet.</div>
                    ) : responses.map(response => {
                        const fromAdmin = response.senderRole === "admin"
                        return (
                            <div
                                key={response.responseId}
                                className={`d-flex ${fromAdmin ? "justify-content-end" : "justify-content-start"}`}
                            >
                                <div
                                    className={`rounded px-3 py-2 ${fromAdmin ? "bg-primary text-white" : "bg-white border"}`}
                                    style={{ maxWidth: "72%", fontSize: 14 }}
                                >
                                    <div
                                        className={`fw-semibold mb-1 ${fromAdmin ? "text-white" : "text-muted"}`}
                                        style={{ fontSize: 11 }}
                                    >
                                        {fromAdmin ? "Admin" : "Customer"}
                                    </div>
                                    <div>{response.message}</div>
                                    <div className={fromAdmin ? "text-white-50" : "text-muted"} style={{ fontSize: 11 }}>
                                        {new Date(response.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {ticket.ticketStatus === "open" && (
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault()
                                    handleSendResponse()
                                }
                            }}
                            placeholder="Write a response..."
                            disabled={sending}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleSendResponse}
                            disabled={sending || !message.trim()}
                        >
                            {sending ? "Sending..." : "Send"}
                        </button>
                    </div>
                )}
            </div>

            {ticket.ticketStatus === "open" && (
                <div className="d-flex gap-2">
                    {!ticket.personInCharge && (
                        <button className="btn btn-outline-primary" onClick={onAssignToMe}>
                            Assign to Me
                        </button>
                    )}
                    <button className="btn btn-danger" onClick={() => setShowConfirm(true)}>
                        Close Ticket
                    </button>
                </div>
            )}

            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                >
                    <div className="card p-4" style={{ width: 360 }}>
                        <h6 className="mb-2">Close Ticket?</h6>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            This will mark the ticket as closed. This action cannot be undone.
                        </p>
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={onCloseTicket}>
                                Yes, Close Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminViewTicket
