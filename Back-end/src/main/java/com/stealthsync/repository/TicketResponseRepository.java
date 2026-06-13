package com.stealthsync.repository;

import com.stealthsync.model.entity.TicketResponse;
import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for individual ticket conversation messages. */
public interface TicketResponseRepository extends JpaRepository<TicketResponse, Long> {
}
