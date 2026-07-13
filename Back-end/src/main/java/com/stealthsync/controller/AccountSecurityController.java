package com.stealthsync.controller;

import com.stealthsync.model.dto.LoginResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.security.JwtService;
import com.stealthsync.service.security.RecoveryPhraseService;
import com.stealthsync.service.security.RecoveryLoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/account")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Exposes customer account-security actions that remain available after the dashboard split. */
public class AccountSecurityController {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final JwtService jwtService;
    private final RecoveryPhraseService recoveryPhraseService;
    private final RecoveryLoginAttemptService recoveryLoginAttemptService;

    // Reset password now lives on the customer View Account page; the old
    // destructive account-wipe action is intentionally no longer exposed.
    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<UserAccount> resetPassword(@RequestBody Map<String, Object> request) {
        UserAccount user = currentUserService.requireUser();
        String newPassword = asString(request.get("newPassword"), "");
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must contain at least 8 characters.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return ResponseEntity.ok(userAccountRepository.save(user));
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
        try {
            String phrase = recoveryPhraseService.normalize(asString(request.get("recoveryPhrase"), ""));
            UserAccount user = userAccountRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                    .filter(account -> account.getRecoveryPhraseHash() != null)
                    .filter(account -> passwordEncoder.matches(phrase, account.getRecoveryPhraseHash()))
                    .filter(account -> !account.isSuspended())
                    .filter(UserAccount::isSubscribed)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid recovery phrase."));
            recoveryLoginAttemptService.recordSuccess(usernameOrEmail, remoteAddress);
            return ResponseEntity.ok(new LoginResponse(user, jwtService.createToken(user)));
        } catch (Exception exception) {
            recoveryLoginAttemptService.recordFailure(usernameOrEmail, remoteAddress);
            throw new IllegalArgumentException("Invalid recovery phrase.");
        }
    }

    private void requirePremium(UserAccount user) {
        if (!user.isSubscribed()) {
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
