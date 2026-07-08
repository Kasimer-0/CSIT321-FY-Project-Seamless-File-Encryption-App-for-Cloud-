package com.stealthsync.controller;

import com.stealthsync.model.dto.LoginResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/account")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Exposes customer account-security actions that remain available after the dashboard split. */
public class AccountSecurityController {

    private static final List<String> RECOVERY_WORDS = List.of(
            "cipher", "vault", "cloud", "secure", "token", "backup",
            "stream", "shield", "private", "restore", "silent", "access"
    );

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();

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
    @PostMapping("/recovery-phrase/generate")
    @Transactional
    public ResponseEntity<Map<String, String>> generateRecoveryPhrase() {
        UserAccount user = currentUserService.requireUser();
        requirePremium(user);
        String phrase = generatePhrase();
        user.setRecoveryPhraseHash(passwordEncoder.encode(phrase));
        userAccountRepository.save(user);
        return ResponseEntity.ok(Map.of("recoveryPhrase", phrase));
    }

    @PostMapping("/recovery-phrase/login")
    public ResponseEntity<LoginResponse> loginWithRecoveryPhrase(@RequestBody Map<String, Object> request) {
        String usernameOrEmail = asString(request.get("usernameOrEmail"), "");
        String phrase = asString(request.get("recoveryPhrase"), "");
        UserAccount user = userAccountRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                .filter(account -> account.getRecoveryPhraseHash() != null)
                .filter(account -> passwordEncoder.matches(phrase, account.getRecoveryPhraseHash()))
                .filter(account -> !account.isSuspended())
                .orElseThrow(() -> new IllegalArgumentException("Invalid recovery phrase."));
        requirePremium(user);
        return ResponseEntity.ok(new LoginResponse(user, jwtService.createToken(user)));
    }

    private void requirePremium(UserAccount user) {
        if (!user.isSubscribed()) {
            throw new IllegalArgumentException("Premium subscription required.");
        }
    }

    private String generatePhrase() {
        StringBuilder phrase = new StringBuilder();
        for (int index = 0; index < 6; index++) {
            if (index > 0) {
                phrase.append('-');
            }
            phrase.append(RECOVERY_WORDS.get(secureRandom.nextInt(RECOVERY_WORDS.size())));
        }
        return phrase.toString();
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }
}
