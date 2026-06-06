package com.stealthsync.controller;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.service.MockDataStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cloud-storage")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class CloudStorageController {

    private final MockDataStore dataStore;

    @GetMapping("/links")
    public ResponseEntity<List<CloudStorageLink>> getLinks() {
        return ResponseEntity.ok(dataStore.listCloudStorageLinks());
    }

    @PatchMapping("/links/{id}/set-active")
    public ResponseEntity<CloudStorageLink> setActive(@PathVariable Long id) {
        return dataStore.setActiveCloudStorageLink(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
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
    public ResponseEntity<Map<String, Object>> startOAuth(@PathVariable String provider) {
        CloudStorageLink link = dataStore.linkCloudProvider(provider);
        return ResponseEntity.ok(Map.<String, Object>of(
                "authUrl", "https://example.com/oauth/" + provider,
                "link", link
        ));
    }
}
