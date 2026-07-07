package com.stealthsync.controller;

import com.stealthsync.model.dto.TrustedKeyPackage;
import com.stealthsync.model.dto.TrustedKeyPackageExportRequest;
import com.stealthsync.model.dto.TrustedKeyPackageImportRequest;
import com.stealthsync.model.dto.TrustedKeyPackageImportResponse;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trusted-devices")
@RequiredArgsConstructor
/** Provides manual trusted-device onboarding through non-secret encryption-key metadata packages. */
public class TrustedDeviceController {

    private final CurrentUserService currentUserService;
    private final EncryptionKeyService encryptionKeyService;

    @PostMapping("/export-key-package")
    public ResponseEntity<TrustedKeyPackage> exportKeyPackage(@RequestBody TrustedKeyPackageExportRequest request) {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(encryptionKeyService.exportTrustedKeyPackage(ownerID, request.keyID()));
    }

    @PostMapping("/import-key-package")
    public ResponseEntity<TrustedKeyPackageImportResponse> importKeyPackage(@RequestBody TrustedKeyPackageImportRequest request) {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(encryptionKeyService.importTrustedKeyPackage(ownerID, request.keyPackage()));
    }
}
