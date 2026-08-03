package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.dto.GoogleDriveFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.GoogleDriveCredential;
import com.stealthsync.repository.GoogleDriveCredentialRepository;
import com.stealthsync.security.OAuthStateService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.UserVaultService;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
/**
 * Implements Google OAuth, encrypted credential persistence, token refresh, and Drive file transfer.
 * Access and refresh tokens are encrypted with an installation secret before JPA persistence.
 */
public class GoogleDriveService implements CloudStorageAdapter {

    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USER_INFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
    private static final String DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";
    // Keep the least-privilege scope. The configured demo folder is already
    // accessible to this app, so broader full-Drive authorization is unnecessary.
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    private static final String FULL_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
    private static final String USER_EMAIL_SCOPE = "openid https://www.googleapis.com/auth/userinfo.email";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String METADATA_DESCRIPTION_PREFIX = "stealthsync-metadata:";
    private static final String DEFAULT_LEGACY_ENC_METHOD = "AES-256-GCM";

    private final GoogleDriveCredentialRepository credentialRepository;
    private final AppDataService dataStore;
    private final UserVaultService userVaultService;
    private final AesGcmService aesGcmService;
    private final ObjectMapper objectMapper;
    private final OAuthStateService oauthStateService;
    private HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Value("${stealthsync.google-drive.client-id:}")
    private String clientId;

    @Value("${stealthsync.google-drive.client-secret:}")
    private String clientSecret;

    @Value("${stealthsync.google-drive.redirect-uri:}")
    private String redirectUri;

    // Selects the intended demo account but never bypasses Google authentication.
    @Value("${stealthsync.google-drive.login-hint:}")
    private String loginHint;

    // When set, list and upload operations stay inside this Drive folder. An
    // empty value preserves the original app-owned-files behavior.
    @Value("${stealthsync.google-drive.folder-id:}")
    private String folderId;

    @Override
    public String providerKey() {
        return "google_drive";
    }

    @Override
    public String providerPath() {
        return "google-drive";
    }

    @Override
    public String providerLabel() {
        return "Google Drive";
    }

    @Override
    public boolean isConfigured() {
        return !isBlank(clientId) && !isBlank(clientSecret) && !isBlank(redirectUri);
    }

    @Override
    public boolean isConnected(Long ownerID) {
        return ownerID != null
                && credentialRepository.findByOwnerID(ownerID).isPresent()
                && dataStore.listCloudStorageLinks(ownerID).stream()
                .anyMatch(link -> "google_drive".equalsIgnoreCase(link.getProvider())
                        && "connected".equalsIgnoreCase(link.getStatus()));
    }

    @Override
    /** Creates a short-lived state token that binds the OAuth callback to one local customer. */
    public String createAuthorizationUrl(Long ownerID, String deviceIdentifierHash) {
        requireConfigured();
        if (ownerID == null) {
            throw new IllegalArgumentException("A user is required to link Google Drive.");
        }

        String state = oauthStateService.issue(ownerID, providerKey(), deviceIdentifierHash);

        String authorizationUrl = AUTHORIZATION_ENDPOINT
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode(DRIVE_SCOPE + " " + USER_EMAIL_SCOPE)
                + "&access_type=offline"
                + "&include_granted_scopes=true"
                + "&prompt=consent%20select_account"
                + "&state=" + encode(state);
        if (!isBlank(loginHint)) {
            // A hint controls account selection only; Google still asks for consent.
            authorizationUrl += "&login_hint=" + encode(loginHint);
        }
        return authorizationUrl;
    }

    @Override
    @Transactional
    /** Exchanges Google's callback code, records the account email, and stores encrypted tokens. */
    public CloudStorageLink completeAuthorization(String code, String state) throws IOException, InterruptedException {
        requireConfigured();
        OAuthStateService.OAuthState oauthState = oauthStateService.consume(state, providerKey());
        if (isBlank(code)) {
            throw new IllegalArgumentException("Google Drive did not return an authorization code.");
        }

        JsonNode tokenResponse = postForm(TOKEN_ENDPOINT, Map.of(
                "code", code,
                "client_id", clientId,
                "client_secret", clientSecret,
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code"
        ));
        requireGrantedDriveScope(tokenResponse);
        String accessToken = requiredText(tokenResponse, "access_token");
        String returnedRefreshToken = textOrNull(tokenResponse, "refresh_token");
        long expiresIn = tokenResponse.path("expires_in").asLong(3600);

        // Granular Google consent can return a token that identifies the user but cannot access Drive.
        // Verify Drive access before persisting the link as connected.
        verifyDriveAccess(accessToken);
        String accountEmail = fetchAccountEmail(accessToken);
        GoogleDriveCredential credential = credentialRepository.findByOwnerID(oauthState.ownerID())
                .orElseGet(GoogleDriveCredential::new);
        String refreshToken = selectRefreshTokenForAuthorization(
                returnedRefreshToken,
                decryptToken(credential, credential.getRefreshToken()),
                credential.getAccountEmail(),
                accountEmail);
        credential.setOwnerID(oauthState.ownerID());
        credential.setAccountEmail(accountEmail);
        if (isBlank(credential.getTokenSalt())) {
            credential.setTokenSalt(KeyGenerators.string().generateKey());
        }
        credential.setAccessToken(encryptToken(credential, accessToken));
        credential.setRefreshToken(encryptToken(credential, refreshToken));
        credential.setExpiresAt(Instant.now().plusSeconds(expiresIn));
        credentialRepository.save(credential);

        return dataStore.linkCloudProvider(providerKey(), oauthState.ownerID(), accountEmail);
    }

    private String selectRefreshTokenForAuthorization(
            String returnedRefreshToken,
            String existingRefreshToken,
            String existingAccountEmail,
            String selectedAccountEmail) {
        if (!isBlank(returnedRefreshToken)) {
            return returnedRefreshToken;
        }
        if (!isBlank(existingAccountEmail)
                && !existingAccountEmail.equalsIgnoreCase(selectedAccountEmail)) {
            throw new IllegalArgumentException(
                    "Google Drive did not issue a refresh token for the newly selected account. "
                            + "Remove StealthSync access from that Google account, then use Change account again.");
        }
        if (isBlank(existingRefreshToken)) {
            throw new IllegalArgumentException(
                    "Google Drive did not provide a refresh token. Revoke the previous app grant and connect again.");
        }
        return existingRefreshToken;
    }

    @Override
    public List<CloudFileDTO> listEncryptedFilesForProvider(Long ownerID) throws IOException, InterruptedException {
        JsonNode response = listFilesResponse(ownerID);
        return response.path("files").findValuesAsText("id").stream()
                .map(id -> findFileNode(response.path("files"), id))
                .map(file -> toProviderFileDTO(ownerID, file))
                .toList();
    }

    @Override
    public CloudFileDTO uploadEncryptedForProvider(Long ownerID, CloudUploadMetadata metadata, InputStream encryptedContent)
            throws IOException, InterruptedException {
        return toCloudFileDTO(uploadEncrypted(
                ownerID,
                metadata.originalName(),
                metadata.encMethod(),
                metadata.keyID(),
                metadata.keyName(),
                metadata.keyFingerprint(),
                encryptedContent
        ));
    }

    @Override
    public DownloadedCloudFile downloadEncryptedForProvider(Long ownerID, String fileId)
            throws IOException, InterruptedException {
        DownloadedDriveFile file = downloadEncrypted(ownerID, fileId);
        return new DownloadedCloudFile(
                file.originalName(),
                file.encMethod(),
                file.keyID(),
                file.keyName(),
                file.keyFingerprint(),
                file.encryptedContent()
        );
    }

    @Override
    public CloudFileDTO uploadCiphertextForProvider(
            Long ownerID,
            CiphertextUploadMetadata metadata,
            InputStream ciphertext) throws IOException, InterruptedException {
        byte[] ciphertextBytes = ciphertext.readAllBytes();
        String boundary = "stealthsync-" + newState();
        ObjectNode properties = objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", Integer.toString(metadata.envelopeVersion()))
                .put("encMethod", metadata.algorithm())
                .put("keyFingerprint", metadata.keyFingerprint());
        ObjectNode fileMetadata = objectMapper.createObjectNode()
                .put("name", metadata.objectName())
                .put("mimeType", "application/vnd.stealthsync.encrypted");
        fileMetadata.set("appProperties", properties);
        if (!isBlank(folderId)) {
            fileMetadata.putArray("parents").add(folderId);
        }

        ByteArrayOutputStream body = new ByteArrayOutputStream();
        writeUtf8(body, "--" + boundary + "\r\n");
        writeUtf8(body, "Content-Type: application/json; charset=UTF-8\r\n\r\n");
        writeUtf8(body, objectMapper.writeValueAsString(fileMetadata) + "\r\n");
        writeUtf8(body, "--" + boundary + "\r\n");
        writeUtf8(body, "Content-Type: application/vnd.stealthsync.encrypted\r\n\r\n");
        body.write(ciphertextBytes);
        writeUtf8(body, "\r\n--" + boundary + "--\r\n");

        JsonNode uploaded = sendJson(ownerID, HttpRequest.newBuilder(URI.create(DRIVE_UPLOAD_ENDPOINT
                        + "?uploadType=multipart&fields="
                        + encode("id,name,size,createdTime,modifiedTime,description,appProperties")))
                .header("Content-Type", "multipart/related; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())));
        return v2FileDTO(uploaded, metadata.encryptedMetadata());
    }

    @Override
    public DownloadedCiphertext downloadCiphertextForProvider(Long ownerID, String fileId)
            throws IOException, InterruptedException {
        JsonNode metadata = fileMetadata(ownerID, fileId);
        if (metadata.path("appProperties").path("metadataVersion").asInt(0) != 2) {
            throw new IllegalArgumentException("The selected cloud object is not a V2 encrypted file.");
        }
        HttpResponse<byte[]> response = send(ownerID,
                HttpRequest.newBuilder(URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId) + "?alt=media")).GET(),
                HttpResponse.BodyHandlers.ofByteArray());
        return new DownloadedCiphertext(metadata.path("name").asText("encrypted.ssenc"), response.body());
    }

    @Override
    public void deleteEncryptedFileForProvider(Long ownerID, String fileId) throws IOException, InterruptedException {
        deleteEncryptedFile(ownerID, fileId);
    }

    public List<GoogleDriveFileDTO> listEncryptedFiles(Long ownerID) throws IOException, InterruptedException {
        JsonNode response = listFilesResponse(ownerID);

        return response.path("files").findValuesAsText("id").stream()
                .map(id -> findFileNode(response.path("files"), id))
                .filter(file -> file.path("appProperties").path("metadataVersion").asInt(1) != 2)
                .map(file -> toFileDTO(ownerID, file))
                .toList();
    }

    private JsonNode listFilesResponse(Long ownerID) throws IOException, InterruptedException {
        String query = "trashed = false and appProperties has { key='stealthsync' and value='encrypted' }";
        if (!isBlank(folderId)) {
            // Drive query syntax requires a quoted parent folder ID.
            query += " and '" + folderId.replace("'", "\\'") + "' in parents";
        }
        URI uri = URI.create(DRIVE_FILES_ENDPOINT
                + "?q=" + encode(query)
                + "&orderBy=modifiedTime%20desc"
                + "&pageSize=100"
                + "&fields=" + encode("files(id,name,size,createdTime,modifiedTime,description,appProperties)"));
        return sendJson(ownerID, HttpRequest.newBuilder(uri).GET());
    }

    public GoogleDriveFileDTO uploadEncrypted(Long ownerID, String originalName, String encMethod, Long keyID, String keyName, String keyFingerprint, InputStream encryptedContent)
            throws IOException, InterruptedException {
        byte[] encryptedBytes = encryptedContent.readAllBytes();
        String driveName = "stlh-" + newState() + ".stealthsync.enc";
        String boundary = "stealthsync-" + newState();

        var metadata = objectMapper.createObjectNode()
                .put("name", driveName)
                .put("mimeType", "application/octet-stream")
                .put("description", encryptedMetadataDescription(ownerID, originalName, encMethod, keyID, keyName, keyFingerprint));
        metadata.set("appProperties", objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", "1")
                .put("encMethod", encMethod));
        writePortableKeyHints((ObjectNode) metadata.get("appProperties"), keyID, keyFingerprint);
        if (!isBlank(folderId)) {
            // Set the parent in metadata so ciphertext never lands in Drive root.
            metadata.putArray("parents").add(folderId);
        }

        ByteArrayOutputStream body = new ByteArrayOutputStream();
        writeUtf8(body, "--" + boundary + "\r\n");
        writeUtf8(body, "Content-Type: application/json; charset=UTF-8\r\n\r\n");
        writeUtf8(body, objectMapper.writeValueAsString(metadata) + "\r\n");
        writeUtf8(body, "--" + boundary + "\r\n");
        writeUtf8(body, "Content-Type: application/octet-stream\r\n\r\n");
        body.write(encryptedBytes);
        writeUtf8(body, "\r\n--" + boundary + "--\r\n");

        URI uri = URI.create(DRIVE_UPLOAD_ENDPOINT
                + "?uploadType=multipart&fields="
                + encode("id,name,size,createdTime,modifiedTime,description,appProperties"));
        HttpRequest.Builder request = HttpRequest.newBuilder(uri)
                .header("Content-Type", "multipart/related; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()));
        return toFileDTO(ownerID, sendJson(ownerID, request));
    }

    /** Deletes only the Drive file ID selected by the authenticated owner. */
    public void deleteEncryptedFile(Long ownerID, String fileId) throws IOException, InterruptedException {
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId));
        HttpResponse<String> response = send(
                ownerID,
                HttpRequest.newBuilder(uri).DELETE(),
                HttpResponse.BodyHandlers.ofString()
        );
        ensureSuccess(response.statusCode(), response.body() == null ? "" : response.body());
    }

    public DownloadedDriveFile downloadEncrypted(Long ownerID, String fileId)
            throws IOException, InterruptedException {
        JsonNode metadata = migrateLegacyMetadataIfNeeded(ownerID, fileMetadata(ownerID, fileId));
        DriveFileMetadata fileInfo = readDriveMetadata(ownerID, metadata);
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId) + "?alt=media");
        HttpResponse<byte[]> response = send(ownerID, HttpRequest.newBuilder(uri).GET(), HttpResponse.BodyHandlers.ofByteArray());
        return new DownloadedDriveFile(fileInfo.originalName(), fileInfo.encMethod(), fileInfo.keyID(), fileInfo.keyName(), fileInfo.keyFingerprint(), response.body());
    }

    @Transactional
    @Override
    public void disconnect(Long ownerID) {
        if (ownerID != null) {
            credentialRepository.deleteByOwnerID(ownerID);
        }
    }

    private CloudFileDTO toCloudFileDTO(GoogleDriveFileDTO file) {
        return new CloudFileDTO(
                providerKey(),
                file.fileId(),
                file.fileName(),
                file.originalName(),
                file.fileSize(),
                file.createdAt(),
                file.modifiedAt(),
                file.encMethod(),
                file.keyID(),
                file.keyName(),
                file.keyFingerprint()
        );
    }

    private CloudFileDTO toProviderFileDTO(Long ownerID, JsonNode file) {
        if (file.path("appProperties").path("metadataVersion").asInt(1) == 2) {
            return v2FileDTO(file, null);
        }
        return toCloudFileDTO(toFileDTO(ownerID, file));
    }

    private CloudFileDTO v2FileDTO(JsonNode file, String encryptedMetadata) {
        JsonNode properties = file.path("appProperties");
        return new CloudFileDTO(
                providerKey(),
                file.path("id").asText(),
                file.path("name").asText("encrypted.ssenc"),
                null,
                file.path("size").asLong(0),
                parseInstant(file.path("createdTime").asText(null)),
                parseInstant(file.path("modifiedTime").asText(null)),
                properties.path("encMethod").asText(""),
                null,
                null,
                properties.path("keyFingerprint").asText(""),
                2,
                encryptedMetadata
        );
    }

    private JsonNode fileMetadata(Long ownerID, String fileId) throws IOException, InterruptedException {
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId)
                + "?fields=" + encode("id,name,size,createdTime,modifiedTime,description,appProperties"));
        return sendJson(ownerID, HttpRequest.newBuilder(uri).GET());
    }

    private String fetchAccountEmail(String accessToken) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(USER_INFO_ENDPOINT))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response.statusCode(), response.body());
        return requiredText(objectMapper.readTree(response.body()), "email");
    }

    private void requireGrantedDriveScope(JsonNode tokenResponse) {
        String grantedScopes = textOrNull(tokenResponse, "scope");
        if (isBlank(grantedScopes)) {
            return;
        }
        boolean hasDriveAccess = List.of(grantedScopes.trim().split("\\s+"))
                .stream()
                .anyMatch(scope -> DRIVE_SCOPE.equals(scope) || FULL_DRIVE_SCOPE.equals(scope));
        if (!hasDriveAccess) {
            throw missingDrivePermission();
        }
    }

    private void verifyDriveAccess(String accessToken) throws IOException, InterruptedException {
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "?pageSize=1&fields=" + encode("files(id)"));
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (isInsufficientDriveScope(response.statusCode(), response.body())) {
            throw missingDrivePermission();
        }
        ensureSuccess(response.statusCode(), response.body());
    }

    private JsonNode sendJson(Long ownerID, HttpRequest.Builder requestBuilder)
            throws IOException, InterruptedException {
        HttpResponse<String> response = send(ownerID, requestBuilder, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(response.body());
    }

    // Retry one unauthorized request after forcing token refresh and convert known OAuth failures into reconnect state.
    private <T> HttpResponse<T> send(Long ownerID, HttpRequest.Builder requestBuilder,
                                     HttpResponse.BodyHandler<T> bodyHandler)
            throws IOException, InterruptedException {
        GoogleDriveCredential credential = credential(ownerID);
        String token = validAccessToken(credential, false);
        HttpResponse<T> response = httpClient.send(
                requestBuilder.timeout(REQUEST_TIMEOUT).header("Authorization", "Bearer " + token).build(),
                bodyHandler
        );
        if (response.statusCode() == 401) {
            token = validAccessToken(credential, true);
            response = httpClient.send(
                    requestBuilder.timeout(REQUEST_TIMEOUT).setHeader("Authorization", "Bearer " + token).build(),
                    bodyHandler
            );
        }
        String responseBody = responseBodyText(response.body());
        if (isInsufficientDriveScope(response.statusCode(), responseBody)) {
            expireAuthorization(ownerID, "Drive file permission is missing");
            throw missingDrivePermission();
        }
        ensureSuccess(response.statusCode(), responseBody);
        return response;
    }

    // Prevent parallel transfers from racing while replacing an expired access token.
    private synchronized String validAccessToken(GoogleDriveCredential credential, boolean forceRefresh)
            throws IOException, InterruptedException {
        if (!forceRefresh && credential.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return decryptToken(credential, credential.getAccessToken());
        }
        JsonNode response;
        try {
            response = postForm(TOKEN_ENDPOINT, Map.of(
                    "client_id", clientId,
                    "client_secret", clientSecret,
                    "refresh_token", decryptToken(credential, credential.getRefreshToken()),
                    "grant_type", "refresh_token"
            ));
        } catch (IllegalArgumentException exception) {
            if (isInvalidGrant(exception.getMessage())) {
                expireAuthorization(credential.getOwnerID(), "Refresh token expired or was revoked");
                throw new IllegalArgumentException(
                        "Google Drive authorization expired or was revoked. Reconnect Google Drive.");
            }
            throw exception;
        }
        String accessToken = requiredText(response, "access_token");
        String rotatedRefreshToken = textOrNull(response, "refresh_token");
        credential.setAccessToken(encryptToken(credential, accessToken));
        if (!isBlank(rotatedRefreshToken)) {
            credential.setRefreshToken(encryptToken(credential, rotatedRefreshToken));
        }
        credential.setExpiresAt(Instant.now().plusSeconds(response.path("expires_in").asLong(3600)));
        credentialRepository.save(credential);
        return accessToken;
    }

    private JsonNode postForm(String endpoint, Map<String, String> values)
            throws IOException, InterruptedException {
        String form = values.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response.statusCode(), response.body());
        return objectMapper.readTree(response.body());
    }

    private GoogleDriveCredential credential(Long ownerID) {
        requireConfigured();
        return credentialRepository.findByOwnerID(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Google Drive is not connected for this user."));
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalArgumentException(
                    "Google Drive OAuth is not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET."
            );
        }
    }

    private void ensureSuccess(int statusCode, String responseBody) {
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalArgumentException("Google Drive request failed (HTTP " + statusCode + "): " + responseBody);
        }
    }

    private boolean isInsufficientDriveScope(int statusCode, String responseBody) {
        if (statusCode != 403 || isBlank(responseBody)) {
            return false;
        }
        String normalized = responseBody.toLowerCase();
        return normalized.contains("access_token_scope_insufficient")
                || normalized.contains("insufficient authentication scopes")
                || normalized.contains("insufficientpermission");
    }

    private boolean isInvalidGrant(String message) {
        if (isBlank(message)) {
            return false;
        }
        String normalized = message.toLowerCase();
        return normalized.contains("invalid_grant")
                || normalized.contains("expired or revoked");
    }

    private String responseBodyText(Object body) {
        if (body == null) {
            return "";
        }
        if (body instanceof byte[] bytes) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        return String.valueOf(body);
    }

    private void expireAuthorization(Long ownerID, String reason) {
        if (ownerID == null) {
            return;
        }
        credentialRepository.deleteByOwnerID(ownerID);
        dataStore.expireCloudStorageLink(ownerID, providerKey());
        log.warn("Google Drive authorization expired for owner {}: {}", ownerID, reason);
    }

    private IllegalArgumentException missingDrivePermission() {
        return new IllegalArgumentException(
                "Google Drive authorization is missing file access. Reconnect and approve Google Drive file access.");
    }

    private GoogleDriveFileDTO toFileDTO(Long ownerID, JsonNode file) {
        JsonNode safeFile = migrateLegacyMetadataIfNeeded(ownerID, file);
        String name = safeFile.path("name").asText("encrypted-file.stealthsync.enc");
        DriveFileMetadata fileInfo = readDriveMetadata(ownerID, safeFile);
        return new GoogleDriveFileDTO(
                safeFile.path("id").asText(),
                name,
                fileInfo.originalName(),
                safeFile.path("size").asLong(0),
                parseInstant(safeFile.path("createdTime").asText(null)),
                parseInstant(safeFile.path("modifiedTime").asText(null)),
                fileInfo.encMethod(),
                fileInfo.keyID(),
                fileInfo.keyName(),
                fileInfo.keyFingerprint()
        );
    }

    private JsonNode migrateLegacyMetadataIfNeeded(Long ownerID, JsonNode file) {
        if (!hasLegacyPlaintextMetadata(file)) {
            return file;
        }
        String fileId = file.path("id").asText("");
        try {
            DriveFileMetadata legacyMetadata = legacyFileMetadata(file);
            return patchEncryptedMetadata(ownerID, fileId, legacyMetadata);
        } catch (Exception e) {
            log.warn("Unable to migrate legacy Google Drive metadata for file {}", fileId, e);
            return file;
        }
    }

    private JsonNode patchEncryptedMetadata(Long ownerID, String fileId, DriveFileMetadata metadata)
            throws IOException, InterruptedException {
        if (isBlank(fileId)) {
            throw new IllegalArgumentException("A Drive file ID is required for metadata migration.");
        }

        ObjectNode appProperties = objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", "1")
                .put("encMethod", metadata.encMethod());
        writePortableKeyHints(appProperties, metadata.keyID(), metadata.keyFingerprint());
        // Google Drive treats null appProperties values as delete requests for those keys.
        appProperties.putNull("originalName");

        ObjectNode requestBody = objectMapper.createObjectNode()
                .put("name", "stlh-" + newState() + ".stealthsync.enc")
                .put("description", encryptedMetadataDescription(ownerID, metadata.originalName(), metadata.encMethod(), metadata.keyID(), metadata.keyName(), metadata.keyFingerprint()));
        requestBody.set("appProperties", appProperties);

        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId)
                + "?fields=" + encode("id,name,size,createdTime,modifiedTime,description,appProperties"));
        HttpRequest.Builder request = HttpRequest.newBuilder(uri)
                .header("Content-Type", "application/json; charset=UTF-8")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)));
        return sendJson(ownerID, request);
    }

    private boolean hasLegacyPlaintextMetadata(JsonNode file) {
        String name = file.path("name").asText("");
        String originalName = file.path("appProperties").path("originalName").asText("");
        boolean hasEncryptedDescription = file.path("description").asText("").startsWith(METADATA_DESCRIPTION_PREFIX);
        boolean oldNameShape = name.endsWith(".stealthsync.enc") && !name.startsWith("stlh-");
        return !originalName.isBlank() || (!hasEncryptedDescription && oldNameShape);
    }

    private String encryptedMetadataDescription(Long ownerID, String originalName, String encMethod, Long keyID, String keyName, String keyFingerprint) throws IOException {
        var metadata = objectMapper.createObjectNode()
                .put("originalName", originalName)
                .put("encMethod", encMethod)
                .put("metadataVersion", 1);
        if (keyID != null) {
            metadata.put("keyID", keyID);
        }
        if (!isBlank(keyName)) {
            metadata.put("keyName", keyName);
        }
        if (!isBlank(keyFingerprint)) {
            metadata.put("keyFingerprint", keyFingerprint);
        }
        byte[] metadataBytes = objectMapper.writeValueAsBytes(metadata);
        try (InputStream encrypted = aesGcmService.encryptStream(
                new ByteArrayInputStream(metadataBytes),
                userVaultService.metadataPassphraseFor(ownerID),
                256)) {
            return METADATA_DESCRIPTION_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted.readAllBytes());
        } catch (Exception e) {
            throw new IOException("Unable to encrypt Google Drive metadata.", e);
        }
    }

    private DriveFileMetadata readDriveMetadata(Long ownerID, JsonNode file) {
        String description = file.path("description").asText("");
        if (description.startsWith(METADATA_DESCRIPTION_PREFIX)) {
            try {
                byte[] encryptedMetadata = Base64.getUrlDecoder().decode(description.substring(METADATA_DESCRIPTION_PREFIX.length()));
                try (InputStream decrypted = aesGcmService.decryptStream(
                        new ByteArrayInputStream(encryptedMetadata),
                        userVaultService.metadataPassphraseFor(ownerID),
                        256)) {
                    JsonNode metadata = objectMapper.readTree(decrypted.readAllBytes());
                    return new DriveFileMetadata(
                            metadata.path("originalName").asText("decrypted-drive-file"),
                            metadata.path("encMethod").asText(DEFAULT_LEGACY_ENC_METHOD),
                            metadata.hasNonNull("keyID") ? metadata.path("keyID").asLong() : null,
                            textOrNull(metadata, "keyName"),
                            textOrNull(metadata, "keyFingerprint")
                    );
                }
            } catch (Exception ignored) {
                // Fall back to legacy metadata so one unreadable entry does not break the file list.
            }
        }
        DriveFileMetadata fallback = legacyFileMetadata(file);
        JsonNode appProperties = file.path("appProperties");
        Long portableKeyID = appProperties.hasNonNull("keyID") ? Long.valueOf(appProperties.path("keyID").asLong()) : fallback.keyID();
        String portableFingerprint = textOrNull(appProperties, "keyFingerprint");
        return new DriveFileMetadata(
                fallback.originalName(),
                fallback.encMethod(),
                portableKeyID,
                fallback.keyName(),
                isBlank(portableFingerprint) ? fallback.keyFingerprint() : portableFingerprint
        );
    }

    private void writePortableKeyHints(ObjectNode appProperties, Long keyID, String keyFingerprint) {
        if (keyID != null) {
            appProperties.put("keyID", keyID.toString());
        }
        if (!isBlank(keyFingerprint)) {
            appProperties.put("keyFingerprint", keyFingerprint);
        }
    }

    private DriveFileMetadata legacyFileMetadata(JsonNode file) {
        String name = file.path("name").asText("encrypted-file.stealthsync.enc");
        return new DriveFileMetadata(
                file.path("appProperties").path("originalName").asText(stripEncryptedSuffix(name)),
                file.path("appProperties").path("encMethod").asText(DEFAULT_LEGACY_ENC_METHOD),
                null,
                null,
                null
        );
    }

    private JsonNode findFileNode(JsonNode files, String id) {
        for (JsonNode file : files) {
            if (id.equals(file.path("id").asText())) {
                return file;
            }
        }
        throw new IllegalArgumentException("Google Drive returned an invalid file list.");
    }

    private String requiredText(JsonNode node, String field) {
        String value = textOrNull(node, field);
        if (isBlank(value)) {
            throw new IllegalArgumentException("Google response did not include " + field + ".");
        }
        return value;
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private Instant parseInstant(String value) {
        return isBlank(value) ? null : Instant.parse(value);
    }

    private String stripEncryptedSuffix(String name) {
        String suffix = ".stealthsync.enc";
        return name.endsWith(suffix) ? name.substring(0, name.length() - suffix.length()) : name;
    }

    private String newState() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String encodePath(String value) {
        return encode(value).replace("+", "%20");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void writeUtf8(ByteArrayOutputStream output, String value) throws IOException {
        output.write(value.getBytes(StandardCharsets.UTF_8));
    }

    private String encryptToken(GoogleDriveCredential credential, String token) {
        return Encryptors.text(clientSecret, credential.getTokenSalt()).encrypt(token);
    }

    private String decryptToken(GoogleDriveCredential credential, String encryptedToken) {
        if (isBlank(encryptedToken)) {
            return null;
        }
        if (isBlank(credential.getTokenSalt())) {
            return encryptedToken;
        }
        return Encryptors.text(clientSecret, credential.getTokenSalt()).decrypt(encryptedToken);
    }

    private record DriveFileMetadata(String originalName, String encMethod, Long keyID, String keyName, String keyFingerprint) {
    }

    public record DownloadedDriveFile(String originalName, String encMethod, Long keyID, String keyName, String keyFingerprint, byte[] encryptedContent) {
    }
}
