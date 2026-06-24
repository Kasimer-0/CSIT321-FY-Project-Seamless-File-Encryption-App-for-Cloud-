package com.stealthsync.controller;

import com.stealthsync.model.dto.*;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/")
// Matches frontend credentials: "include"
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
/** Supplies administrator dashboard statistics and user-account management endpoints. */
public class AdminController {

    private final AppDataService dataStore;
    private final EncryptionPolicyService encryptionPolicyService;

    // ==========================================
    // 1. Dashboard Statistics Dashboard Interface
    // Integrating with AdminDashboardPage.tsx
    // ==========================================
    @GetMapping("/admin/dashboard-stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        log.info("Fetching Admin Dashboard Stats...");
        return ResponseEntity.ok(dataStore.dashboardStats());
    }

    // ==========================================
    // 2. User Management Interface
    // Integrates with AdminManageAccountPage.tsx
    // ==========================================
    @GetMapping("/users")
    public ResponseEntity<List<UserAccountDTO>> getUsers(@RequestParam(required = false) String search) {
        log.info("Fetching Users with search param: {}", search);
        return ResponseEntity.ok(dataStore.listUsers(search));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserAccountDTO> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        return dataStore.updateUserProfile(id, request.get("username"), request.get("email"))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<UserAccountDTO> updateUserSuspension(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        boolean isSuspended = request.getOrDefault("isSuspended", false);
        return dataStore.setUserSuspended(id, isSuspended)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/suspend")
    public ResponseEntity<UserAccountDTO> suspendUser(@PathVariable Long id) {
        return dataStore.setUserSuspended(id, true)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/enc-methods")
    public ResponseEntity<List<String>> getEncMethods() {
        // Drop-down options when creating a plan in the front end
        return ResponseEntity.ok(encryptionPolicyService.supportedPlanMethods());
    }
}
