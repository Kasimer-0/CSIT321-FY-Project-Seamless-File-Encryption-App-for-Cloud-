package com.stealthsync.service.security;

import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.ai.AnomalyDetectorService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
/** Persists sanitized security events without allowing audit failures to block user operations. */
public class SecurityAuditService {

    private final SystemLogRepository systemLogRepository;
    private final UserAccountRepository userAccountRepository;
    private final AnomalyDetectorService anomalyDetectorService;
    private final DeviceIdentifierService deviceIdentifierService;
    private final PlatformTransactionManager transactionManager;

    public void recordForUser(Long userID, String action, String provider) {
        try {
            executeInNewTransaction(() -> {
                UserAccount user = userID == null ? null : userAccountRepository.findById(userID).orElse(null);
                save(user, user == null ? "unknown" : user.getUsername(), action, provider);
            });
        } catch (Exception exception) {
            log.warn("Security audit event {} could not be persisted for user {}.", action, userID);
        }
    }

    public void recordLogin(String usernameOrEmail, String action) {
        try {
            executeInNewTransaction(() -> {
                String identifier = usernameOrEmail == null ? "" : usernameOrEmail.trim();
                UserAccount user = userAccountRepository
                        .findByUsernameIgnoreCaseOrEmailIgnoreCase(identifier, identifier)
                        .orElse(null);
                save(user, user == null ? "unknown" : user.getUsername(), action, null);
            });
        } catch (Exception exception) {
            log.warn("Security audit login event {} could not be persisted.", action);
        }
    }

    private void executeInNewTransaction(Runnable operation) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transaction.executeWithoutResult(status -> operation.run());
    }

    private void save(UserAccount user, String username, String action, String provider) {
        HttpServletRequest request = currentRequest();
        LocalDateTime timestamp = LocalDateTime.now();
        AnomalyDetectorService.RiskAssessment assessment = anomalyDetectorService.assess(
                user == null ? null : user.getUserID(), username, action, timestamp);

        SystemLog event = new SystemLog();
        event.setUserID(user == null ? null : user.getUserID());
        event.setUsername(username);
        event.setAction(action);
        event.setIpAddress(request == null ? "unavailable" : request.getRemoteAddr());
        event.setTimestamp(timestamp);
        event.setRiskScore(assessment.score());
        event.setRiskLevel(assessment.level());
        event.setAiRiskReason(assessment.reason());
        event.setDetectorVersion(assessment.detectorVersion());
        event.setProvider(provider);
        event.setDeviceIdentifierHash(deviceHash(request));
        event.setSuspicious("HIGH".equals(assessment.level()));
        systemLogRepository.save(event);
    }

    private String deviceHash(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String raw = request.getHeader(DeviceIdentifierService.HEADER_NAME);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return deviceIdentifierService.requireHash(raw);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }
}
