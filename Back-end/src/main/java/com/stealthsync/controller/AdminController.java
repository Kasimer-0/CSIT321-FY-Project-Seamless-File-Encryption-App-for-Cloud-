package com.stealthsync.controller;

import com.stealthsync.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/") 
// Matches frontend credentials: "include"
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final List<UserAccountDTO> mockUsers = createMockUsers();

    // ==========================================
    // 1. Dashboard Statistics Dashboard Interface
    // Integrating with AdminDashboardPage.tsx
    // ==========================================
    @GetMapping("/admin/dashboard-stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        log.info("Fetching Admin Dashboard Stats...");
        // Data returned by the simulated database
        DashboardStatsResponse stats = DashboardStatsResponse.builder()
                .totalUsers(150)
                .premiumUsers(45)
                .inactiveUsers(12)
                .openTickets(5)
                .build();
        return ResponseEntity.ok(stats);
    }

    // ==========================================
    // 2. User Management Interface
    // Integrates with AdminManageAccountPage.tsx
    // ==========================================
    @GetMapping("/users")
    public ResponseEntity<List<UserAccountDTO>> getUsers(@RequestParam(required = false) String search) {
        log.info("Fetching Users with search param: {}", search);
        List<UserAccountDTO> users = mockUsers;
        if (search != null && !search.isBlank()) {
            String keyword = search.toLowerCase();
            users = mockUsers.stream()
                    .filter(user -> user.getUsername().toLowerCase().contains(keyword)
                            || user.getEmail().toLowerCase().contains(keyword))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<?> updateUserSuspension(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        boolean isSuspended = request.getOrDefault("isSuspended", false);
        return mockUsers.stream()
                .filter(user -> user.getId().equals(id))
                .findFirst()
                .map(user -> {
                    user.setSuspended(isSuspended);
                    return ResponseEntity.ok(user);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/enc-methods")
    public ResponseEntity<List<String>> getEncMethods() {
        // Drop-down options when creating a plan in the front end
        return ResponseEntity.ok(List.of("AES-128", "AES-256-GCM", "ChaCha20"));
    }

    private static List<UserAccountDTO> createMockUsers() {
        List<UserAccountDTO> users = new ArrayList<>();

        UserAccountDTO admin = new UserAccountDTO();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setEmail("admin@stealthsync.com");
        admin.setRole("admin");
        admin.setPremium(true);
        admin.setSuspended(false);
        users.add(admin);

        UserAccountDTO customer = new UserAccountDTO();
        customer.setId(2L);
        customer.setUsername("PremiumUser");
        customer.setEmail("user@stealthsync.com");
        customer.setRole("customer");
        customer.setPremium(true);
        customer.setSuspended(false);
        users.add(customer);

        return users;
    }
}
