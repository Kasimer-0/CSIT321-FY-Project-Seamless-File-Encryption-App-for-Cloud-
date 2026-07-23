package com.stealthsync.service.ai;

import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.repository.SystemLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
/** Applies explainable runtime rules to persisted, owner-separated security events. */
public class AnomalyDetectorService {

    public static final String DETECTOR_VERSION = "explainable-rules-v1";

    private final SystemLogRepository systemLogRepository;

    public RiskAssessment assess(Long userID, String username, String action, LocalDateTime timestamp) {
        LocalDateTime eventTime = timestamp == null ? LocalDateTime.now() : timestamp;
        String normalizedAction = action == null ? "UNKNOWN" : action.trim().toUpperCase();
        int score = 0;
        List<String> reasons = new ArrayList<>();

        if ("LOGIN_FAILED".equals(normalizedAction)) {
            long count = eventCount(userID, username, normalizedAction, eventTime.minusMinutes(10)) + 1;
            score = count >= 5 ? 60 : 10;
            reasons.add(count >= 5
                    ? "Five or more login failures occurred within 10 minutes."
                    : "A login attempt failed.");
        } else if ("WRONG_KEY_PASSWORD".equals(normalizedAction)) {
            long count = eventCount(userID, username, normalizedAction, eventTime.minusMinutes(10)) + 1;
            score = count >= 3 ? 60 : 15;
            reasons.add(count >= 3
                    ? "Three or more wrong key passwords occurred within 10 minutes."
                    : "A wrong key password was supplied.");
        } else if ("FILE_DOWNLOAD_SUCCESS".equals(normalizedAction)) {
            long count = eventCount(userID, username, normalizedAction, eventTime.minusMinutes(5)) + 1;
            if (count >= 10) {
                score += 35;
                reasons.add("Ten or more downloads occurred within 5 minutes.");
                if (userID != null && systemLogRepository.existsByUserIDAndActionAndTimestampAfter(
                        userID, "DEVICE_REGISTERED", eventTime.minusMinutes(10))) {
                    score += 25;
                    reasons.add("The download burst followed a recent device registration.");
                }
            }
        } else if ("DEVICE_ACCESS_DENIED".equals(normalizedAction)) {
            long count = eventCount(userID, username, normalizedAction, eventTime.minusMinutes(10)) + 1;
            score = count >= 3 ? 60 : 20;
            reasons.add(count >= 3
                    ? "A denied device repeatedly requested access within 10 minutes."
                    : "A device access request was denied.");
        } else if ("FILE_DELETE".equals(normalizedAction)) {
            long count = eventCount(userID, username, normalizedAction, eventTime.minusMinutes(5)) + 1;
            score = count >= 10 ? 60 : 0;
            if (count >= 10) {
                reasons.add("Ten or more file deletions occurred within 5 minutes.");
            }
        } else if (normalizedAction.endsWith("_FAILED") || "DECRYPTION_FAILED".equals(normalizedAction)) {
            score = 10;
            reasons.add("A protected operation failed.");
        }

        score = Math.min(score, 100);
        String level = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
        String reason = reasons.isEmpty() ? "No anomaly rule was triggered." : String.join(" ", reasons);
        return new RiskAssessment(score, level, reason, DETECTOR_VERSION);
    }

    public boolean isSuspicious(SystemLog log) {
        if (log == null) {
            return false;
        }
        return log.isSuspicious()
                || "HIGH".equalsIgnoreCase(log.getRiskLevel())
                || (log.getRiskScore() != null && log.getRiskScore() >= 60);
    }

    private long eventCount(Long userID, String username, String action, LocalDateTime after) {
        if (userID != null) {
            return systemLogRepository.countByUserIDAndActionAndTimestampAfter(userID, action, after);
        }
        return systemLogRepository.countByUsernameAndActionAndTimestampAfter(username, action, after);
    }

    public record RiskAssessment(int score, String level, String reason, String detectorVersion) { }
}
