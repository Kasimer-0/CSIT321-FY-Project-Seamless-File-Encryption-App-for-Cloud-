package com.stealthsync.controller;

import com.stealthsync.model.entity.Plan;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

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
        mockPlans.add(newPlan);
        return ResponseEntity.status(HttpStatus.CREATED).body(newPlan);
    }
}