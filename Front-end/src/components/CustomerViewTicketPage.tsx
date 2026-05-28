import { useState } from "react"
import type { TicketDTO } from "../Type"

type Props = {
    ticket: TicketDTO
    onBack: () => void
    onClose: (ticketID: number) => void
}

function CustomerViewTicket({ ticket, onBack, onClose }: Props) {
    const [showConfirm, setShowConfirm] = useState(false)

    const handleClose = async () => {
        await onClose(ticket.ticketID)
        setShowConfirm(false)
    }

    return (
        <>
            <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
                ← Back
            </button>

            <div className="d-flex justify-content-between align-items-start mb-3">
                <h5 className="mb-0">{ticket.ticketTitle}</h5>
                <span className={`badge ${ticket.ticketStatus === "open" ? "bg-primary" : "bg-secondary"}`}>
                    {ticket.ticketStatus}
                </span>
            </div>

            <p className="text-muted mb-1" style={{ fontSize: 13 }}>Ticket ID: #{ticket.ticketID}</p>
            <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                Assigned To: {ticket.personInCharge?.username ?? <span className="text-danger">Unassigned</span>}
            </p>

            <div className="card bg-light p-3 mb-4">
                <small className="text-muted fw-semibold mb-1 d-block">Description</small>
                <p className="mb-0" style={{ fontSize: 14 }}>{ticket.ticketDescription}</p>
            </div>

            {ticket.ticketStatus === "open" && (
                <button className="btn btn-danger" onClick={() => setShowConfirm(true)}>
                    Close Ticket
                </button>
            )}

            {showConfirm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(0,0,0,0.5)", zIndex: 999 }}
                >
                    <div className="card p-4" style={{ width: 360 }}>
                        <h6 className="mb-2">Close Ticket?</h6>
                        <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                            This will close your ticket. Only do this if your issue has been resolved.
                        </p>
                        <div className="d-flex gap-2 justify-content-end">
                            <button className="btn btn-outline-secondary" onClick={() => setShowConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleClose}>
                                Yes, Close Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CustomerViewTicket