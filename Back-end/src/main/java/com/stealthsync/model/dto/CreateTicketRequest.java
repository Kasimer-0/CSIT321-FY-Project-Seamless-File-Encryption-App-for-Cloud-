package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class CreateTicketRequest {
    private String ticketTitle;
    private String ticketDescription;
    private Long ticketRequesterID;
}
