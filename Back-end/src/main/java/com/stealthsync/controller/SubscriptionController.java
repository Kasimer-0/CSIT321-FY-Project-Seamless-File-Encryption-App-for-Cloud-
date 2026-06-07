package com.stealthsync.controller;

import com.stealthsync.model.entity.Subscription;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final AppDataService dataStore;

    @GetMapping
    public ResponseEntity<List<Subscription>> getSubscriptions(@RequestParam(required = false) String search) {
        log.info("Fetching subscriptions with search: {}", search);
        return ResponseEntity.ok(dataStore.listSubscriptions(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subscription> getSubscription(@PathVariable Long id) {
        return dataStore.findSubscription(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Subscription> cancelSubscription(@PathVariable Long id) {
        return dataStore.cancelSubscription(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subscription> updateSubscription(
            @PathVariable Long id,
            @RequestBody Subscription updated) {
        return dataStore.updateSubscription(id, updated)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
