package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Request body for adding a role-labelled message to a ticket conversation. */
public class CreateTicketResponseRequest {
    private String message;
    private String senderRole;
}
