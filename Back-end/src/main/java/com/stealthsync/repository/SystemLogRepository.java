package com.stealthsync.repository;

import com.stealthsync.model.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

/** Database access for auditable and anomaly-flagged system events. */
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    long countByUserIDAndActionAndTimestampAfter(Long userID, String action, LocalDateTime after);

    long countByUsernameAndActionAndTimestampAfter(String username, String action, LocalDateTime after);

    boolean existsByUserIDAndActionAndTimestampAfter(Long userID, String action, LocalDateTime after);
}
