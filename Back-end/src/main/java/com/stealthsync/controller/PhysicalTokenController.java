package com.stealthsync.controller;

import com.stealthsync.model.entity.PhysicalTokenRecord;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.PhysicalTokenRepository;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/physical-tokens")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Manages premium-customer physical-token registrations and activation state. */
public class PhysicalTokenController {

    private final PhysicalTokenRepository physicalTokenRepository;
    private final UserAccountRepository userAccountRepository;

    @GetMapping
    public ResponseEntity<List<PhysicalTokenRecord>> listTokens(@RequestParam Long ownerID) {
        requirePremium(ownerID);
        return ResponseEntity.ok(physicalTokenRepository.findByOwnerIDOrderByRegisteredAtDesc(ownerID));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PhysicalTokenRecord> getToken(@PathVariable Long id, @RequestParam Long ownerID) {
        requirePremium(ownerID);
        return physicalTokenRepository.findByTokenIDAndOwnerID(id, ownerID)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<PhysicalTokenRecord> registerToken(@RequestBody Map<String, Object> request) {
        Long ownerID = asLong(request.get("ownerID"));
        requirePremium(ownerID);
        String tokenName = asString(request.get("tokenName"), "Security Token");
        String serialNumber = asString(request.get("serialNumber"), "TOKEN-" + Instant.now().toEpochMilli());
        PhysicalTokenRecord token = new PhysicalTokenRecord(
                null,
                ownerID,
                tokenName,
                serialNumber,
                "inactive",
                Instant.now(),
                null
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(physicalTokenRepository.save(token));
    }

    @PatchMapping("/{id}/activate")
    @Transactional
    public ResponseEntity<PhysicalTokenRecord> activateToken(@PathVariable Long id, @RequestParam Long ownerID) {
        requirePremium(ownerID);
        return setTokenStatus(id, ownerID, "active");
    }

    @PatchMapping("/{id}/deactivate")
    @Transactional
    public ResponseEntity<PhysicalTokenRecord> deactivateToken(@PathVariable Long id, @RequestParam Long ownerID) {
        requirePremium(ownerID);
        return setTokenStatus(id, ownerID, "inactive");
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> removeToken(@PathVariable Long id, @RequestParam Long ownerID) {
        requirePremium(ownerID);
        return physicalTokenRepository.findByTokenIDAndOwnerID(id, ownerID)
                .map(token -> {
                    physicalTokenRepository.delete(token);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private ResponseEntity<PhysicalTokenRecord> setTokenStatus(Long id, Long ownerID, String status) {
        return physicalTokenRepository.findByTokenIDAndOwnerID(id, ownerID)
                .map(token -> {
                    token.setStatus(status);
                    token.setLastUsedAt("active".equals(status) ? Instant.now() : token.getLastUsedAt());
                    return ResponseEntity.ok(physicalTokenRepository.save(token));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void requirePremium(Long ownerID) {
        UserAccount owner = userAccountRepository.findById(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Owner account does not exist."));
        if (!owner.isSubscribed()) {
            throw new IllegalArgumentException("Premium subscription required.");
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text);
        }
        throw new IllegalArgumentException("ownerID is required.");
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }
}
