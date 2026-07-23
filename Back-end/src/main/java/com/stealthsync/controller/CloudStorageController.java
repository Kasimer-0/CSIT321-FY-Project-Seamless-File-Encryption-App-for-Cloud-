package com.stealthsync.controller;

import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.CloudFileRecord;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.CloudStorageAdapter;
import com.stealthsync.service.cloud.CloudCiphertextService;
import com.stealthsync.service.cloud.EncryptedEnvelopeV2Inspector;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.UserVaultService;
import com.stealthsync.service.security.SecurityAuditService;
import com.stealthsync.service.security.DeviceIdentifierService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/cloud-storage")
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
    private final SecurityAuditService securityAuditService;
    private final DeviceIdentifierService deviceIdentifierService;
    private final EncryptedEnvelopeV2Inspector envelopeInspector;
    private final CloudCiphertextService cloudCiphertextService;

    @Value("${stealthsync.frontend-url}")
    private String frontendUrl;

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
    public ResponseEntity<Map<String, Object>> startOAuth(
            @PathVariable String provider,
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        try {
            CloudStorageAdapter adapter = adapterFor(provider);
            String authUrl = adapter.createAuthorizationUrl(
                    ownerID,
                    deviceIdentifierService.requireHash(rawDeviceID));
            return ResponseEntity.ok(Map.<String, Object>of(
                    "mode", "oauth",
                    "provider", adapter.providerKey(),
                    "authUrl", authUrl,
                    "configured", adapter.isConfigured(),
                    "message", "Continue on the official " + adapter.providerLabel() + " authorization page."
            ));
        } catch (Exception exception) {
            securityAuditService.recordForUser(ownerID, "OAUTH_FAILED", normalizeProvider(provider));
            throw exception;
        }
    }

    @GetMapping({"/oauth/{provider}/callback", "/{provider}/callback"})
    public ResponseEntity<Void> completeCloudOAuth(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) throws Exception {
        CloudStorageAdapter adapter = adapterFor(provider);
        if (error != null) {
            return oauthRedirect(adapter.providerKey(), "cancelled", null);
        }
        try {
            CloudStorageLink link = adapter.completeAuthorization(code, state);
            securityAuditService.recordForUser(link.getOwnerID(), "OAUTH_CONNECTED", adapter.providerKey());
            return oauthRedirect(adapter.providerKey(), "connected", link.getAccountEmail());
        } catch (Exception exception) {
            log.warn("{} OAuth callback rejected: {}", adapter.providerLabel(), exception.getMessage());
            return oauthRedirect(adapter.providerKey(), "error", null);
        }
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
        CloudStorageAdapter adapter = adapterFor(provider);
        Map<String, CloudFileRecord> ownedV2 = new HashMap<>();
        cloudCiphertextService.listOwned(ownerID, adapter.providerKey())
                .forEach(record -> ownedV2.put(record.getRemoteFileID(), record));
        List<CloudFileDTO> files = adapter.listEncryptedFilesForProvider(ownerID).stream()
                .filter(file -> file.envelopeVersion() == null
                        || file.envelopeVersion() != EncryptedEnvelopeV2Inspector.VERSION
                        || ownedV2.containsKey(file.fileId()))
                .map(file -> file.envelopeVersion() != null
                        && file.envelopeVersion() == EncryptedEnvelopeV2Inspector.VERSION
                        ? v2FileDTO(file, ownedV2.get(file.fileId()))
                        : file)
                .toList();
        return ResponseEntity.ok(files);
    }

    @PostMapping(value = "/{provider}/files/upload-ciphertext", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CloudFileDTO> uploadCiphertext(
            @PathVariable String provider,
            @RequestParam("file") MultipartFile file,
            @RequestParam Map<String, String> requestParams) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        String normalizedProvider = normalizeProvider(provider);
        if (requestParams.containsKey("keyPassword")) {
            throw new IllegalArgumentException("Key passwords must remain in the browser.");
        }
        String objectName = requireOpaqueObjectName(requestParams.get("objectName"));
        long plaintextSize = requireNonNegativeLong(requestParams.get("plaintextSize"), "Plaintext size");
        byte[] ciphertext = file.getBytes();
        EncryptedEnvelopeV2Inspector.EnvelopeHeader header = envelopeInspector.inspect(ciphertext);
        var key = encryptionKeyService.requireActiveClientKeyForEncryption(ownerID, header.keyFingerprint());
        if (!key.getAlgorithm().equals(header.algorithm())) {
            throw new IllegalArgumentException("Encrypted envelope algorithm does not match the selected key.");
        }

        CloudStorageAdapter adapter = adapterFor(provider);
        requireActiveProvider(ownerID, adapter);
        try {
            CloudStorageAdapter.CiphertextUploadMetadata metadata =
                    new CloudStorageAdapter.CiphertextUploadMetadata(
                            objectName,
                            header.algorithm(),
                            header.keyFingerprint(),
                            header.encryptedMetadata(),
                            plaintextSize,
                            header.version());
            CloudFileDTO uploaded = adapter.uploadCiphertextForProvider(
                    ownerID, metadata, new ByteArrayInputStream(ciphertext));
            CloudFileRecord record = cloudCiphertextService.register(
                    ownerID,
                    adapter.providerKey(),
                    uploaded.fileId(),
                    uploaded.fileName(),
                    header,
                    plaintextSize,
                    ciphertext.length);
            securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_SUCCESS", normalizedProvider);
            return ResponseEntity.ok(v2FileDTO(uploaded, record));
        } catch (Exception exception) {
            securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_FAILED", normalizedProvider);
            throw exception;
        }
    }

    @GetMapping("/{provider}/files/{fileId}/download-ciphertext")
    public ResponseEntity<byte[]> downloadCiphertext(
            @PathVariable String provider,
            @PathVariable String fileId) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        CloudStorageAdapter adapter = adapterFor(provider);
        CloudFileRecord record = cloudCiphertextService.requireOwned(ownerID, adapter.providerKey(), fileId);
        CloudStorageAdapter.DownloadedCiphertext downloaded =
                adapter.downloadCiphertextForProvider(ownerID, fileId);
        EncryptedEnvelopeV2Inspector.EnvelopeHeader header = envelopeInspector.inspect(downloaded.ciphertext());
        if (!record.getKeyFingerprint().equals(header.keyFingerprint())
                || !record.getAlgorithm().equals(header.algorithm())) {
            throw new IllegalArgumentException("Cloud ciphertext metadata no longer matches its owner record.");
        }
        securityAuditService.recordForUser(ownerID, "FILE_DOWNLOAD_SUCCESS", adapter.providerKey());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(record.getObjectName(), StandardCharsets.UTF_8)
                        .build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.stealthsync.encrypted"))
                .body(downloaded.ciphertext());
    }

    @PostMapping(value = "/{provider}/files/encrypt-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CloudFileDTO> encryptAndUploadToProvider(
            @PathVariable String provider,
            @RequestParam("file") MultipartFile file,
            @RequestParam("keyID") Long keyID,
            @RequestParam("keyPassword") String keyPassword) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        String normalizedProvider = normalizeProvider(provider);
        try {
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
                CloudFileDTO uploaded = adapter.uploadEncryptedForProvider(
                        ownerID,
                        uploadMetadata(originalName, policy.algorithm(), keyMaterial),
                        encrypted);
                securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_SUCCESS", normalizedProvider);
                return ResponseEntity.ok(uploaded);
            }
        } catch (Exception exception) {
            securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_FAILED", normalizedProvider);
            auditWrongKeyPassword(ownerID, normalizedProvider, exception);
            throw exception;
        }
    }

    @GetMapping("/{provider}/files/{fileId}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptProviderFile(
            @PathVariable String provider,
            @PathVariable String fileId,
            @RequestHeader(value = "X-Key-Password", required = false) String keyPassword) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        String normalizedProvider = normalizeProvider(provider);
        try {
            CloudStorageAdapter.DownloadedCloudFile cloudFile =
                    adapterFor(provider).downloadEncryptedForProvider(ownerID, fileId);
            InputStream decrypted = decryptCloudContent(ownerID, cloudFile, keyPassword);
            securityAuditService.recordForUser(ownerID, "FILE_DOWNLOAD_SUCCESS", normalizedProvider);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(cloudFile.originalName(), StandardCharsets.UTF_8)
                            .build()
                            .toString())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(decrypted));
        } catch (Exception exception) {
            auditDecryptionFailure(ownerID, normalizedProvider, exception);
            throw exception;
        }
    }

    @DeleteMapping("/{provider}/files/{fileId}")
    public ResponseEntity<Void> deleteProviderFile(
            @PathVariable String provider,
            @PathVariable String fileId) throws Exception {
        Long ownerID = currentUserService.requireUserID();
        String normalizedProvider = normalizeProvider(provider);
        CloudStorageAdapter adapter = adapterFor(provider);
        CloudFileRecord v2Record = cloudCiphertextService.requireOwned(ownerID, adapter.providerKey(), fileId);
        adapter.deleteEncryptedFileForProvider(ownerID, fileId);
        cloudCiphertextService.deleteOwned(ownerID, adapter.providerKey(), v2Record.getRemoteFileID());
        securityAuditService.recordForUser(ownerID, "FILE_DELETE", normalizedProvider);
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

            securityAuditService.recordForUser(ownerID, "FILE_DOWNLOAD_SUCCESS", normalizeProvider(provider));
            return ResponseEntity.ok(Map.of(
                    "fileName", destination.getFileName().toString(),
                    "savedPath", destination.toAbsolutePath().toString(),
                    "size", plaintext.length
            ));
        } catch (IllegalArgumentException e) {
            auditDecryptionFailure(ownerID, normalizeProvider(provider), e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            auditDecryptionFailure(ownerID, normalizeProvider(provider), e);
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
                CloudFileDTO uploaded = adapter.uploadEncryptedForProvider(
                        ownerID,
                        uploadMetadata(safeFilename(path.getFileName().toString(), "uploaded-file"), policy.algorithm(), keyMaterial),
                        encrypted
                );
                securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_SUCCESS", normalizeProvider(provider));
                return ResponseEntity.ok(uploaded);
            }
        } catch (IllegalArgumentException e) {
            securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_FAILED", normalizeProvider(provider));
            auditWrongKeyPassword(ownerID, normalizeProvider(provider), e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            securityAuditService.recordForUser(ownerID, "FILE_UPLOAD_FAILED", normalizeProvider(provider));
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

    private void auditDecryptionFailure(Long ownerID, String provider, Exception exception) {
        securityAuditService.recordForUser(ownerID, "DECRYPTION_FAILED", provider);
        auditWrongKeyPassword(ownerID, provider, exception);
    }

    private void auditWrongKeyPassword(Long ownerID, String provider, Exception exception) {
        if (exception instanceof IllegalArgumentException
                && exception.getMessage() != null
                && exception.getMessage().toLowerCase(Locale.ROOT).contains("wrong key password")) {
            securityAuditService.recordForUser(ownerID, "WRONG_KEY_PASSWORD", provider);
        }
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

    private ResponseEntity<Void> oauthRedirect(String provider, String status, String accountEmail) {
        UriComponentsBuilder redirect = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("oauth", status)
                .queryParam("provider", provider);
        if (accountEmail != null && !accountEmail.isBlank()) {
            redirect.queryParam("account", accountEmail);
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirect.build().encode().toUri())
                .build();
    }

    private CloudFileDTO v2FileDTO(CloudFileDTO providerFile, CloudFileRecord record) {
        if (record == null) {
            throw new IllegalArgumentException("Encrypted cloud file ownership record is missing.");
        }
        return new CloudFileDTO(
                providerFile.provider(),
                providerFile.fileId(),
                providerFile.fileName(),
                null,
                record.getCiphertextSize(),
                providerFile.createdAt() == null ? record.getCreatedAt() : providerFile.createdAt(),
                providerFile.modifiedAt() == null ? record.getUpdatedAt() : providerFile.modifiedAt(),
                record.getAlgorithm(),
                null,
                null,
                record.getKeyFingerprint(),
                record.getEnvelopeVersion(),
                record.getEncryptedMetadata()
        );
    }

    private String requireOpaqueObjectName(String objectName) {
        if (objectName == null
                || !objectName.matches("(?i)stealthsync-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.ssenc")) {
            throw new IllegalArgumentException("Cloud object name must be an opaque StealthSync UUID.");
        }
        return objectName.toLowerCase(Locale.ROOT);
    }

    private long requireNonNegativeLong(String value, String fieldName) {
        try {
            long parsed = Long.parseLong(value);
            if (parsed < 0) {
                throw new NumberFormatException();
            }
            return parsed;
        } catch (Exception exception) {
            throw new IllegalArgumentException(fieldName + " is invalid.");
        }
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

}
