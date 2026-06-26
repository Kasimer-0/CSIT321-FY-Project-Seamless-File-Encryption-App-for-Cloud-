package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.repository.EncryptionKeyRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
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
@RequestMapping("/encryption-keys")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Provides authenticated owner-scoped CRUD without exposing passwords or derived key material. */
public class EncryptionKeyController {

    private final EncryptionKeyRepository encryptionKeyRepository;
    private final CurrentUserService currentUserService;
    private final EncryptionPolicyService encryptionPolicyService;
    private final EncryptionKeyService encryptionKeyService;

    @GetMapping
    public ResponseEntity<List<EncryptionKeyRecord>> listKeys(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(encryptionKeyService.listKeys(currentUserService.requireUserID(), search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EncryptionKeyRecord> getKey(@PathVariable Long id) {
        return encryptionKeyService.findKey(currentUserService.requireUserID(), id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<EncryptionKeyRecord> createKey(@RequestBody Map<String, Object> request) {
        Long ownerID = currentUserService.requireUserID();
        EncryptionKeyRecord key = encryptionKeyService.createKey(
                ownerID,
                asString(request.get("keyName"), "New Encryption Key"),
                asString(request.get("algorithm"), "AES-128"),
                asString(request.get("keyPassword"), null)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(key);
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<EncryptionKeyRecord> updateKey(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Long ownerID = currentUserService.requireUserID();
        return encryptionKeyRepository.findByKeyIDAndOwnerID(id, ownerID)
                .map(key -> {
                    if (request.containsKey("keyName")) {
                        key.setKeyName(asString(request.get("keyName"), key.getKeyName()));
                    }
                    if (request.containsKey("algorithm")) {
                        key.setAlgorithm(encryptionPolicyService.policyForAlgorithm(asString(request.get("algorithm"), key.getAlgorithm())).algorithm());
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
    public ResponseEntity<Void> deleteKey(@PathVariable Long id) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(id, currentUserService.requireUserID())
                .map(key -> {
                    encryptionKeyRepository.delete(key);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }
}