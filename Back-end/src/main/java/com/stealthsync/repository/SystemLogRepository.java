package com.stealthsync.repository;

import com.stealthsync.model.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
}
