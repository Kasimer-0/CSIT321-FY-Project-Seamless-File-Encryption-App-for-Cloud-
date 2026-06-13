package com.stealthsync.model.dto;

import com.stealthsync.model.entity.TicketResponse;
import lombok.Data;

import java.util.List;

@Data
/** Ticket API view with nested requester, assignee, and conversation responses. */
public class TicketDTO {
    private String ticketID;
    private String ticketTitle;
    private String ticketDescription;
    private String ticketStatus; // "open" or "closed"
    private UserAccountDTO ticketRequester; // Work order initiator
    private UserAccountDTO personInCharge;  // Person in charge (may be empty)
    private List<TicketResponse> responses;
}
