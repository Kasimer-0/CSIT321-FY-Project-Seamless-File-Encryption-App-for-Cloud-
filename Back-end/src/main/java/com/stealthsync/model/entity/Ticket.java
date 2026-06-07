package com.stealthsync.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tickets")
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ticket_id")
    private Long ticketID;        // Align the ticketID: number in Entity.ts

    @Column(nullable = false)
    private String ticketTitle;

    @Column(length = 2000)
    private String ticketDescription;

    @Column(nullable = false)
    private String ticketStatus;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ticket_requester_id", nullable = false)
    private UserAccount ticketRequester; // Align the nested UserAccount in Entity.ts

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "person_in_charge_id")
    private UserAccount personInCharge;  // Can be null
}
