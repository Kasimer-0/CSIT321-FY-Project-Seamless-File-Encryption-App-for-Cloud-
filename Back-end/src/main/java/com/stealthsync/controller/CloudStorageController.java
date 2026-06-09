package com.stealthsync.controller;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cloud-storage")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class CloudStorageController {

    private final AppDataService dataStore;

    @GetMapping("/links")
    public ResponseEntity<List<CloudStorageLink>> getLinks(@RequestParam(required = false) Long ownerID) {
        return ResponseEntity.ok(dataStore.listCloudStorageLinks(ownerID));
    }

    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> getProviders(@RequestParam(required = false) Long ownerID) {
        return ResponseEntity.ok(Map.of(
                "providers", dataStore.supportedCloudProviders(),
                "providerLimit", dataStore.cloudProviderLimitFor(ownerID)
        ));
    }

    @PatchMapping("/links/{id}/set-active")
    public ResponseEntity<CloudStorageLink> setActive(@PathVariable Long id) {
        return dataStore.setActiveCloudStorageLink(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/links/{id}/deactivate")
    public ResponseEntity<CloudStorageLink> deactivate(@PathVariable Long id) {
        return dataStore.deactivateCloudStorageLink(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> getUsage() {
        return ResponseEntity.ok(dataStore.cloudStorageUsage());
    }

    @DeleteMapping("/links/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        return dataStore.removeCloudStorageLink(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PatchMapping("/links/{id}/reconnect")
    public ResponseEntity<CloudStorageLink> reconnect(@PathVariable Long id) {
        return dataStore.reconnectCloudStorageLink(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/auth/{provider}")
    public ResponseEntity<Map<String, Object>> startOAuth(
            @PathVariable String provider,
            @RequestParam(required = false) Long ownerID) {
        CloudStorageLink link = ownerID == null
                ? dataStore.linkCloudProvider(provider)
                : dataStore.linkCloudProvider(provider, ownerID);
        return ResponseEntity.ok(Map.<String, Object>of(
                "authUrl", "https://example.com/oauth/" + provider,
                "link", link
        ));
    }
}
