package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.repository.GoogleDriveCredentialRepository;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.UserVaultService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class GoogleDriveServiceTest {

    @Test
    void createsAuthorizationUrlWithOfflineDriveFileAccessAndState() {
        GoogleDriveService service = service();
        ReflectionTestUtils.setField(service, "clientId", "client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/cloud-storage/oauth/google/callback");
        // Verify that an optional account hint is encoded without changing OAuth security.
        ReflectionTestUtils.setField(service, "loginHint", "demo@example.com");

        URI authorizationUri = URI.create(service.createAuthorizationUrl(7L));
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
                () -> service().createAuthorizationUrl(7L)
        );

        assertTrue(error.getMessage().contains("GOOGLE_DRIVE_CLIENT_ID"));
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
    private GoogleDriveService service() {
        return new GoogleDriveService(
                mock(GoogleDriveCredentialRepository.class),
                mock(AppDataService.class),
                mock(UserVaultService.class),
                mock(AesGcmService.class),
                new ObjectMapper()
        );
    }
}
