package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudProviderCredential;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.repository.CloudProviderCredentialRepository;
import com.stealthsync.security.OAuthStateService;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
/** Real Dropbox adapter for OAuth and encrypted object upload/download. */
public class DropboxService implements CloudStorageAdapter {

    private static final String AUTHORIZATION_ENDPOINT = "https://www.dropbox.com/oauth2/authorize";
    private static final String TOKEN_ENDPOINT = "https://api.dropboxapi.com/oauth2/token";
    private static final String ACCOUNT_ENDPOINT = "https://api.dropboxapi.com/2/users/get_current_account";
    private static final String LIST_FOLDER_ENDPOINT = "https://api.dropboxapi.com/2/files/list_folder";
    private static final String CREATE_FOLDER_ENDPOINT = "https://api.dropboxapi.com/2/files/create_folder_v2";
    private static final String UPLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/upload";
    private static final String DOWNLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/download";
    private static final String DELETE_ENDPOINT = "https://api.dropboxapi.com/2/files/delete_v2";
    private static final String APP_FOLDER = "/StealthSync";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CloudProviderCredentialRepository credentialRepository;
    private final AppDataService dataStore;
    private final ObjectMapper objectMapper;
    private final CloudFileMetadataCodec metadataCodec;
    private final EncryptedEnvelopeV2Inspector envelopeInspector;
    private final OAuthStateService oauthStateService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Value("${stealthsync.dropbox.client-id:}")
    private String clientId;

    @Value("${stealthsync.dropbox.client-secret:}")
    private String clientSecret;

    @Value("${stealthsync.dropbox.redirect-uri:}")
    private String redirectUri;

    @Override
    public String providerKey() {
        return "dropbox";
    }

    @Override
    public String providerPath() {
        return "dropbox";
    }

    @Override
    public String providerLabel() {
        return "Dropbox";
    }

    @Override
    public boolean isConfigured() {
        return !isBlank(clientId) && !isBlank(clientSecret) && !isBlank(redirectUri);
    }

    @Override
    public boolean isConnected(Long ownerID) {
        return ownerID != null
                && credentialRepository.findByProviderIgnoreCaseAndOwnerID(providerKey(), ownerID).isPresent()
                && dataStore.listCloudStorageLinks(ownerID).stream()
                .anyMatch(link -> providerKey().equalsIgnoreCase(link.getProvider())
                        && "connected".equalsIgnoreCase(link.getStatus()));
    }

    @Override
    public String createAuthorizationUrl(Long ownerID, String deviceIdentifierHash) {
        requireConfigured();
        if (ownerID == null) {
            throw new IllegalArgumentException("A user is required to link Dropbox.");
        }
        String state = oauthStateService.issue(ownerID, providerKey(), deviceIdentifierHash);
        return AUTHORIZATION_ENDPOINT
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&token_access_type=offline"
                + "&state=" + encode(state);
    }

    @Override
    @Transactional
    public CloudStorageLink completeAuthorization(String code, String state) throws Exception {
        requireConfigured();
        OAuthStateService.OAuthState oauthState = oauthStateService.consume(state, providerKey());
        if (isBlank(code)) {
            throw new IllegalArgumentException("Dropbox did not return an authorization code.");
        }

        JsonNode tokenResponse = postForm(TOKEN_ENDPOINT, Map.of(
                "code", code,
                "client_id", clientId,
                "client_secret", clientSecret,
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code"
        ));
        String accessToken = requiredText(tokenResponse, "access_token");
        String refreshToken = textOrNull(tokenResponse, "refresh_token");
        long expiresIn = tokenResponse.path("expires_in").asLong(14400);

        String accountEmail = fetchAccountEmail(accessToken);
        CloudProviderCredential credential = credentialRepository
                .findByProviderIgnoreCaseAndOwnerID(providerKey(), oauthState.ownerID())
                .orElseGet(CloudProviderCredential::new);
        credential.setProvider(providerKey());
        credential.setOwnerID(oauthState.ownerID());
        credential.setAccountEmail(accountEmail);
        if (isBlank(credential.getTokenSalt())) {
            credential.setTokenSalt(KeyGenerators.string().generateKey());
        }
        credential.setAccessToken(encryptToken(credential, accessToken));
        if (!isBlank(refreshToken)) {
            credential.setRefreshToken(encryptToken(credential, refreshToken));
        }
        credential.setExpiresAt(Instant.now().plusSeconds(expiresIn));
        credentialRepository.save(credential);

        return dataStore.linkCloudProvider(providerKey(), oauthState.ownerID(), accountEmail);
    }

    @Override
    public List<CloudFileDTO> listEncryptedFilesForProvider(Long ownerID) throws Exception {
        JsonNode response = listFolder(ownerID);
        List<CloudFileDTO> files = new ArrayList<>();
        for (JsonNode entry : response.path("entries")) {
            String entryName = entry.path("name").asText("");
            if (!"file".equals(entry.path(".tag").asText())
                    || (!entryName.endsWith(".stealthsync.enc") && !entryName.endsWith(".ssenc"))) {
                continue;
            }
            String fileId = entry.path("id").asText(entry.path("path_lower").asText());
            try {
                byte[] packagedBytes = downloadRaw(ownerID, fileId);
                if (entryName.endsWith(".ssenc")) {
                    EncryptedEnvelopeV2Inspector.EnvelopeHeader header = envelopeInspector.inspect(packagedBytes);
                    files.add(toV2FileDTO(entry, header, packagedBytes.length));
                    continue;
                }
                CloudFileMetadataCodec.PackagedCloudFile packaged =
                        metadataCodec.unpack(ownerID, entry.path("name").asText("encrypted-file.stealthsync.enc"), packagedBytes);
                files.add(toFileDTO(entry, packaged.metadata(), packaged.encryptedContent().length));
            } catch (Exception exception) {
                log.warn("Skipping unreadable Dropbox encrypted file {}", fileId, exception);
            }
        }
        return files;
    }

    @Override
    public CloudFileDTO uploadEncryptedForProvider(Long ownerID, CloudUploadMetadata metadata, InputStream encryptedContent) throws Exception {
        ensureAppFolder(ownerID);
        byte[] encryptedBytes = encryptedContent.readAllBytes();
        byte[] packagedBytes = metadataCodec.packageEncryptedContent(ownerID, metadata, encryptedBytes);
        String remoteName = "stlh-" + newState() + ".stealthsync.enc";
        String remotePath = APP_FOLDER + "/" + remoteName;
        String args = objectMapper.writeValueAsString(Map.of(
                "path", remotePath,
                "mode", "add",
                "autorename", true,
                "mute", false,
                "strict_conflict", false
        ));

        HttpRequest request = HttpRequest.newBuilder(URI.create(UPLOAD_ENDPOINT))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + validAccessToken(credential(ownerID), false))
                .header("Content-Type", "application/octet-stream")
                .header("Dropbox-API-Arg", args)
                .POST(HttpRequest.BodyPublishers.ofByteArray(packagedBytes))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 401) {
            request = HttpRequest.newBuilder(URI.create(UPLOAD_ENDPOINT))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Authorization", "Bearer " + validAccessToken(credential(ownerID), true))
                    .header("Content-Type", "application/octet-stream")
                    .header("Dropbox-API-Arg", args)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(packagedBytes))
                    .build();
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        }
        ensureSuccess(response.statusCode(), response.body(), "Dropbox upload");
        return toFileDTO(objectMapper.readTree(response.body()), metadata, encryptedBytes.length);
    }

    @Override
    public DownloadedCloudFile downloadEncryptedForProvider(Long ownerID, String fileId) throws Exception {
        byte[] packagedBytes = downloadRaw(ownerID, fileId);
        CloudFileMetadataCodec.PackagedCloudFile packaged =
                metadataCodec.unpack(ownerID, "encrypted-file.stealthsync.enc", packagedBytes);
        CloudUploadMetadata metadata = packaged.metadata();
        return new DownloadedCloudFile(
                metadata.originalName(),
                metadata.encMethod(),
                metadata.keyID(),
                metadata.keyName(),
                metadata.keyFingerprint(),
                packaged.encryptedContent()
        );
    }

    @Override
    public CloudFileDTO uploadCiphertextForProvider(
            Long ownerID,
            CiphertextUploadMetadata metadata,
            InputStream ciphertext) throws Exception {
        ensureAppFolder(ownerID);
        byte[] ciphertextBytes = ciphertext.readAllBytes();
        JsonNode uploaded = uploadRaw(ownerID, APP_FOLDER + "/" + metadata.objectName(), ciphertextBytes);
        return new CloudFileDTO(
                providerKey(),
                uploaded.path("id").asText(uploaded.path("path_lower").asText()),
                uploaded.path("name").asText(metadata.objectName()),
                null,
                ciphertextBytes.length,
                parseInstant(uploaded.path("server_modified").asText(null)),
                parseInstant(uploaded.path("server_modified").asText(null)),
                metadata.algorithm(),
                null,
                null,
                metadata.keyFingerprint(),
                metadata.envelopeVersion(),
                metadata.encryptedMetadata()
        );
    }

    @Override
    public DownloadedCiphertext downloadCiphertextForProvider(Long ownerID, String fileId) throws Exception {
        byte[] ciphertext = downloadRaw(ownerID, fileId);
        envelopeInspector.inspect(ciphertext);
        return new DownloadedCiphertext("encrypted.ssenc", ciphertext);
    }

    @Override
    public void deleteEncryptedFileForProvider(Long ownerID, String fileId) throws Exception {
        sendJson(ownerID, DELETE_ENDPOINT, objectMapper.createObjectNode().put("path", fileId), "Dropbox delete");
    }

    @Override
    @Transactional
    public void disconnect(Long ownerID) {
        if (ownerID != null) {
            credentialRepository.deleteByProviderIgnoreCaseAndOwnerID(providerKey(), ownerID);
        }
    }

    private JsonNode listFolder(Long ownerID) throws Exception {
        var body = objectMapper.createObjectNode()
                .put("path", APP_FOLDER)
                .put("recursive", false)
                .put("include_deleted", false);
        HttpResponse<String> response = sendRaw(ownerID, LIST_FOLDER_ENDPOINT, body);
        if (response.statusCode() == 409 && response.body() != null && response.body().contains("not_found")) {
            var empty = objectMapper.createObjectNode();
            empty.putArray("entries");
            return empty;
        }
        ensureSuccess(response.statusCode(), response.body(), "Dropbox list");
        return objectMapper.readTree(response.body());
    }

    private void ensureAppFolder(Long ownerID) throws Exception {
        var body = objectMapper.createObjectNode()
                .put("path", APP_FOLDER)
                .put("autorename", false);
        HttpResponse<String> response = sendRaw(ownerID, CREATE_FOLDER_ENDPOINT, body);
        if (response.statusCode() == 409) {
            return;
        }
        ensureSuccess(response.statusCode(), response.body(), "Dropbox create folder");
    }

    private JsonNode sendJson(Long ownerID, String endpoint, JsonNode body, String operation) throws Exception {
        HttpResponse<String> response = sendRaw(ownerID, endpoint, body);
        ensureSuccess(response.statusCode(), response.body(), operation);
        return objectMapper.readTree(response.body());
    }

    private JsonNode uploadRaw(Long ownerID, String remotePath, byte[] content) throws Exception {
        String args = objectMapper.writeValueAsString(Map.of(
                "path", remotePath,
                "mode", "add",
                "autorename", true,
                "mute", false,
                "strict_conflict", false
        ));
        CloudProviderCredential credential = credential(ownerID);
        HttpRequest request = uploadRequest(validAccessToken(credential, false), args, content);
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 401) {
            request = uploadRequest(validAccessToken(credential, true), args, content);
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        }
        ensureSuccess(response.statusCode(), response.body(), "Dropbox upload");
        return objectMapper.readTree(response.body());
    }

    private HttpRequest uploadRequest(String token, String args, byte[] content) {
        return HttpRequest.newBuilder(URI.create(UPLOAD_ENDPOINT))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/octet-stream")
                .header("Dropbox-API-Arg", args)
                .POST(HttpRequest.BodyPublishers.ofByteArray(content))
                .build();
    }

    private HttpResponse<String> sendRaw(Long ownerID, String endpoint, JsonNode body) throws Exception {
        CloudProviderCredential credential = credential(ownerID);
        String token = validAccessToken(credential, false);
        HttpRequest request = jsonRequest(endpoint, token, body);
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 401) {
            request = jsonRequest(endpoint, validAccessToken(credential, true), body);
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        }
        return response;
    }

    private HttpRequest jsonRequest(String endpoint, String token, JsonNode body) throws Exception {
        return HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
    }

    private byte[] downloadRaw(Long ownerID, String fileId) throws Exception {
        String args = objectMapper.writeValueAsString(Map.of("path", fileId));
        CloudProviderCredential credential = credential(ownerID);
        HttpRequest request = downloadRequest(validAccessToken(credential, false), args);
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() == 401) {
            request = downloadRequest(validAccessToken(credential, true), args);
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        }
        ensureSuccess(response.statusCode(), new String(response.body(), StandardCharsets.UTF_8), "Dropbox download");
        return response.body();
    }

    private HttpRequest downloadRequest(String token, String args) {
        return HttpRequest.newBuilder(URI.create(DOWNLOAD_ENDPOINT))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + token)
                .header("Dropbox-API-Arg", args)
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
    }

    private String fetchAccountEmail(String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(ACCOUNT_ENDPOINT))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("null"))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response.statusCode(), response.body(), "Dropbox account lookup");
        return requiredText(objectMapper.readTree(response.body()), "email");
    }

    private synchronized String validAccessToken(CloudProviderCredential credential, boolean forceRefresh) throws Exception {
        if (!forceRefresh && credential.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return decryptToken(credential, credential.getAccessToken());
        }
        if (isBlank(credential.getRefreshToken())) {
            throw new IllegalArgumentException("Dropbox refresh token is missing. Reconnect Dropbox.");
        }
        JsonNode response = postForm(TOKEN_ENDPOINT, Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "refresh_token", decryptToken(credential, credential.getRefreshToken()),
                "grant_type", "refresh_token"
        ));
        String accessToken = requiredText(response, "access_token");
        String rotatedRefreshToken = textOrNull(response, "refresh_token");
        credential.setAccessToken(encryptToken(credential, accessToken));
        if (!isBlank(rotatedRefreshToken)) {
            credential.setRefreshToken(encryptToken(credential, rotatedRefreshToken));
        }
        credential.setExpiresAt(Instant.now().plusSeconds(response.path("expires_in").asLong(14400)));
        credentialRepository.save(credential);
        return accessToken;
    }

    private JsonNode postForm(String endpoint, Map<String, String> values) throws Exception {
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
        ensureSuccess(response.statusCode(), response.body(), providerLabel() + " token request");
        return objectMapper.readTree(response.body());
    }

    private CloudProviderCredential credential(Long ownerID) {
        requireConfigured();
        return credentialRepository.findByProviderIgnoreCaseAndOwnerID(providerKey(), ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Dropbox is not connected for this user."));
    }

    private CloudFileDTO toFileDTO(JsonNode entry, CloudUploadMetadata metadata, long encryptedSize) {
        return new CloudFileDTO(
                providerKey(),
                entry.path("id").asText(entry.path("path_lower").asText()),
                entry.path("name").asText("encrypted-file.stealthsync.enc"),
                metadata.originalName(),
                encryptedSize,
                parseInstant(entry.path("server_modified").asText(null)),
                parseInstant(entry.path("server_modified").asText(null)),
                metadata.encMethod(),
                metadata.keyID(),
                metadata.keyName(),
                metadata.keyFingerprint()
        );
    }

    private CloudFileDTO toV2FileDTO(
            JsonNode entry,
            EncryptedEnvelopeV2Inspector.EnvelopeHeader header,
            long ciphertextSize) {
        return new CloudFileDTO(
                providerKey(),
                entry.path("id").asText(entry.path("path_lower").asText()),
                entry.path("name").asText("encrypted.ssenc"),
                null,
                ciphertextSize,
                parseInstant(entry.path("server_modified").asText(null)),
                parseInstant(entry.path("server_modified").asText(null)),
                header.algorithm(),
                null,
                null,
                header.keyFingerprint(),
                header.version(),
                header.encryptedMetadata()
        );
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalArgumentException(
                    "Dropbox integration is not configured. Set DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET, and DROPBOX_REDIRECT_URI."
            );
        }
    }

    private void ensureSuccess(int statusCode, String responseBody, String operation) {
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalArgumentException(operation + " failed (HTTP " + statusCode + "): " + responseBody);
        }
    }

    private String requiredText(JsonNode node, String field) {
        String value = textOrNull(node, field);
        if (isBlank(value)) {
            throw new IllegalArgumentException("Dropbox response did not include " + field + ".");
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

    private String encryptToken(CloudProviderCredential credential, String token) {
        return Encryptors.text(clientSecret, credential.getTokenSalt()).encrypt(token);
    }

    private String decryptToken(CloudProviderCredential credential, String encryptedToken) {
        if (isBlank(encryptedToken)) {
            return null;
        }
        return Encryptors.text(clientSecret, credential.getTokenSalt()).decrypt(encryptedToken);
    }

    private String newState() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

}
