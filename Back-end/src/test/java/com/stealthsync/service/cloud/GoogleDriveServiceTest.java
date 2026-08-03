package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.stealthsync.repository.GoogleDriveCredentialRepository;
import com.stealthsync.security.OAuthStateService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.KeyManagementService;
import com.stealthsync.service.crypto.UserVaultService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleDriveServiceTest {

    @Test
    void createsAuthorizationUrlWithOfflineDriveFileAccessAndState() {
        GoogleDriveService service = service();
        ReflectionTestUtils.setField(service, "clientId", "client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/cloud-storage/oauth/google/callback");
        // Verify that an optional account hint is encoded without changing OAuth security.
        ReflectionTestUtils.setField(service, "loginHint", "demo@example.com");

        URI authorizationUri = URI.create(service.createAuthorizationUrl(7L, "device-hash"));
        String query = authorizationUri.getRawQuery();

        assertEquals("accounts.google.com", authorizationUri.getHost());
        assertTrue(query.contains("access_type=offline"));
        assertTrue(query.contains("drive.file"));
        assertTrue(query.contains("login_hint=demo%40example.com"));
        assertTrue(query.contains("state="));
        assertTrue(query.contains("redirect_uri=http%3A%2F%2Flocalhost%3A8080"));
    }

    @Test
    void rejectsAuthorizationWhenOAuthCredentialsAreMissing() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service().createAuthorizationUrl(7L, "device-hash")
        );

        assertTrue(error.getMessage().contains("GOOGLE_DRIVE_CLIENT_ID"));
    }

    @Test
    void accountSwitchCannotReuseThePreviousGoogleAccountsRefreshToken() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                ReflectionTestUtils.invokeMethod(
                        service(),
                        "selectRefreshTokenForAuthorization",
                        null,
                        "old-account-refresh-token",
                        "first@example.com",
                        "second@example.com"));

        assertTrue(error.getMessage().contains("newly selected account"));
    }

    @Test
    void reconnectingTheSameGoogleAccountCanReuseItsRefreshToken() {
        String refreshToken = ReflectionTestUtils.invokeMethod(
                service(),
                "selectRefreshTokenForAuthorization",
                null,
                "same-account-refresh-token",
                "demo@example.com",
                "DEMO@example.com");

        assertEquals("same-account-refresh-token", refreshToken);
    }

    @Test
    void rejectsOAuthTokenThatOmitsGoogleDriveFileScope() throws Exception {
        JsonNode tokenResponse = new ObjectMapper().readTree("""
                {
                  "access_token": "identity-only-token",
                  "scope": "openid https://www.googleapis.com/auth/userinfo.email"
                }
                """);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                ReflectionTestUtils.invokeMethod(service(), "requireGrantedDriveScope", tokenResponse));

        assertTrue(error.getMessage().contains("missing file access"));
    }

    @Test
    void acceptsOAuthTokenWithLeastPrivilegeGoogleDriveFileScope() throws Exception {
        JsonNode tokenResponse = new ObjectMapper().readTree("""
                {
                  "access_token": "drive-token",
                  "scope": "openid https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email"
                }
                """);

        ReflectionTestUtils.invokeMethod(service(), "requireGrantedDriveScope", tokenResponse);
    }

    @Test
    void recognizesGoogleInsufficientScopeAndExpiredGrantResponses() {
        GoogleDriveService service = service();

        Boolean insufficientScope = ReflectionTestUtils.invokeMethod(
                service,
                "isInsufficientDriveScope",
                403,
                "{\"status\":\"PERMISSION_DENIED\",\"reason\":\"ACCESS_TOKEN_SCOPE_INSUFFICIENT\"}");
        Boolean invalidGrant = ReflectionTestUtils.invokeMethod(
                service,
                "isInvalidGrant",
                "Google Drive request failed (HTTP 400): {\"error\":\"invalid_grant\"}");

        assertTrue(Boolean.TRUE.equals(insufficientScope));
        assertTrue(Boolean.TRUE.equals(invalidGrant));
    }

    @Test
    void expiringGoogleAuthorizationDeletesCredentialAndPreservesExpiredLink() {
        GoogleDriveCredentialRepository credentialRepository = mock(GoogleDriveCredentialRepository.class);
        AppDataService dataStore = mock(AppDataService.class);
        GoogleDriveService service = service(credentialRepository, dataStore);

        ReflectionTestUtils.invokeMethod(service, "expireAuthorization", 7L, "test reason");

        verify(credentialRepository).deleteByOwnerID(7L);
        verify(dataStore).expireCloudStorageLink(7L, "google_drive");
    }

    @Test
    void detectsLegacyPlaintextDriveMetadata() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode legacyFile = objectMapper.readTree("""
                {
                  "id": "drive-file-1",
                  "name": "contract.pdf.stealthsync.enc",
                  "appProperties": {
                    "stealthsync": "encrypted",
                    "originalName": "contract.pdf"
                  }
                }
                """);

        Boolean legacy = ReflectionTestUtils.invokeMethod(service(), "hasLegacyPlaintextMetadata", legacyFile);

        assertTrue(Boolean.TRUE.equals(legacy));
    }

    @Test
    void ignoresAlreadyEncryptedDriveMetadata() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode migratedFile = objectMapper.readTree("""
                {
                  "id": "drive-file-2",
                  "name": "stlh-random.stealthsync.enc",
                  "description": "stealthsync-metadata:abc123",
                  "appProperties": {
                    "stealthsync": "encrypted",
                    "metadataVersion": "1",
                    "encMethod": "AES-256-GCM"
                  }
                }
                """);

        Boolean legacy = ReflectionTestUtils.invokeMethod(service(), "hasLegacyPlaintextMetadata", migratedFile);

        assertTrue(Boolean.FALSE.equals(legacy));
    }

    @Test
    void encryptedDriveMetadataHidesOriginalNameAndRestoresKeyDetails() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        UserVaultService userVaultService = mock(UserVaultService.class);
        when(userVaultService.metadataPassphraseFor(7L)).thenReturn("metadata-passphrase");
        GoogleDriveService service = service(userVaultService, new AesGcmService(new KeyManagementService()), objectMapper);

        String description = ReflectionTestUtils.invokeMethod(
                service,
                "encryptedMetadataDescription",
                7L,
                "contract.pdf",
                "AES-256-GCM",
                44L,
                "Drive Key",
                "ABCD1234"
        );

        assertTrue(description.startsWith("stealthsync-metadata:"));
        assertFalse(description.contains("contract.pdf"));
        assertFalse(description.contains("Drive Key"));

        ObjectNode file = objectMapper.createObjectNode()
                .put("id", "drive-file-3")
                .put("name", "stlh-random.stealthsync.enc")
                .put("description", description);
        file.set("appProperties", objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", "1")
                .put("encMethod", "AES-256-GCM"));

        Object metadata = ReflectionTestUtils.invokeMethod(service, "readDriveMetadata", 7L, file);

        assertEquals("contract.pdf", ReflectionTestUtils.invokeMethod(metadata, "originalName"));
        assertEquals("AES-256-GCM", ReflectionTestUtils.invokeMethod(metadata, "encMethod"));
        assertEquals(Long.valueOf(44L), ReflectionTestUtils.invokeMethod(metadata, "keyID"));
        assertEquals("Drive Key", ReflectionTestUtils.invokeMethod(metadata, "keyName"));
        assertEquals("ABCD1234", ReflectionTestUtils.invokeMethod(metadata, "keyFingerprint"));
    }

    @Test
    void unreadableEncryptedMetadataStillReturnsPortableKeyHints() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        ObjectNode file = objectMapper.createObjectNode()
                .put("id", "drive-file-4")
                .put("name", "stlh-random.stealthsync.enc")
                .put("description", "stealthsync-metadata:not-readable-on-this-device");
        file.set("appProperties", objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", "1")
                .put("encMethod", "AES-256-GCM")
                .put("keyID", 44L)
                .put("keyFingerprint", "ABCD1234"));

        Object metadata = ReflectionTestUtils.invokeMethod(service(), "readDriveMetadata", 7L, file);

        assertEquals(Long.valueOf(44L), ReflectionTestUtils.invokeMethod(metadata, "keyID"));
        assertEquals("ABCD1234", ReflectionTestUtils.invokeMethod(metadata, "keyFingerprint"));
    }

    @Test
    void unreadableEncryptedMetadataWithoutKeyHintsFallsBackToLegacyMetadata() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        ObjectNode file = objectMapper.createObjectNode()
                .put("id", "drive-file-5")
                .put("name", "legacy-upload.stealthsync.enc")
                .put("description", "stealthsync-metadata:not-readable-on-this-device");
        file.set("appProperties", objectMapper.createObjectNode()
                .put("stealthsync", "encrypted")
                .put("metadataVersion", "1")
                .put("encMethod", "AES-256-GCM"));

        Object metadata = ReflectionTestUtils.invokeMethod(service(), "readDriveMetadata", 7L, file);

        assertEquals("legacy-upload", ReflectionTestUtils.invokeMethod(metadata, "originalName"));
        assertEquals("AES-256-GCM", ReflectionTestUtils.invokeMethod(metadata, "encMethod"));
        assertNull(ReflectionTestUtils.invokeMethod(metadata, "keyID"));
    }

    private GoogleDriveService service() {
        return service(mock(UserVaultService.class), mock(AesGcmService.class), new ObjectMapper());
    }

    private GoogleDriveService service(
            GoogleDriveCredentialRepository credentialRepository,
            AppDataService dataStore) {
        OAuthStateService oauthStateService = mock(OAuthStateService.class);
        return new GoogleDriveService(
                credentialRepository,
                dataStore,
                mock(UserVaultService.class),
                mock(AesGcmService.class),
                new ObjectMapper(),
                oauthStateService
        );
    }

    private GoogleDriveService service(UserVaultService userVaultService, AesGcmService aesGcmService, ObjectMapper objectMapper) {
        OAuthStateService oauthStateService = mock(OAuthStateService.class);
        when(oauthStateService.issue(7L, "google_drive", "device-hash")).thenReturn("signed-state");
        return new GoogleDriveService(
                mock(GoogleDriveCredentialRepository.class),
                mock(AppDataService.class),
                userVaultService,
                aesGcmService,
                objectMapper,
                oauthStateService
        );
    }
}
