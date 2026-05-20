package com.stealthsync.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {
    private Long ticketID;        // Align the ticketID: number in Entity.ts
    private String ticketTitle;
    private String ticketDescription;
    private String ticketStatus;
    private UserAccount ticketRequester; // Align the nested UserAccount in Entity.ts
    private UserAccount personInCharge;  // Can be null
}
