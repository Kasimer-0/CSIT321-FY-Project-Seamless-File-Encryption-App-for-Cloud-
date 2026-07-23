package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.security.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequiredArgsConstructor
/** Provides authenticated owner-scoped CRUD without exposing passwords or derived key material. */
public class EncryptionKeyController {

    private final CurrentUserService currentUserService;
    private final EncryptionKeyService encryptionKeyService;
    private final SecurityAuditService securityAuditService;

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
        if (request.containsKey("keyPassword")) {
            throw new IllegalArgumentException("Key passwords must remain in the browser and cannot be sent to the server.");
        }
        EncryptionKeyRecord key = encryptionKeyService.createClientDerivedKey(
                ownerID,
                asString(request.get("keyName"), "New Encryption Key"),
                asString(request.get("algorithm"), "AES-128"),
                asString(request.get("salt"), null),
                asString(request.get("fingerprint"), null),
                asString(request.get("passwordVerifier"), null),
                asString(request.get("keyScheme"), null),
                asInteger(request.get("kdfIterations")),
                asInteger(request.get("kdfVersion"))
        );
        securityAuditService.recordForUser(ownerID, "KEY_CREATED", null);
        return ResponseEntity.status(HttpStatus.CREATED).body(key);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<EncryptionKeyRecord> updateKey(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Long ownerID = currentUserService.requireUserID();
        Optional<EncryptionKeyRecord> updated = encryptionKeyService.findKey(ownerID, id);
        if (updated.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (request.containsKey("algorithm")) {
            throw new IllegalArgumentException("Encryption key algorithm cannot be changed after creation.");
        }

        // Validate the lifecycle request before applying a rename, so one PATCH
        // cannot partially rename a key and then fail on an unsupported status.
        if (request.containsKey("status")) {
            updated = encryptionKeyService.updateStatus(ownerID, id, asString(request.get("status"), null));
        }
        if (request.containsKey("keyName")) {
            updated = encryptionKeyService.renameKey(ownerID, id, asString(request.get("keyName"), null));
        }
        return updated.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKey(@PathVariable Long id) {
        Long ownerID = currentUserService.requireUserID();
        if (!encryptionKeyService.deleteKey(ownerID, id)) {
            return ResponseEntity.notFound().build();
        }
        securityAuditService.recordForUser(ownerID, "KEY_RETIRED", null);
        return ResponseEntity.noContent().build();
    }

    private String asString(Object value, String fallback) {
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }

    private Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        throw new IllegalArgumentException("Key-derivation version and iteration count are required.");
    }
}
