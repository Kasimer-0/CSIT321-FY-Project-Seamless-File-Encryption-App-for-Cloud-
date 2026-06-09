package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.repository.EncryptionKeyRepository;
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
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/encryption-keys")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
public class EncryptionKeyController {

    private final EncryptionKeyRepository encryptionKeyRepository;

    @GetMapping
    public ResponseEntity<List<EncryptionKeyRecord>> listKeys(
            @RequestParam Long ownerID,
            @RequestParam(required = false) String search) {
        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<EncryptionKeyRecord> keys = encryptionKeyRepository.findByOwnerIDOrderByCreatedAtDesc(ownerID).stream()
                .filter(key -> keyword.isBlank()
                        || key.getKeyName().toLowerCase(Locale.ROOT).contains(keyword)
                        || key.getAlgorithm().toLowerCase(Locale.ROOT).contains(keyword)
                        || key.getFingerprint().toLowerCase(Locale.ROOT).contains(keyword))
                .toList();
        return ResponseEntity.ok(keys);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EncryptionKeyRecord> getKey(@PathVariable Long id, @RequestParam Long ownerID) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(id, ownerID)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<EncryptionKeyRecord> createKey(@RequestBody Map<String, Object> request) {
        Long ownerID = asLong(request.get("ownerID"));
        String keyName = asString(request.get("keyName"), "New Encryption Key");
        String algorithm = asString(request.get("algorithm"), "AES-256-GCM");
        Instant now = Instant.now();
        EncryptionKeyRecord key = new EncryptionKeyRecord(
                null,
                ownerID,
                keyName,
                algorithm,
                "active",
                UUID.randomUUID().toString().substring(0, 13),
                now,
                now
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(encryptionKeyRepository.save(key));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<EncryptionKeyRecord> updateKey(
            @PathVariable Long id,
            @RequestParam Long ownerID,
            @RequestBody Map<String, Object> request) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(id, ownerID)
                .map(key -> {
                    if (request.containsKey("keyName")) {
                        key.setKeyName(asString(request.get("keyName"), key.getKeyName()));
                    }
                    if (request.containsKey("algorithm")) {
                        key.setAlgorithm(asString(request.get("algorithm"), key.getAlgorithm()));
                    }
                    if (request.containsKey("status")) {
                        key.setStatus(asString(request.get("status"), key.getStatus()));
                    }
                    key.setUpdatedAt(Instant.now());
                    return ResponseEntity.ok(encryptionKeyRepository.save(key));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteKey(@PathVariable Long id, @RequestParam Long ownerID) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(id, ownerID)
                .map(key -> {
                    encryptionKeyRepository.delete(key);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
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
