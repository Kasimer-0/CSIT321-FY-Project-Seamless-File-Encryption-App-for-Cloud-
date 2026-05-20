package com.stealthsync.controller;

import com.stealthsync.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/") 
// Matches frontend credentials: "include"
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

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
        List<UserAccountDTO> users = new ArrayList<>();
        // Mock a test user for frontend rendering.
        UserAccountDTO testUser = new UserAccountDTO();
        testUser.setId("U-1001");
        testUser.setUsername("test_user_1");
        testUser.setEmail("test1@stealthsync.com");
        testUser.setRole("customer");
        testUser.setPremium(true);
        testUser.setSuspended(false);
        users.add(testUser);
        
        return ResponseEntity.ok(users);
    }

    // ==========================================
    // 3. Subscription Plan Management Interface
    // Integrates with AdminManagePlanPage.tsx & AdminCreatePlanPage.tsx
    // ==========================================
    @GetMapping("/plans")
    public ResponseEntity<List<PlanDTO>> getPlans() {
        log.info("Fetching all subscription plans");
        List<PlanDTO> plans = new ArrayList<>();
        
        PlanDTO freePlan = new PlanDTO();
        freePlan.setPlanID("P-FREE");
        freePlan.setPlanTitle("Basic Free");
        freePlan.setPlanPrice(0.0);
        freePlan.setEncMethod("AES-128"); // Free encryption scheme corresponding to PRD
        freePlan.setPlanStatus("active");
        plans.add(freePlan);
        
        return ResponseEntity.ok(plans);
    }

    @GetMapping("/enc-methods")
    public ResponseEntity<List<String>> getEncMethods() {
        // Drop-down options when creating a plan in the front end
        return ResponseEntity.ok(List.of("AES-128", "AES-256-GCM", "ChaCha20"));
    }

    // ==========================================
    // 4. Ticket Management Interface
    // Integrates with AdminManageTicketPage.tsx
    // ==========================================
    @GetMapping("/tickets")
    public ResponseEntity<List<TicketDTO>> getTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personInCharge,
            @RequestParam(required = false) String requester) {
        
        log.info("Fetching tickets with filters -> status: {}", status);
        List<TicketDTO> tickets = new ArrayList<>();
        // TODO: After connecting to the database, pass @RequestParam to the JPA Specification for dynamic querying.
        return ResponseEntity.ok(tickets);
    }
}