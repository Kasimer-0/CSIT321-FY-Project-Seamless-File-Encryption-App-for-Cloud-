package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "system_logs")
public class SystemLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String action;          // e.g., "LOGIN_ATTEMPT", "BULK_DOWNLOAD"

    @Column(nullable = false)
    private String ipAddress;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private boolean isSuspicious;   // Reserved for the US-AI-2 anomaly detection function.

    @Column(length = 1000)
    private String aiRiskReason;

    @JsonProperty("isSuspicious")
    public boolean isSuspicious() {
        return isSuspicious;
    }

    @JsonProperty("isSuspicious")
    public void setSuspicious(boolean suspicious) {
        isSuspicious = suspicious;
    }
}
