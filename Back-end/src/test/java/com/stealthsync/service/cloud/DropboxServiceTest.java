package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.repository.CloudProviderCredentialRepository;
import com.stealthsync.service.AppDataService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class DropboxServiceTest {

    @Test
    void createsRealDropboxAuthorizationUrlWithOfflineAccessAndState() {
        DropboxService service = service();
        ReflectionTestUtils.setField(service, "clientId", "dropbox-client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "dropbox-client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/cloud-storage/dropbox/callback");

        URI authorizationUri = URI.create(service.createAuthorizationUrl(7L));
        String query = authorizationUri.getRawQuery();

        assertEquals("www.dropbox.com", authorizationUri.getHost());
        assertEquals("/oauth2/authorize", authorizationUri.getPath());
        assertTrue(query.contains("client_id=dropbox-client-id"));
        assertTrue(query.contains("response_type=code"));
        assertTrue(query.contains("token_access_type=offline"));
        assertTrue(query.contains("redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcloud-storage%2Fdropbox%2Fcallback"));
        assertTrue(query.contains("state="));
        assertTrue(!authorizationUri.toString().contains("example.com"));
    }

    @Test
    void rejectsAuthorizationWhenDropboxCredentialsAreMissing() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service().createAuthorizationUrl(7L)
        );

        assertTrue(error.getMessage().contains("Dropbox integration is not configured"));
        assertTrue(error.getMessage().contains("DROPBOX_CLIENT_ID"));
    }

    @Test
    void exposesDropboxProviderIdentityForUnifiedAdapter() {
        DropboxService service = service();

        assertEquals("dropbox", service.providerKey());
        assertEquals("dropbox", service.providerPath());
        assertEquals("Dropbox", service.providerLabel());
    }

    private DropboxService service() {
        return new DropboxService(
                mock(CloudProviderCredentialRepository.class),
                mock(AppDataService.class),
                new ObjectMapper(),
                mock(CloudFileMetadataCodec.class)
        );
    }
}
