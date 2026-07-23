package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.repository.CloudProviderCredentialRepository;
import com.stealthsync.security.OAuthStateService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.model.entity.CloudProviderCredential;
import com.stealthsync.model.entity.CloudStorageLink;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DropboxServiceTest {

    @Test
    void createsRealDropboxAuthorizationUrlWithOfflineAccessAndState() {
        DropboxService service = service();
        ReflectionTestUtils.setField(service, "clientId", "dropbox-client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "dropbox-client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/cloud-storage/dropbox/callback");

        URI authorizationUri = URI.create(service.createAuthorizationUrl(7L, "device-hash"));
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
                () -> service().createAuthorizationUrl(7L, "device-hash")
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

    @Test
    void callbackUsesSignedStateOwnerAndPersistsRotatedRefreshToken() throws Exception {
        CloudProviderCredentialRepository repository = mock(CloudProviderCredentialRepository.class);
        AppDataService dataStore = mock(AppDataService.class);
        OAuthStateService stateService = mock(OAuthStateService.class);
        HttpClient httpClient = mock(HttpClient.class);
        HttpResponse<String> tokenResponse = response(200,
                "{\"access_token\":\"access-one\",\"refresh_token\":\"refresh-one\",\"expires_in\":3600}");
        HttpResponse<String> accountResponse = response(200, "{\"email\":\"owner@example.test\"}");
        HttpResponse<String> refreshResponse = response(200,
                "{\"access_token\":\"access-two\",\"refresh_token\":\"refresh-two\",\"expires_in\":3600}");
        doReturn(tokenResponse, accountResponse, refreshResponse)
                .when(httpClient).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
        when(stateService.consume("signed-state", "dropbox")).thenReturn(
                new OAuthStateService.OAuthState(42L, "dropbox", "device-hash", Instant.now().plusSeconds(600).getEpochSecond(), "nonce"));
        when(repository.findByProviderIgnoreCaseAndOwnerID("dropbox", 42L)).thenReturn(Optional.empty());
        when(dataStore.linkCloudProvider("dropbox", 42L, "owner@example.test")).thenReturn(new CloudStorageLink(
                1L, "dropbox", "owner@example.test", Instant.now(), "connected", true, 42L));

        DropboxService service = new DropboxService(
                repository, dataStore, new ObjectMapper(), mock(CloudFileMetadataCodec.class),
                new EncryptedEnvelopeV2Inspector(new ObjectMapper()), stateService);
        ReflectionTestUtils.setField(service, "clientId", "dropbox-client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "dropbox-client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "https://app.example/cloud-storage/dropbox/callback");
        ReflectionTestUtils.setField(service, "httpClient", httpClient);

        service.completeAuthorization("authorization-code", "signed-state");

        ArgumentCaptor<CloudProviderCredential> credentialCaptor = ArgumentCaptor.forClass(CloudProviderCredential.class);
        verify(repository).findByProviderIgnoreCaseAndOwnerID("dropbox", 42L);
        verify(repository).save(credentialCaptor.capture());
        CloudProviderCredential credential = credentialCaptor.getValue();
        assertEquals(42L, credential.getOwnerID());
        assertEquals("dropbox", credential.getProvider());
        assertFalse(credential.getAccessToken().contains("access-one"));
        assertFalse(credential.getRefreshToken().contains("refresh-one"));

        ReflectionTestUtils.invokeMethod(service, "validAccessToken", credential, true);
        String rotatedRefreshToken = ReflectionTestUtils.invokeMethod(
                service, "decryptToken", credential, credential.getRefreshToken());
        assertEquals("refresh-two", rotatedRefreshToken);
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<String> response(int status, String body) {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        return response;
    }

    private DropboxService service() {
        OAuthStateService oauthStateService = mock(OAuthStateService.class);
        when(oauthStateService.issue(7L, "dropbox", "device-hash")).thenReturn("signed-state");
        return new DropboxService(
                mock(CloudProviderCredentialRepository.class),
                mock(AppDataService.class),
                new ObjectMapper(),
                mock(CloudFileMetadataCodec.class),
                new EncryptedEnvelopeV2Inspector(new ObjectMapper()),
                oauthStateService
        );
    }
}
