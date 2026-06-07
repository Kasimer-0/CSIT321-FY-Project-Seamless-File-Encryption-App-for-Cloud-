package com.stealthsync.controller;

import com.stealthsync.model.entity.Plan;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/plans") // The fetch path for retrieving all plans from the front end
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class PlanController {

    private final AppDataService dataStore;

    @GetMapping
    public ResponseEntity<List<Plan>> getAllPlans() {
        log.info("StealthSync Plan Domain: Fetching all plans for view");
        return ResponseEntity.ok(dataStore.listPlans());
    }

    @PostMapping
    public ResponseEntity<Plan> createPlan(@RequestBody Plan newPlan) {
        log.info("StealthSync Plan Domain: Admin creating a new plan -> {}", newPlan.getPlanTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(dataStore.createPlan(newPlan));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(@PathVariable Long id, @RequestBody Plan updatedPlan) {
        return dataStore.updatePlan(id, updatedPlan)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Plan> updatePlanStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String newStatus = request.getOrDefault("planStatus", "active");
        return dataStore.updatePlanStatus(id, newStatus)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<Plan> suspendPlan(@PathVariable Long id) {
        return dataStore.updatePlanStatus(id, "inactive")
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
