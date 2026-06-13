package com.stealthsync.repository;

import com.stealthsync.model.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for support ticket aggregates. */
public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
