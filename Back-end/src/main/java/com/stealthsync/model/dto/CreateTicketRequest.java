package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Request body for opening a customer support ticket. */
public class CreateTicketRequest {
    private String ticketTitle;
    private String ticketDescription;
    private Long ticketRequesterID;
}
