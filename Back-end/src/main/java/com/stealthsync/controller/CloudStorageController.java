package com.stealthsync.controller;

import com.stealthsync.config.DesktopWindowLauncher;
import com.stealthsync.config.SystemBrowserLauncher;
import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.CloudStorageAdapter;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.UserVaultService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/cloud-storage")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
/** Coordinates cloud-link management and provider-neutral encrypted cloud file operations. */
public class CloudStorageController {

    private static final String LEGACY_DRIVE_DEMO_PASSPHRASE = "stealthsync-demo-passphrase";

    private final AppDataService dataStore;
    private final List<CloudStorageAdapter> cloudStorageAdapters;
    private final AesGcmService aesGcmService;
    private final CurrentUserService currentUserService;
    private final UserVaultService userVaultService;
    private final EncryptionPolicyService encryptionPolicyService;
    private final EncryptionKeyService encryptionKeyService;

    @GetMapping("/links")
    public ResponseEntity<List<CloudStorageLink>> getLinks() {
        return ResponseEntity.ok(dataStore.listCloudStorageLinks(currentUserService.requireUserID()));
    }

    @GetMapping("/links/active")
    public ResponseEntity<Map<String, Object>> getActiveLink() {
        return dataStore.activeCloudStorageLink(currentUserService.requireUserID())
                .<ResponseEntity<Map<String, Object>>>map(link -> ResponseEntity.ok(Map.of(
                        "active", true,
                        "linkID", link.getLinkID(),
                        "provider", link.getProvider(),
                        "accountEmail", link.getAccountEmail(),
                        "status", link.getStatus(),
                        "isActive", link.isActive(),
                        "link", link
                )))
                .orElseGet(() -> ResponseEntity.ok(Map.of(
                        "active", false,
                        "message", "No active cloud storage account is selected."
                )));
    }

    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> getProviders() {
        Long ownerID = currentUserService.requireUserID();
        Map<String, String> providerModes = new LinkedHashMap<>();
        Map<String, Boolean> configured = new LinkedHashMap<>();
        cloudStorageAdapters.forEach(adapter -> {
            providerModes.put(adapter.providerKey(), "oauth");
            configured.put(adapter.providerKey(), adapter.isConfigured());
        });
        return ResponseEntity.ok(Map.of(
                "providers", dataStore.supportedCloudProviders(),
                "providerModes", providerModes,
                "configured", configured,
                "providerLimit", dataStore.cloudProviderLimitFor(ownerID)
        ));
    }

    @RequestMapping(value = {"/links/{id}/activate", "/links/{id}/set-active"}, method = {RequestMethod.POST, RequestMethod.PATCH})
    public ResponseEntity<CloudStorageLink> setActive(@PathVariable Long id) {
        return dataStore.setActiveCloudStorageLink(id, currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(value = "/links/{id}/deactivate", method = {RequestMethod.POST, RequestMethod.PATCH})
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
                .ifPresent(link -> adapterFor(link.getProvider()).disconnect(ownerID));
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

    @GetMapping({"/auth/{provider}", "/{provider}/auth"})
    public ResponseEntity<Map<String, Object>> startOAuth(@PathVariable String provider) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        CloudStorageAdapter adapter = adapterFor(provider);
        String authUrl = adapter.createAuthorizationUrl(ownerID);
        boolean opened = SystemBrowserLauncher.open(URI.create(authUrl));
        return ResponseEntity.ok(Map.<String, Object>of(
                "mode", "oauth",
                "provider", adapter.providerKey(),
                "authUrl", authUrl,
                "openedExternal", opened,
                "configured", adapter.isConfigured(),
                "message", adapter.providerLabel() + " authorization opened in your browser."
        ));
    }

    @GetMapping({"/oauth/{provider}/callback", "/{provider}/callback"})
    public ResponseEntity<String> completeCloudOAuth(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) throws Exception {
        CloudStorageAdapter adapter = adapterFor(provider);
        if (error != null) {
            return htmlResponse(adapter.providerLabel() + " connection cancelled", adapter.providerLabel() + " returned: " + error);
        }
        CloudStorageLink link = adapter.completeAuthorization(code, state);
        DesktopWindowLauncher.focusPrimaryWindow();
        return htmlResponse(
                adapter.providerLabel() + " connected",
                "Connected " + link.getAccountEmail() + ". You can close this browser tab and return to StealthSync."
        );
    }

    @GetMapping("/{provider}/status")
    public ResponseEntity<Map<String, Object>> providerStatus(@PathVariable String provider) {
        Long ownerID = currentUserService.requireUserID();
        CloudStorageAdapter adapter = adapterFor(provider);
        return ResponseEntity.ok(Map.of(
                "provider", adapter.providerKey(),
                "configured", adapter.isConfigured(),
                "connected", adapter.isConnected(ownerID)
        ));
    }

    @GetMapping("/{provider}/files")
    public ResponseEntity<List<CloudFileDTO>> providerFiles(@PathVariable String provider) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        return ResponseEntity.ok(adapterFor(provider).listEncryptedFilesForProvider(ownerID));
    }

    @PostMapping(value = "/{provider}/files/encrypt-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CloudFileDTO> encryptAndUploadToProvider(
            @PathVariable String provider,
            @RequestParam("file") MultipartFile file,
            @RequestParam("keyID") Long keyID,
            @RequestParam("keyPassword") String keyPassword) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        CloudStorageAdapter adapter = adapterFor(provider);
        requireActiveProvider(ownerID, adapter);
        String originalName = safeFilename(file.getOriginalFilename(), "uploaded-file");
        EncryptionKeyService.DerivedKeyMaterial keyMaterial =
                encryptionKeyService.requireActiveKeyMaterialForEncryption(ownerID, keyID, keyPassword);
        EncryptionPolicyService.EncryptionPolicy policy =
                encryptionPolicyService.policyForAlgorithm(keyMaterial.key().getAlgorithm());
        try (InputStream encrypted = aesGcmService.encryptStream(
                file.getInputStream(),
                keyMaterial.passphrase(),
                policy.keyLengthBits())) {
            return ResponseEntity.ok(adapter.uploadEncryptedForProvider(
                    ownerID,
                    uploadMetadata(originalName, policy.algorithm(), keyMaterial),
                    encrypted));
        }
    }

    @GetMapping("/{provider}/files/{fileId}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptProviderFile(
            @PathVariable String provider,
            @PathVariable String fileId,
            @RequestHeader(value = "X-Key-Password", required = false) String keyPassword) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        CloudStorageAdapter.DownloadedCloudFile cloudFile =
                adapterFor(provider).downloadEncryptedForProvider(ownerID, fileId);
        InputStream decrypted = decryptCloudContent(ownerID, cloudFile, keyPassword);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(cloudFile.originalName(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(decrypted));
    }

    @DeleteMapping("/{provider}/files/{fileId}")
    public ResponseEntity<Void> deleteProviderFile(
            @PathVariable String provider,
            @PathVariable String fileId) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        adapterFor(provider).deleteEncryptedFileForProvider(ownerID, fileId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{provider}/files/{fileId}/decrypt-save")
    public ResponseEntity<Map<String, Object>> decryptAndSaveProviderFile(
            @PathVariable String provider,
            @PathVariable String fileId,
            @RequestBody(required = false) Map<String, String> request) {
        Long ownerID = currentUserService.requireUserID();
        try {
            CloudStorageAdapter.DownloadedCloudFile cloudFile =
                    adapterFor(provider).downloadEncryptedForProvider(ownerID, fileId);
            byte[] plaintext;
            try (InputStream decrypted = decryptCloudContent(ownerID, cloudFile, keyPassword(request))) {
                plaintext = decrypted.readAllBytes();
            }

            Path downloads = Path.of(System.getProperty("user.home"), "Downloads");
            Files.createDirectories(downloads);
            Path destination = availableDestination(
                    downloads,
                    safeFilename(cloudFile.originalName(), "decrypted-cloud-file")
            );
            Files.write(destination, plaintext);

            return ResponseEntity.ok(Map.of(
                    "fileName", destination.getFileName().toString(),
                    "savedPath", destination.toAbsolutePath().toString(),
                    "size", plaintext.length
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Cloud decrypt-save failed for provider {}", provider, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unable to decrypt and save the cloud file."
            ));
        }
    }

    @PostMapping(value = "/{provider}/local-file-info", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> localFileInfo(@RequestBody Map<String, String> request) {
        try {
            Path path = resolveLocalUserFile(asString(request.get("fileUri")));
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

    @PostMapping(value = "/{provider}/files/encrypt-upload-path", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> encryptAndUploadLocalPath(
            @PathVariable String provider,
            @RequestBody Map<String, Object> request) {
        Long ownerID = currentUserService.requireUserID();
        try {
            CloudStorageAdapter adapter = adapterFor(provider);
            requireActiveProvider(ownerID, adapter);
            Path path = resolveLocalUserFile(asString(request.get("fileUri")));
            EncryptionKeyService.DerivedKeyMaterial keyMaterial = encryptionKeyService.requireActiveKeyMaterialForEncryption(
                    ownerID,
                    asLong(request.get("keyID")),
                    asString(request.get("keyPassword"))
            );
            EncryptionPolicyService.EncryptionPolicy policy =
                    encryptionPolicyService.policyForAlgorithm(keyMaterial.key().getAlgorithm());
            try (InputStream input = Files.newInputStream(path);
                 InputStream encrypted = aesGcmService.encryptStream(input, keyMaterial.passphrase(), policy.keyLengthBits())) {
                return ResponseEntity.ok(adapter.uploadEncryptedForProvider(
                        ownerID,
                        uploadMetadata(safeFilename(path.getFileName().toString(), "uploaded-file"), policy.algorithm(), keyMaterial),
                        encrypted
                ));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Encrypt-upload from local drag path failed", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "The dropped local file could not be encrypted and uploaded."
            ));
        }
    }

    private void requireActiveProvider(Long ownerID, CloudStorageAdapter adapter) {
        CloudStorageLink activeLink = dataStore.activeCloudStorageLink(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Activate a cloud storage account before uploading."));
        if (!adapter.providerKey().equalsIgnoreCase(activeLink.getProvider())) {
            throw new IllegalArgumentException("Activate " + adapter.providerLabel() + " before uploading to it.");
        }
    }

    private CloudStorageAdapter.CloudUploadMetadata uploadMetadata(
            String originalName,
            String algorithm,
            EncryptionKeyService.DerivedKeyMaterial keyMaterial) {
        return new CloudStorageAdapter.CloudUploadMetadata(
                originalName,
                algorithm,
                keyMaterial.key().getKeyID(),
                keyMaterial.key().getKeyName(),
                keyMaterial.key().getFingerprint()
        );
    }

    private InputStream decryptCloudContent(
            Long ownerID,
            CloudStorageAdapter.DownloadedCloudFile cloudFile,
            String keyPassword) throws Exception {
        EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForAlgorithm(cloudFile.encMethod());
        if (cloudFile.keyID() == null) {
            return decryptLegacyCloudContent(ownerID, cloudFile.encryptedContent(), policy.keyLengthBits());
        }
        EncryptionKeyService.DerivedKeyMaterial keyMaterial =
                encryptionKeyService.requireKeyMaterialForDecryption(
                        ownerID,
                        cloudFile.keyID(),
                        cloudFile.keyFingerprint(),
                        keyPassword
                );
        return aesGcmService.decryptStream(
                new ByteArrayInputStream(cloudFile.encryptedContent()),
                keyMaterial.passphrase(),
                policy.keyLengthBits()
        );
    }

    private InputStream decryptLegacyCloudContent(Long ownerID, byte[] encryptedContent, int keyLengthBits) throws Exception {
        try {
            return new ByteArrayInputStream(decryptCloudBytes(encryptedContent, userVaultService.filePassphraseFor(ownerID), keyLengthBits));
        } catch (Exception vaultFailure) {
            try {
                return new ByteArrayInputStream(decryptCloudBytes(encryptedContent, LEGACY_DRIVE_DEMO_PASSPHRASE, keyLengthBits));
            } catch (Exception legacyFailure) {
                vaultFailure.addSuppressed(legacyFailure);
                throw vaultFailure;
            }
        }
    }

    private byte[] decryptCloudBytes(byte[] encryptedContent, String passphrase, int keyLengthBits) throws Exception {
        try (InputStream decrypted = aesGcmService.decryptStream(
                new ByteArrayInputStream(encryptedContent),
                passphrase,
                keyLengthBits)) {
            return decrypted.readAllBytes();
        }
    }

    private CloudStorageAdapter adapterFor(String provider) {
        String normalized = normalizeProvider(provider);
        return cloudStorageAdapters.stream()
                .filter(adapter -> adapter.providerKey().equalsIgnoreCase(normalized)
                        || adapter.providerPath().equalsIgnoreCase(provider))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported cloud storage provider: " + provider));
    }

    private String normalizeProvider(String provider) {
        String normalized = provider == null ? "" : provider.trim().toLowerCase(Locale.ROOT).replace("-", "_");
        if ("google".equals(normalized)) {
            return "google_drive";
        }
        return normalized;
    }

    private String keyPassword(Map<String, String> request) {
        return request == null ? null : request.get("keyPassword");
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text.trim());
        }
        return null;
    }

    private String asString(Object value) {
        return value instanceof String text ? text : null;
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
