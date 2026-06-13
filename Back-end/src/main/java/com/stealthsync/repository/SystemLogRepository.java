package com.stealthsync.repository;

import com.stealthsync.model.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for auditable and anomaly-flagged system events. */
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
}
