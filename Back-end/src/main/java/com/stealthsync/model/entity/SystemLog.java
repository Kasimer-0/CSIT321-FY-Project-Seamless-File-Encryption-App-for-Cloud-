package com.stealthsync.model.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SystemLog {
    private Long logId;
    private String username;
    private String action;          // e.g., "LOGIN_ATTEMPT", "BULK_DOWNLOAD" 
    private String ipAddress;
    private LocalDateTime timestamp;
    private boolean isSuspicious;   // 👉 A flag reserved specifically for our US-AI-2 anomaly detection function.
    private String aiRiskReason;    // The AI ​​identifies the reason as suspicious (e.g., large-volume download from a different location at 3 AM).
}
