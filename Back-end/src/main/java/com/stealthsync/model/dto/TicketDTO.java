package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class TicketDTO {
    private String ticketID;
    private String ticketTitle;
    private String ticketStatus; // "open" or "closed"
    private UserAccountDTO ticketRequester; // Work order initiator
    private UserAccountDTO personInCharge;  // Person in charge (may be empty)
}
