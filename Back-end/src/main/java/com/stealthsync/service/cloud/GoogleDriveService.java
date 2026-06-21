package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.dto.GoogleDriveFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.GoogleDriveCredential;
import com.stealthsync.repository.GoogleDriveCredentialRepository;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
/**
 * Implements Google OAuth, encrypted credential persistence, token refresh, and Drive file transfer.
 * Access and refresh tokens are encrypted with an installation secret before JPA persistence.
 */
public class GoogleDriveService {

    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USER_INFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
    private static final String DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";
    // Keep the least-privilege scope. The configured demo folder is already
    // accessible to this app, so broader full-Drive authorization is unnecessary.
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    private static final String USER_EMAIL_SCOPE = "openid https://www.googleapis.com/auth/userinfo.email";
    private static final Duration STATE_LIFETIME = Duration.ofMinutes(10);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final GoogleDriveCredentialRepository credentialRepository;
    private final AppDataService dataStore;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final Map<String, PendingAuthorization> pendingAuthorizations = new ConcurrentHashMap<>();

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

    public boolean isConfigured() {
        return !isBlank(clientId) && !isBlank(clientSecret) && !isBlank(redirectUri);
    }

    public boolean isConnected(Long ownerID) {
        return ownerID != null
                && credentialRepository.findByOwnerID(ownerID).isPresent()
                && dataStore.listCloudStorageLinks(ownerID).stream()
                .anyMatch(link -> "google_drive".equalsIgnoreCase(link.getProvider())
                        && "connected".equalsIgnoreCase(link.getStatus()));
    }

    /** Creates a short-lived state token that binds the OAuth callback to one local customer. */
    public String createAuthorizationUrl(Long ownerID) {
        requireConfigured();
        if (ownerID == null) {
            throw new IllegalArgumentException("A user is required to link Google Drive.");
        }

        pendingAuthorizations.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
        String state = newState();
        pendingAuthorizations.put(state, new PendingAuthorization(ownerID, Instant.now().plus(STATE_LIFETIME)));

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

    @Transactional
    /** Exchanges Google's callback code, records the account email, and stores encrypted tokens. */
    public CloudStorageLink completeAuthorization(String code, String state) throws IOException, InterruptedException {
        requireConfigured();
        if (isBlank(state)) {
            throw new IllegalArgumentException("Google Drive authorization did not return a state value.");
        }
        PendingAuthorization pending = pendingAuthorizations.remove(state);
        if (pending == null || pending.expiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Google Drive authorization expired or has an invalid state value.");
        }
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
        String accessToken = requiredText(tokenResponse, "access_token");
        String returnedRefreshToken = textOrNull(tokenResponse, "refresh_token");
        long expiresIn = tokenResponse.path("expires_in").asLong(3600);

        GoogleDriveCredential credential = credentialRepository.findByOwnerID(pending.ownerID())
                .orElseGet(GoogleDriveCredential::new);
        String refreshToken = isBlank(returnedRefreshToken)
                ? decryptToken(credential, credential.getRefreshToken())
                : returnedRefreshToken;
        if (isBlank(refreshToken)) {
            throw new IllegalArgumentException("Google Drive did not provide a refresh token. Revoke the previous app grant and connect again.");
        }

        String accountEmail = fetchAccountEmail(accessToken);
        credential.setOwnerID(pending.ownerID());
        credential.setAccountEmail(accountEmail);
        if (isBlank(credential.getTokenSalt())) {
            credential.setTokenSalt(KeyGenerators.string().generateKey());
        }
        credential.setAccessToken(encryptToken(credential, accessToken));
        credential.setRefreshToken(encryptToken(credential, refreshToken));
        credential.setExpiresAt(Instant.now().plusSeconds(expiresIn));
        credentialRepository.save(credential);

        return dataStore.linkCloudProvider("google_drive", pending.ownerID(), accountEmail);
    }

    public List<GoogleDriveFileDTO> listEncryptedFiles(Long ownerID) throws IOException, InterruptedException {
        String query = "trashed = false and appProperties has { key='stealthsync' and value='encrypted' }";
        if (!isBlank(folderId)) {
            // Drive query syntax requires a quoted parent folder ID.
            query += " and '" + folderId.replace("'", "\\'") + "' in parents";
        }
        URI uri = URI.create(DRIVE_FILES_ENDPOINT
                + "?q=" + encode(query)
                + "&orderBy=modifiedTime%20desc"
                + "&pageSize=100"
                + "&fields=" + encode("files(id,name,size,createdTime,modifiedTime,appProperties)"));
        JsonNode response = sendJson(ownerID, HttpRequest.newBuilder(uri).GET());

        return response.path("files").findValuesAsText("id").stream()
                .map(id -> findFileNode(response.path("files"), id))
                .map(this::toFileDTO)
                .toList();
    }

    public GoogleDriveFileDTO uploadEncrypted(Long ownerID, String originalName, InputStream encryptedContent)
            throws IOException, InterruptedException {
        byte[] encryptedBytes = encryptedContent.readAllBytes();
        String driveName = originalName + ".stealthsync.enc";
        String boundary = "stealthsync-" + newState();

        var metadata = objectMapper.createObjectNode()
                .put("name", driveName)
                .put("mimeType", "application/octet-stream");
        metadata.set("appProperties", objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("originalName", originalName));
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
                + encode("id,name,size,createdTime,modifiedTime,appProperties"));
        HttpRequest.Builder request = HttpRequest.newBuilder(uri)
                .header("Content-Type", "multipart/related; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()));
        return toFileDTO(sendJson(ownerID, request));
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
        JsonNode metadata = fileMetadata(ownerID, fileId);
        String originalName = metadata.path("appProperties").path("originalName")
                .asText(stripEncryptedSuffix(metadata.path("name").asText("decrypted-file")));
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId) + "?alt=media");
        HttpResponse<byte[]> response = send(ownerID, HttpRequest.newBuilder(uri).GET(), HttpResponse.BodyHandlers.ofByteArray());
        return new DownloadedDriveFile(originalName, response.body());
    }

    @Transactional
    public void disconnect(Long ownerID) {
        if (ownerID != null) {
            credentialRepository.deleteByOwnerID(ownerID);
        }
    }

    private JsonNode fileMetadata(Long ownerID, String fileId) throws IOException, InterruptedException {
        URI uri = URI.create(DRIVE_FILES_ENDPOINT + "/" + encodePath(fileId)
                + "?fields=" + encode("id,name,size,createdTime,modifiedTime,appProperties"));
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

    private JsonNode sendJson(Long ownerID, HttpRequest.Builder requestBuilder)
            throws IOException, InterruptedException {
        HttpResponse<String> response = send(ownerID, requestBuilder, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(response.body());
    }

    // Retry one unauthorized request after forcing token refresh; other HTTP failures are surfaced unchanged.
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
        ensureSuccess(response.statusCode(), response.body() == null ? "" : response.body().toString());
        return response;
    }

    // Prevent parallel transfers from racing while replacing an expired access token.
    private synchronized String validAccessToken(GoogleDriveCredential credential, boolean forceRefresh)
            throws IOException, InterruptedException {
        if (!forceRefresh && credential.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return decryptToken(credential, credential.getAccessToken());
        }
        JsonNode response = postForm(TOKEN_ENDPOINT, Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "refresh_token", decryptToken(credential, credential.getRefreshToken()),
                "grant_type", "refresh_token"
        ));
        String accessToken = requiredText(response, "access_token");
        credential.setAccessToken(encryptToken(credential, accessToken));
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

    private GoogleDriveFileDTO toFileDTO(JsonNode file) {
        String name = file.path("name").asText("encrypted-file.stealthsync.enc");
        return new GoogleDriveFileDTO(
                file.path("id").asText(),
                name,
                file.path("appProperties").path("originalName").asText(stripEncryptedSuffix(name)),
                file.path("size").asLong(0),
                parseInstant(file.path("createdTime").asText(null)),
                parseInstant(file.path("modifiedTime").asText(null))
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

    private record PendingAuthorization(Long ownerID, Instant expiresAt) {
    }

    public record DownloadedDriveFile(String originalName, byte[] encryptedContent) {
    }
}
