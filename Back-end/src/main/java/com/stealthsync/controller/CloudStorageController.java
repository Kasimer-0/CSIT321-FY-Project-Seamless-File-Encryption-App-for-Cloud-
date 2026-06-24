package com.stealthsync.controller;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.dto.GoogleDriveFileDTO;
import com.stealthsync.service.AppDataService;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.cloud.GoogleDriveService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.UserVaultService;
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
import java.nio.file.Files;
import java.nio.file.Path;
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

    private final AppDataService dataStore;
    private final GoogleDriveService googleDriveService;
    private final AesGcmService aesGcmService;
    private final CurrentUserService currentUserService;
    private final UserVaultService userVaultService;
    private final EncryptionPolicyService encryptionPolicyService;

    @GetMapping("/links")
    public ResponseEntity<List<CloudStorageLink>> getLinks() {
        return ResponseEntity.ok(dataStore.listCloudStorageLinks(currentUserService.requireUserID()));
    }

    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> getProviders() {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(Map.of(
                "providers", dataStore.supportedCloudProviders(),
                "providerLimit", dataStore.cloudProviderLimitFor(ownerID)
        ));
    }

    @PatchMapping("/links/{id}/set-active")
    public ResponseEntity<CloudStorageLink> setActive(@PathVariable Long id) {
        return dataStore.setActiveCloudStorageLink(id, currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/links/{id}/deactivate")
    public ResponseEntity<CloudStorageLink> deactivate(@PathVariable Long id) {
        return dataStore.deactivateCloudStorageLink(id, currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> getUsage() {
        return ResponseEntity.ok(dataStore.cloudStorageUsage(currentUserService.requireUserID()));
    }

    @DeleteMapping("/links/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        Long ownerID = currentUserService.requireUserID();
        dataStore.findCloudStorageLink(id, ownerID)
                .filter(link -> "google_drive".equalsIgnoreCase(link.getProvider()))
                .ifPresent(link -> googleDriveService.disconnect(ownerID));
        return dataStore.removeCloudStorageLink(id, ownerID)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PatchMapping("/links/{id}/reconnect")
    public ResponseEntity<CloudStorageLink> reconnect(@PathVariable Long id) {
        return dataStore.reconnectCloudStorageLink(id, currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/auth/{provider}")
    public ResponseEntity<Map<String, Object>> startOAuth(@PathVariable String provider) {
        Long ownerID = currentUserService.requireUserID();
        if ("google_drive".equalsIgnoreCase(provider)) {
            String authUrl = googleDriveService.createAuthorizationUrl(ownerID);
            boolean opened = SystemBrowserLauncher.open(URI.create(authUrl));
            return ResponseEntity.ok(Map.<String, Object>of(
                    "authUrl", authUrl,
                    "openedExternal", opened,
                    "configured", true
            ));
        }
        CloudStorageLink link = dataStore.linkCloudProvider(provider, ownerID);
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
    public ResponseEntity<Map<String, Object>> googleDriveStatus() {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(Map.of(
                "configured", googleDriveService.isConfigured(),
                "connected", googleDriveService.isConnected(ownerID)
        ));
    }

    @GetMapping("/google-drive/files")
    public ResponseEntity<List<GoogleDriveFileDTO>> googleDriveFiles() throws Exception {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(googleDriveService.listEncryptedFiles(ownerID));
    }

    @PostMapping(value = "/google-drive/files/encrypt-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GoogleDriveFileDTO> encryptAndUploadToGoogleDrive(
            @RequestParam("file") MultipartFile file) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        String originalName = safeFilename(file.getOriginalFilename(), "uploaded-file");
        EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForUser(ownerID);
        String vaultPassphrase = userVaultService.filePassphraseFor(ownerID);
        // Encrypt locally with the current user's vault key before the stream is handed to Google Drive.
        try (InputStream encrypted = aesGcmService.encryptStream(
                file.getInputStream(),
                vaultPassphrase,
                policy.keyLengthBits())) {
            return ResponseEntity.ok(googleDriveService.uploadEncrypted(ownerID, originalName, policy.algorithm(), encrypted));
        }
    }

    @GetMapping("/google-drive/files/{fileId}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptGoogleDriveFile(
            @PathVariable String fileId) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        // Download encrypted bytes first, then return only locally decrypted content to the customer.
        GoogleDriveService.DownloadedDriveFile driveFile = googleDriveService.downloadEncrypted(ownerID, fileId);
        EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForAlgorithm(driveFile.encMethod());
        InputStream decrypted = aesGcmService.decryptStream(
                new ByteArrayInputStream(driveFile.encryptedContent()),
                userVaultService.filePassphraseFor(ownerID),
                policy.keyLengthBits()
        );
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(driveFile.originalName(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(decrypted));
    }

    /** Deletes the selected encrypted object from the owner's linked Drive account. */
    @DeleteMapping("/google-drive/files/{fileId}")
    public ResponseEntity<Void> deleteGoogleDriveFile(
            @PathVariable String fileId) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        googleDriveService.deleteEncryptedFile(ownerID, fileId);
        return ResponseEntity.noContent().build();
    }

    /**
     * JavaFX WebView cannot persist Blob downloads. The desktop UI uses this
     * endpoint to decrypt the Drive object locally, save it to Downloads, and
     * show the exact destination path to the user.
     */
    @PostMapping("/google-drive/files/{fileId}/decrypt-save")
    public ResponseEntity<Map<String, Object>> decryptAndSaveGoogleDriveFile(
            @PathVariable String fileId) {
        Long ownerID = currentUserService.requireUserID();
        try {
            GoogleDriveService.DownloadedDriveFile driveFile = googleDriveService.downloadEncrypted(ownerID, fileId);
            byte[] plaintext;
            EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForAlgorithm(driveFile.encMethod());
            try (InputStream decrypted = aesGcmService.decryptStream(
                    new ByteArrayInputStream(driveFile.encryptedContent()),
                    userVaultService.filePassphraseFor(ownerID),
                    policy.keyLengthBits())) {
                plaintext = decrypted.readAllBytes();
            }

            Path downloads = Path.of(System.getProperty("user.home"), "Downloads");
            Files.createDirectories(downloads);
            Path destination = availableDestination(
                    downloads,
                    safeFilename(driveFile.originalName(), "decrypted-drive-file")
            );
            Files.write(destination, plaintext);

            return ResponseEntity.ok(Map.of(
                    "fileName", destination.getFileName().toString(),
                    "savedPath", destination.toAbsolutePath().toString(),
                    "size", plaintext.length
            ));
        } catch (Exception e) {
            log.error("Google Drive decrypt-save failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unable to decrypt and save the Google Drive file."
            ));
        }
    }

    /**
     * Resolves JavaFX WebView file:// drag payloads to real local metadata.
     * WebView reports these payloads as zero-byte File objects, so the backend
     * reads the native path before the UI displays the file name and size.
     */
    @PostMapping(value = "/google-drive/local-file-info", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> localFileInfo(@RequestBody Map<String, String> request) {
        try {
            Path path = resolveLocalUserFile(request.get("fileUri"));
            return ResponseEntity.ok(Map.of(
                    "fileName", path.getFileName().toString(),
                    "fileSize", Files.size(path),
                    "fileUri", path.toUri().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "The dropped local file could not be read."
            ));
        }
    }

    /**
     * Encrypts a native drag-and-drop path as a stream and uploads only its
     * ciphertext. resolveLocalUserFile validates the path before it is opened.
     */
    @PostMapping(value = "/google-drive/files/encrypt-upload-path", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> encryptAndUploadLocalPath(
            @RequestBody Map<String, String> request) {
        Long ownerID = currentUserService.requireUserID();
        try {
            Path path = resolveLocalUserFile(request.get("fileUri"));
            EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForUser(ownerID);
            String vaultPassphrase = userVaultService.filePassphraseFor(ownerID);
            try (InputStream input = Files.newInputStream(path);
                 InputStream encrypted = aesGcmService.encryptStream(input, vaultPassphrase, policy.keyLengthBits())) {
                return ResponseEntity.ok(googleDriveService.uploadEncrypted(
                        ownerID,
                        safeFilename(path.getFileName().toString(), "uploaded-file"),
                        policy.algorithm(),
                        encrypted
                ));
            }
        } catch (Exception e) {
            log.error("Encrypt-upload from local drag path failed", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "The dropped local file could not be encrypted and uploaded."
            ));
        }
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

    /** Keeps previous downloads by adding " (n)" instead of overwriting them. */
    private Path availableDestination(Path directory, String filename) {
        Path initial = directory.resolve(filename);
        if (!Files.exists(initial)) {
            return initial;
        }

        int dot = filename.lastIndexOf('.');
        String stem = dot > 0 ? filename.substring(0, dot) : filename;
        String extension = dot > 0 ? filename.substring(dot) : "";
        for (int suffix = 1; suffix < 10_000; suffix++) {
            Path candidate = directory.resolve(stem + " (" + suffix + ")" + extension);
            if (!Files.exists(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to choose an available download filename.");
    }

    /**
     * Restricts the native-file bridge to regular files inside the signed-in
     * Windows user's profile. This prevents crafted UI requests from reading
     * arbitrary system paths.
     */
    private Path resolveLocalUserFile(String fileUri) throws Exception {
        if (fileUri == null || fileUri.isBlank()) {
            throw new IllegalArgumentException("A local file URI is required.");
        }
        URI uri = URI.create(fileUri);
        if (!"file".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("Only local file URIs are supported.");
        }
        Path file = Path.of(uri).toRealPath();
        Path userHome = Path.of(System.getProperty("user.home")).toRealPath();
        if (!file.startsWith(userHome) || !Files.isRegularFile(file)) {
            throw new IllegalArgumentException("The dropped file must be inside the current user profile.");
        }
        return file;
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
