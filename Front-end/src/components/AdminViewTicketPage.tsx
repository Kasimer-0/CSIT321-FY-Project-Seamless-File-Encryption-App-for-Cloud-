import type { TicketDTO } from "../Type"

type AdminViewTicketProps = {
    ticket: TicketDTO
    onBack: () => void
    onAssignToMe: () => void
    onCloseTicket: () => void
    showConfirm: boolean
    setShowConfirm: (value: boolean) => void
}

function AdminViewTicket({ ticket, onBack, onAssignToMe, onCloseTicket, showConfirm, setShowConfirm }: AdminViewTicketProps) {
    return (
        <div className="card p-4">
            <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
                ← Back
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

            <div className="card bg-light p-3 mb-4">
                <small className="text-muted fw-semibold mb-1 d-block">Description</small>
                <p className="mb-0" style={{ fontSize: 14 }}>{ticket.ticketDescription}</p>
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