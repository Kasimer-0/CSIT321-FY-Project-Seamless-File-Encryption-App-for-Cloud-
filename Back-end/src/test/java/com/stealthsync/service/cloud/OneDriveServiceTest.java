package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.repository.CloudProviderCredentialRepository;
import com.stealthsync.security.OAuthStateService;
import com.stealthsync.service.AppDataService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OneDriveServiceTest {

    @Test
    void createsRealMicrosoftAuthorizationUrlWithGraphScopesAndState() throws Exception {
        OneDriveService service = service();
        ReflectionTestUtils.setField(service, "clientId", "onedrive-client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "onedrive-client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/cloud-storage/onedrive/callback");
        ReflectionTestUtils.setField(service, "tenant", "common");

        URI authorizationUri = URI.create(service.createAuthorizationUrl(7L, "device-hash"));
        String query = authorizationUri.getRawQuery();

        assertEquals("login.microsoftonline.com", authorizationUri.getHost());
        assertEquals("/common/oauth2/v2.0/authorize", authorizationUri.getPath());
        assertTrue(query.contains("client_id=onedrive-client-id"));
        assertTrue(query.contains("response_type=code"));
        assertTrue(query.contains("response_mode=query"));
        assertTrue(query.contains("redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcloud-storage%2Fonedrive%2Fcallback"));
        assertTrue(query.contains("scope=offline_access+User.Read+Files.ReadWrite"));
        assertTrue(query.contains("state="));
        assertTrue(!authorizationUri.toString().contains("example.com"));
    }

    @Test
    void rejectsAuthorizationWhenOneDriveCredentialsAreMissing() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service().createAuthorizationUrl(7L, "device-hash")
        );

        assertTrue(error.getMessage().contains("OneDrive integration is not configured"));
        assertTrue(error.getMessage().contains("ONEDRIVE_CLIENT_ID"));
    }

    @Test
    void exposesOneDriveProviderIdentityForUnifiedAdapter() {
        OneDriveService service = service();

        assertEquals("onedrive", service.providerKey());
        assertEquals("onedrive", service.providerPath());
        assertEquals("OneDrive", service.providerLabel());
    }

    private OneDriveService service() {
        OAuthStateService oauthStateService = mock(OAuthStateService.class);
        when(oauthStateService.issue(7L, "onedrive", "device-hash")).thenReturn("signed-state");
        return new OneDriveService(
                mock(CloudProviderCredentialRepository.class),
                mock(AppDataService.class),
                new ObjectMapper(),
                mock(CloudFileMetadataCodec.class),
                new EncryptedEnvelopeV2Inspector(new ObjectMapper()),
                oauthStateService
        );
    }
}
