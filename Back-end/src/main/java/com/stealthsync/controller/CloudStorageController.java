package com.stealthsync.controller;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.dto.GoogleDriveFileDTO;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.GoogleDriveService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.config.DesktopWindowLauncher;
import com.stealthsync.config.SystemBrowserLauncher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cloud-storage")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
/**
 * Coordinates cloud-link management and Google Drive OAuth/file operations.
 * Google Drive is real integration; Dropbox and OneDrive links remain prototype records.
 */
public class CloudStorageController {

    private static final String DEFAULT_PASSPHRASE = "stealthsync-demo-passphrase";

    private final AppDataService dataStore;
    private final GoogleDriveService googleDriveService;
    private final AesGcmService aesGcmService;

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
        dataStore.findCloudStorageLink(id)
                .filter(link -> "google_drive".equalsIgnoreCase(link.getProvider()))
                .ifPresent(link -> googleDriveService.disconnect(link.getOwnerID()));
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
        if ("google_drive".equalsIgnoreCase(provider)) {
            String authUrl = googleDriveService.createAuthorizationUrl(ownerID);
            boolean opened = SystemBrowserLauncher.open(URI.create(authUrl));
            return ResponseEntity.ok(Map.<String, Object>of(
                    "authUrl", authUrl,
                    "openedExternal", opened,
                    "configured", true
            ));
        }
        CloudStorageLink link = ownerID == null
                ? dataStore.linkCloudProvider(provider)
                : dataStore.linkCloudProvider(provider, ownerID);
        return ResponseEntity.ok(Map.<String, Object>of(
                "authUrl", "https://example.com/oauth/" + provider,
                "link", link
        ));
    }

    @GetMapping("/oauth/google/callback")
    public ResponseEntity<String> completeGoogleOAuth(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) throws Exception {
        if (error != null) {
            return htmlResponse("Google Drive connection cancelled", "Google returned: " + error);
        }
        CloudStorageLink link = googleDriveService.completeAuthorization(code, state);
        DesktopWindowLauncher.focusPrimaryWindow();
        return htmlResponse(
                "Google Drive connected",
                "Connected " + link.getAccountEmail() + ". You can close this browser tab and return to StealthSync."
        );
    }

    @GetMapping("/google-drive/status")
    public ResponseEntity<Map<String, Object>> googleDriveStatus(@RequestParam Long ownerID) {
        return ResponseEntity.ok(Map.of(
                "configured", googleDriveService.isConfigured(),
                "connected", googleDriveService.isConnected(ownerID)
        ));
    }

    @GetMapping("/google-drive/files")
    public ResponseEntity<List<GoogleDriveFileDTO>> googleDriveFiles(@RequestParam Long ownerID) throws Exception {
        return ResponseEntity.ok(googleDriveService.listEncryptedFiles(ownerID));
    }

    @PostMapping(value = "/google-drive/files/encrypt-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GoogleDriveFileDTO> encryptAndUploadToGoogleDrive(
            @RequestParam Long ownerID,
            @RequestParam("file") MultipartFile file) throws Exception {
        String originalName = safeFilename(file.getOriginalFilename(), "uploaded-file");
        // Encrypt locally before the stream is handed to the Google Drive client.
        try (InputStream encrypted = aesGcmService.encryptStream(file.getInputStream(), DEFAULT_PASSPHRASE)) {
            return ResponseEntity.ok(googleDriveService.uploadEncrypted(ownerID, originalName, encrypted));
        }
    }

    @GetMapping("/google-drive/files/{fileId}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptGoogleDriveFile(
            @PathVariable String fileId,
            @RequestParam Long ownerID) throws Exception {
        // Download encrypted bytes first, then return only locally decrypted content to the customer.
        GoogleDriveService.DownloadedDriveFile driveFile = googleDriveService.downloadEncrypted(ownerID, fileId);
        InputStream decrypted = aesGcmService.decryptStream(
                new ByteArrayInputStream(driveFile.encryptedContent()),
                DEFAULT_PASSPHRASE
        );
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(driveFile.originalName(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(decrypted));
    }

    private ResponseEntity<String> htmlResponse(String title, String message) {
        String html = """
                <!doctype html>
                <html lang="en">
                <head><meta charset="utf-8"><title>%s</title></head>
                <body style="font-family:system-ui;padding:48px;max-width:680px;margin:auto">
                  <h1>%s</h1><p>%s</p>
                </body>
                </html>
                """.formatted(escapeHtml(title), escapeHtml(title), escapeHtml(message));
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    private String safeFilename(String filename, String fallback) {
        if (filename == null || filename.isBlank()) {
            return fallback;
        }
        return filename.replace("\\", "_").replace("/", "_");
    }

    private String escapeHtml(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
