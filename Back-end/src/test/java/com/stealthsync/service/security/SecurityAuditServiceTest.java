package com.stealthsync.service.security;

import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.ai.AnomalyDetectorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:security-audit-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/security-audit-test-vault",
        "stealthsync.jwt.secret=security-audit-test-signing-secret"
})
class SecurityAuditServiceTest {

    @Autowired private SecurityAuditService auditService;
    @Autowired private SystemLogRepository logRepository;
    @Autowired private UserAccountRepository userRepository;

    private UserAccount userA;
    private UserAccount userB;

    @BeforeEach
    void setUp() {
        logRepository.deleteAll();
        userA = userRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        userB = userRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader(DeviceIdentifierService.HEADER_NAME, "audit-device-raw-value");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void singleSuccessfulLoginIsLowRisk() {
        auditService.recordForUser(userA.getUserID(), "LOGIN_SUCCESS", null);
        SystemLog event = latest();
        assertEquals(0, event.getRiskScore());
        assertEquals("LOW", event.getRiskLevel());
        assertFalse(event.isSuspicious());
    }

    @Test
    void fifthLoginFailureTriggersHighRisk() {
        repeat(userA, "LOGIN_FAILED", 5);
        assertHigh(latest(), "login failures");
    }

    @Test
    void thirdWrongKeyPasswordTriggersHighRisk() {
        repeat(userA, "WRONG_KEY_PASSWORD", 3);
        assertHigh(latest(), "wrong key passwords");
    }

    @Test
    void rapidDownloadsAfterNewDeviceTriggerHighRisk() {
        auditService.recordForUser(userA.getUserID(), "DEVICE_REGISTERED", null);
        repeat(userA, "FILE_DOWNLOAD_SUCCESS", 10);
        assertHigh(latest(), "download burst");
    }

    @Test
    void repeatedDeniedDeviceRequestsTriggerHighRisk() {
        repeat(userA, "DEVICE_ACCESS_DENIED", 3);
        assertHigh(latest(), "repeatedly requested access");
    }

    @Test
    void activityWindowsDoNotMixDifferentUsers() {
        repeat(userA, "LOGIN_FAILED", 4);
        auditService.recordForUser(userB.getUserID(), "LOGIN_FAILED", null);
        SystemLog userBEvent = latest();
        assertEquals(userB.getUserID(), userBEvent.getUserID());
        assertEquals("LOW", userBEvent.getRiskLevel());
    }

    @Test
    void auditRecordContainsOnlyHashedDeviceIdentifierAndNoSecrets() {
        auditService.recordForUser(userA.getUserID(), "FILE_UPLOAD_SUCCESS", "dropbox");
        SystemLog event = latest();
        assertNotEquals("audit-device-raw-value", event.getDeviceIdentifierHash());
        assertEquals(64, event.getDeviceIdentifierHash().length());
        String serializedFields = String.join(" ", List.of(
                event.getAction(), event.getAiRiskReason(), event.getProvider(), event.getDeviceIdentifierHash()));
        assertFalse(serializedFields.contains("password"));
        assertFalse(serializedFields.contains("token"));
        assertFalse(serializedFields.contains("raw key"));
    }

    @Test
    void transactionCommitFailureDoesNotBlockTheCallingOperation() {
        RequestContextHolder.resetRequestAttributes();
        SystemLogRepository failingLogRepository = mock(SystemLogRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        AnomalyDetectorService detector = mock(AnomalyDetectorService.class);
        DeviceIdentifierService identifiers = mock(DeviceIdentifierService.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        TransactionStatus transactionStatus = mock(TransactionStatus.class);

        when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
        when(detector.assess(isNull(), eq("unknown"), eq("LOGIN_FAILED"), any()))
                .thenReturn(new AnomalyDetectorService.RiskAssessment(10, "LOW", "Test assessment", "test"));
        doThrow(new IllegalStateException("Simulated audit commit failure"))
                .when(transactionManager).commit(transactionStatus);

        SecurityAuditService bestEffortAudit = new SecurityAuditService(
                failingLogRepository, users, detector, identifiers, transactionManager);

        assertDoesNotThrow(() -> bestEffortAudit.recordForUser(null, "LOGIN_FAILED", null));
        verify(failingLogRepository).save(any(SystemLog.class));
    }

    private void repeat(UserAccount user, String action, int count) {
        for (int index = 0; index < count; index++) {
            auditService.recordForUser(user.getUserID(), action, null);
        }
    }

    private SystemLog latest() {
        return logRepository.findAll().stream()
                .max(java.util.Comparator.comparing(SystemLog::getLogId))
                .orElseThrow();
    }

    private void assertHigh(SystemLog event, String expectedReason) {
        assertTrue(event.getRiskScore() >= 60);
        assertEquals("HIGH", event.getRiskLevel());
        assertTrue(event.isSuspicious());
        assertTrue(event.getAiRiskReason().toLowerCase().contains(expectedReason));
    }
}
