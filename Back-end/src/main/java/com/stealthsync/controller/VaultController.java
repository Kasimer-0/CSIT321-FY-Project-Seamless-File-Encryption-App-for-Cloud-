package com.stealthsync.controller;

import com.stealthsync.model.dto.VaultPasswordRequest;
import com.stealthsync.model.dto.VaultStatusResponse;
import com.stealthsync.service.crypto.VaultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/vault")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
public class VaultController {

    private final VaultService vaultService;

    @GetMapping("/status")
    public ResponseEntity<VaultStatusResponse> status() {
        return ResponseEntity.ok(vaultService.status());
    }

    @PostMapping("/create")
    public ResponseEntity<VaultStatusResponse> create(@RequestBody VaultPasswordRequest request) throws Exception {
        return ResponseEntity.ok(vaultService.createVault(request.getMasterPassword()));
    }

    @PostMapping("/unlock")
    public ResponseEntity<VaultStatusResponse> unlock(@RequestBody VaultPasswordRequest request) throws Exception {
        return ResponseEntity.ok(vaultService.unlockVault(request.getMasterPassword()));
    }

    @PostMapping("/lock")
    public ResponseEntity<VaultStatusResponse> lock() {
        return ResponseEntity.ok(vaultService.lockVault());
    }
}
