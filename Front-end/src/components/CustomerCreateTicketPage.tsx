import { useState } from "react"
import type { CreateTicketDTO, UserAccount } from "../Type"

type Props = {
    user: UserAccount
    onCreate: (ticket: CreateTicketDTO) => void
}

function CustomerCreateTicket({ user, onCreate }: Props) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")

    const handleSubmit = () => {
        if (!title.trim() || !description.trim()) return
        onCreate({
            ticketTitle: title,
            ticketDescription: description,
            ticketRequesterID: user.userID
        })
        setTitle("")
        setDescription("")
    }

    return (
        <>
            <h5 className="mb-3">Create Ticket</h5>
            <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter issue title"
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                    className="form-control"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue"
                />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit}>
                Submit Ticket
            </button>
        </>
    )
}

export default CustomerCreateTicket