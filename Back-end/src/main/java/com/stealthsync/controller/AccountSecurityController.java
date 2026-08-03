package com.stealthsync.controller;

import com.stealthsync.model.dto.LoginResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.security.JwtService;
import com.stealthsync.service.security.RecoveryPhraseService;
import com.stealthsync.service.security.RecoveryLoginAttemptService;
import com.stealthsync.service.security.DeviceIdentifierService;
import com.stealthsync.service.security.DeviceRegistrationService;
import com.stealthsync.service.security.PasswordPolicy;
import com.stealthsync.service.security.SecurityAuditService;
import com.stealthsync.service.SubscriptionEntitlementService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
/** Exposes customer account-security actions that remain available after the dashboard split. */
public class AccountSecurityController {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final JwtService jwtService;
    private final RecoveryPhraseService recoveryPhraseService;
    private final RecoveryLoginAttemptService recoveryLoginAttemptService;
    private final DeviceRegistrationService deviceRegistrationService;
    private final SecurityAuditService securityAuditService;
    private final SubscriptionEntitlementService entitlementService;

    // Reset password now lives on the customer View Account page; the old
    // destructive account-wipe action is intentionally no longer exposed.
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, Object> request) {
        UserAccount user = currentUserService.requireUser();
        String currentPassword = asString(request.get("currentPassword"), "");
        String newPassword = asString(request.get("newPassword"), "");
        String confirmPassword = asString(request.get("confirmPassword"), "");
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        PasswordPolicy.requireStrong(newPassword);
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("New password and confirmation do not match.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userAccountRepository.save(user);
        securityAuditService.recordForUser(user.getUserID(), "PASSWORD_CHANGED", null);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Password changed successfully."));
    }

    // The backend generates and stores the recovery phrase hash so the frontend
    // never sends a caller-controlled userID or owns the phrase-generation rules.
    @GetMapping("/recovery-phrase/status")
    public ResponseEntity<Map<String, Boolean>> recoveryPhraseStatus() {
        UserAccount user = currentUserService.requireUser();
        return ResponseEntity.ok(Map.of(
                "configured",
                user.getRecoveryPhraseHash() != null && !user.getRecoveryPhraseHash().isBlank()
        ));
    }

    @PostMapping("/recovery-phrase/generate")
    @Transactional
    public ResponseEntity<Map<String, String>> generateRecoveryPhrase(
            @RequestBody(required = false) Map<String, Object> request) {
        UserAccount user = currentUserService.requireUser();
        requirePremium(user);
        boolean configured = user.getRecoveryPhraseHash() != null && !user.getRecoveryPhraseHash().isBlank();
        boolean rotationConfirmed = request != null && Boolean.TRUE.equals(request.get("confirmRotation"));
        if (configured && !rotationConfirmed) {
            throw new IllegalArgumentException("Recovery phrase is already configured. Confirm rotation to replace it.");
        }
        String phrase = recoveryPhraseService.generate();
        user.setRecoveryPhraseHash(passwordEncoder.encode(phrase));
        userAccountRepository.save(user);
        return ResponseEntity.ok(Map.of("recoveryPhrase", phrase));
    }

    @PostMapping("/recovery-phrase/login")
    public ResponseEntity<LoginResponse> loginWithRecoveryPhrase(
            @RequestBody Map<String, Object> request,
            HttpServletRequest servletRequest) {
        String usernameOrEmail = asString(request.get("usernameOrEmail"), "");
        String remoteAddress = servletRequest.getRemoteAddr();
        recoveryLoginAttemptService.requireAllowed(usernameOrEmail, remoteAddress);
        UserAccount user;
        try {
            String phrase = recoveryPhraseService.normalize(asString(request.get("recoveryPhrase"), ""));
            user = userAccountRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                    .filter(account -> account.getRecoveryPhraseHash() != null)
                    .filter(account -> passwordEncoder.matches(phrase, account.getRecoveryPhraseHash()))
                    .filter(account -> !account.isSuspended())
                    .filter(UserAccount::isSubscribed)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid recovery phrase."));
            recoveryLoginAttemptService.recordSuccess(usernameOrEmail, remoteAddress);
        } catch (Exception exception) {
            recoveryLoginAttemptService.recordFailure(usernameOrEmail, remoteAddress);
            securityAuditService.recordLogin(usernameOrEmail, "LOGIN_FAILED");
            throw new IllegalArgumentException("Invalid recovery phrase.");
        }
        var device = deviceRegistrationService.registerOrValidate(
                user,
                servletRequest.getHeader(DeviceIdentifierService.HEADER_NAME),
                asString(request.get("deviceName"), null),
                asString(request.get("platform"), null));
        securityAuditService.recordForUser(user.getUserID(), "LOGIN_SUCCESS", null);
        return ResponseEntity.ok(new LoginResponse(user, jwtService.createToken(
                user, device == null ? null : device.getDeviceIdentifierHash())));
    }

    private void requirePremium(UserAccount user) {
        if (!entitlementService.hasActivePremium(user)) {
            throw new IllegalArgumentException("Premium subscription required.");
        }
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }
}
