package com.stealthsync.controller;

import com.stealthsync.model.entity.Plan;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/plans") // The fetch path for retrieving all plans from the front end
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Slf4j
public class PlanController {

    private final List<Plan> mockPlans = new ArrayList<>();

    public PlanController() {
        // Pre-store simulation data, perfectly aligned with the structure of Entity.ts
        mockPlans.add(new Plan(1L, "Basic Free Tier", 0.0, "AES-128 Client-side Silent Encryption", "active", "AES-128"));
        mockPlans.add(new Plan(2L, "Premium Corporate Tier", 15.0, "AES-256 GCM Stream Encryption with Hardware Token Support", "active", "AES-256-GCM"));
    }

    @GetMapping
    public ResponseEntity<List<Plan>> getAllPlans() {
        log.info("StealthSync Plan Domain: Fetching all plans for view");
        return ResponseEntity.ok(mockPlans);
    }

    @PostMapping
    public ResponseEntity<Plan> createPlan(@RequestBody Plan newPlan) {
        log.info("StealthSync Plan Domain: Admin creating a new plan -> {}", newPlan.getPlanTitle());
        // Generate and save the simulation ID.
        newPlan.setPlanID((long) (mockPlans.size() + 1));
        if (newPlan.getPlanStatus() == null || newPlan.getPlanStatus().isBlank()) {
            newPlan.setPlanStatus("active");
        }
        mockPlans.add(newPlan);
        return ResponseEntity.status(HttpStatus.CREATED).body(newPlan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(@PathVariable Long id, @RequestBody Plan updatedPlan) {
        for (int i = 0; i < mockPlans.size(); i++) {
            Plan existing = mockPlans.get(i);
            if (existing.getPlanID().equals(id)) {
                updatedPlan.setPlanID(id);
                mockPlans.set(i, updatedPlan);
                return ResponseEntity.ok(updatedPlan);
            }
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<Plan> updatePlanStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String newStatus = request.getOrDefault("planStatus", "active");
        return mockPlans.stream()
                .filter(plan -> plan.getPlanID().equals(id))
                .findFirst()
                .map(plan -> {
                    plan.setPlanStatus(newStatus);
                    return ResponseEntity.ok(plan);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
