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
/** Microsoft Graph based OneDrive adapter for encrypted object upload/download. */
public class OneDriveService implements CloudStorageAdapter {

    private static final String GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
    private static final String TOKEN_PATH = "/oauth2/v2.0/token";
    private static final String AUTHORIZE_PATH = "/oauth2/v2.0/authorize";
    private static final String APP_FOLDER = "StealthSync";
    private static final String SCOPES = "offline_access User.Read Files.ReadWrite";
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

    @Value("${stealthsync.onedrive.client-id:}")
    private String clientId;

    @Value("${stealthsync.onedrive.client-secret:}")
    private String clientSecret;

    @Value("${stealthsync.token-encryption-secret:}")
    private String tokenEncryptionSecret;

    @Value("${stealthsync.onedrive.redirect-uri:}")
    private String redirectUri;

    @Value("${stealthsync.onedrive.tenant:common}")
    private String tenant;

    @Override
    public String providerKey() {
        return "onedrive";
    }

    @Override
    public String providerPath() {
        return "onedrive";
    }

    @Override
    public String providerLabel() {
        return "OneDrive";
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
            throw new IllegalArgumentException("A user is required to link OneDrive.");
        }
        String state = oauthStateService.issue(ownerID, providerKey(), deviceIdentifierHash);
        return microsoftBaseUrl() + AUTHORIZE_PATH
                + "?client_id=" + encode(clientId)
                + "&response_type=code"
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_mode=query"
                + "&scope=" + encode(SCOPES)
                + "&state=" + encode(state);
    }

    @Override
    @Transactional
    public CloudStorageLink completeAuthorization(String code, String state) throws Exception {
        requireConfigured();
        OAuthStateService.OAuthState oauthState = oauthStateService.consume(state, providerKey());
        if (isBlank(code)) {
            throw new IllegalArgumentException("OneDrive did not return an authorization code.");
        }

        JsonNode tokenResponse = postForm(tokenEndpoint(), Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "code", code,
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code"
        ));
        String accessToken = requiredText(tokenResponse, "access_token");
        String refreshToken = textOrNull(tokenResponse, "refresh_token");
        long expiresIn = tokenResponse.path("expires_in").asLong(3600);

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
        HttpResponse<String> response = sendRaw(ownerID, HttpRequest.newBuilder(
                URI.create(GRAPH_ROOT + "/me/drive/root:/" + encodePath(APP_FOLDER) + ":/children"
                        + "?$select=id,name,size,createdDateTime,lastModifiedDateTime,file"))
                .GET());
        if (response.statusCode() == 404) {
            return List.of();
        }
        ensureSuccess(response.statusCode(), response.body(), "OneDrive list");

        List<CloudFileDTO> files = new ArrayList<>();
        for (JsonNode entry : objectMapper.readTree(response.body()).path("value")) {
            String entryName = entry.path("name").asText("");
            if (!entry.hasNonNull("file")
                    || (!entryName.endsWith(".stealthsync.enc") && !entryName.endsWith(".ssenc"))) {
                continue;
            }
            try {
                byte[] packagedBytes = downloadRaw(ownerID, entry.path("id").asText());
                if (entryName.endsWith(".ssenc")) {
                    EncryptedEnvelopeV2Inspector.EnvelopeHeader header = envelopeInspector.inspect(packagedBytes);
                    files.add(toV2FileDTO(entry, header, packagedBytes.length));
                    continue;
                }
                CloudFileMetadataCodec.PackagedCloudFile packaged =
                        metadataCodec.unpack(ownerID, entry.path("name").asText("encrypted-file.stealthsync.enc"), packagedBytes);
                files.add(toFileDTO(entry, packaged.metadata(), packaged.encryptedContent().length));
            } catch (Exception exception) {
                log.warn("Skipping unreadable OneDrive encrypted file {}", entry.path("id").asText(), exception);
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
        String uploadUrl = GRAPH_ROOT + "/me/drive/root:/" + encodePath(APP_FOLDER) + "/" + encodePath(remoteName) + ":/content";
        HttpResponse<String> response = sendRaw(ownerID, HttpRequest.newBuilder(URI.create(uploadUrl))
                .header("Content-Type", "application/octet-stream")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(packagedBytes)));
        ensureSuccess(response.statusCode(), response.body(), "OneDrive upload");
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
        String uploadUrl = GRAPH_ROOT + "/me/drive/root:/" + encodePath(APP_FOLDER)
                + "/" + encodePath(metadata.objectName()) + ":/content";
        HttpResponse<String> response = sendRaw(ownerID, HttpRequest.newBuilder(URI.create(uploadUrl))
                .header("Content-Type", "application/vnd.stealthsync.encrypted")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(ciphertextBytes)));
        ensureSuccess(response.statusCode(), response.body(), "OneDrive V2 upload");
        JsonNode uploaded = objectMapper.readTree(response.body());
        return new CloudFileDTO(
                providerKey(),
                uploaded.path("id").asText(),
                uploaded.path("name").asText(metadata.objectName()),
                null,
                ciphertextBytes.length,
                parseInstant(uploaded.path("createdDateTime").asText(null)),
                parseInstant(uploaded.path("lastModifiedDateTime").asText(null)),
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
        HttpResponse<String> response = sendRaw(ownerID, HttpRequest.newBuilder(
                URI.create(GRAPH_ROOT + "/me/drive/items/" + encodePath(fileId))).DELETE());
        ensureSuccess(response.statusCode(), response.body(), "OneDrive delete");
    }

    @Override
    @Transactional
    public void disconnect(Long ownerID) {
        if (ownerID != null) {
            credentialRepository.deleteByProviderIgnoreCaseAndOwnerID(providerKey(), ownerID);
        }
    }

    private void ensureAppFolder(Long ownerID) throws Exception {
        var body = objectMapper.createObjectNode()
                .put("name", APP_FOLDER)
                .put("@microsoft.graph.conflictBehavior", "fail");
        body.set("folder", objectMapper.createObjectNode());
        HttpResponse<String> response = sendRaw(ownerID, HttpRequest.newBuilder(URI.create(GRAPH_ROOT + "/me/drive/root/children"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body))));
        if (response.statusCode() == 409) {
            return;
        }
        ensureSuccess(response.statusCode(), response.body(), "OneDrive create folder");
    }

    private byte[] downloadRaw(Long ownerID, String fileId) throws Exception {
        HttpResponse<byte[]> response = sendBytes(ownerID, HttpRequest.newBuilder(
                URI.create(GRAPH_ROOT + "/me/drive/items/" + encodePath(fileId) + "/content")).GET());
        ensureSuccess(response.statusCode(), new String(response.body(), StandardCharsets.UTF_8), "OneDrive download");
        return response.body();
    }

    private HttpResponse<String> sendRaw(Long ownerID, HttpRequest.Builder requestBuilder) throws Exception {
        CloudProviderCredential credential = credential(ownerID);
        HttpResponse<String> response = httpClient.send(
                requestBuilder.timeout(REQUEST_TIMEOUT)
                        .header("Authorization", "Bearer " + validAccessToken(credential, false))
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        );
        if (response.statusCode() == 401) {
            response = httpClient.send(
                    requestBuilder.timeout(REQUEST_TIMEOUT)
                            .setHeader("Authorization", "Bearer " + validAccessToken(credential, true))
                            .build(),
                    HttpResponse.BodyHandlers.ofString()
            );
        }
        return response;
    }

    private HttpResponse<byte[]> sendBytes(Long ownerID, HttpRequest.Builder requestBuilder) throws Exception {
        CloudProviderCredential credential = credential(ownerID);
        HttpResponse<byte[]> response = httpClient.send(
                requestBuilder.timeout(REQUEST_TIMEOUT)
                        .header("Authorization", "Bearer " + validAccessToken(credential, false))
                        .build(),
                HttpResponse.BodyHandlers.ofByteArray()
        );
        if (response.statusCode() == 401) {
            response = httpClient.send(
                    requestBuilder.timeout(REQUEST_TIMEOUT)
                            .setHeader("Authorization", "Bearer " + validAccessToken(credential, true))
                            .build(),
                    HttpResponse.BodyHandlers.ofByteArray()
            );
        }
        return response;
    }

    private String fetchAccountEmail(String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(GRAPH_ROOT + "/me?$select=mail,userPrincipalName"))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response.statusCode(), response.body(), "OneDrive account lookup");
        JsonNode account = objectMapper.readTree(response.body());
        String mail = textOrNull(account, "mail");
        return isBlank(mail) ? requiredText(account, "userPrincipalName") : mail;
    }

    private synchronized String validAccessToken(CloudProviderCredential credential, boolean forceRefresh) throws Exception {
        if (!forceRefresh && credential.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return decryptToken(credential, credential.getAccessToken());
        }
        if (isBlank(credential.getRefreshToken())) {
            throw new IllegalArgumentException("OneDrive refresh token is missing. Reconnect OneDrive.");
        }
        JsonNode response = postForm(tokenEndpoint(), Map.of(
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
        credential.setExpiresAt(Instant.now().plusSeconds(response.path("expires_in").asLong(3600)));
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
                .orElseThrow(() -> new IllegalArgumentException("OneDrive is not connected for this user."));
    }

    private CloudFileDTO toFileDTO(JsonNode entry, CloudUploadMetadata metadata, long encryptedSize) {
        return new CloudFileDTO(
                providerKey(),
                entry.path("id").asText(),
                entry.path("name").asText("encrypted-file.stealthsync.enc"),
                metadata.originalName(),
                encryptedSize,
                parseInstant(entry.path("createdDateTime").asText(null)),
                parseInstant(entry.path("lastModifiedDateTime").asText(null)),
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
                entry.path("id").asText(),
                entry.path("name").asText("encrypted.ssenc"),
                null,
                ciphertextSize,
                parseInstant(entry.path("createdDateTime").asText(null)),
                parseInstant(entry.path("lastModifiedDateTime").asText(null)),
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
                    "OneDrive integration is not configured. Set ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, and ONEDRIVE_REDIRECT_URI."
            );
        }
    }

    private void ensureSuccess(int statusCode, String responseBody, String operation) {
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalArgumentException(operation + " failed (HTTP " + statusCode + "): " + responseBody);
        }
    }

    private String tokenEndpoint() {
        return microsoftBaseUrl() + TOKEN_PATH;
    }

    private String microsoftBaseUrl() {
        return "https://login.microsoftonline.com/" + encodePath(isBlank(tenant) ? "common" : tenant);
    }

    private String requiredText(JsonNode node, String field) {
        String value = textOrNull(node, field);
        if (isBlank(value)) {
            throw new IllegalArgumentException("OneDrive response did not include " + field + ".");
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
        return OAuthTokenEncryption.encrypt(
                token,
                credential.getTokenSalt(),
                tokenEncryptionSecret,
                clientSecret
        );
    }

    private String decryptToken(CloudProviderCredential credential, String encryptedToken) {
        if (isBlank(encryptedToken)) {
            return null;
        }
        return OAuthTokenEncryption.decrypt(
                encryptedToken,
                credential.getTokenSalt(),
                tokenEncryptionSecret,
                clientSecret
        );
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

}
