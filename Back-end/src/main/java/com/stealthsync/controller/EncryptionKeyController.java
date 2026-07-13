package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/encryption-keys")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Provides authenticated owner-scoped CRUD without exposing passwords or derived key material. */
public class EncryptionKeyController {

    private final CurrentUserService currentUserService;
    private final EncryptionKeyService encryptionKeyService;

    @GetMapping
    public ResponseEntity<List<EncryptionKeyRecord>> listKeys() {
        return ResponseEntity.ok(encryptionKeyService.listKeys(currentUserService.requireUserID()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EncryptionKeyRecord> getKey(@PathVariable Long id) {
        return encryptionKeyService.findKey(currentUserService.requireUserID(), id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
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
    public ResponseEntity<EncryptionKeyRecord> updateKey(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Long ownerID = currentUserService.requireUserID();
        if (request.containsKey("algorithm")) {
            throw new IllegalArgumentException("Encryption key algorithm cannot be changed after creation.");
        }

        Optional<EncryptionKeyRecord> updated = encryptionKeyService.findKey(ownerID, id);
        if (request.containsKey("keyName")) {
            updated = encryptionKeyService.renameKey(ownerID, id, asString(request.get("keyName"), null));
        }
        if (request.containsKey("status")) {
            updated = encryptionKeyService.updateStatus(ownerID, id, asString(request.get("status"), null));
        }
        return updated.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKey(@PathVariable Long id) {
        return encryptionKeyService.deleteKey(currentUserService.requireUserID(), id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }
}
