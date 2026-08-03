package com.stealthsync.controller;

import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudFileRecord;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.CloudStorageAdapter;
import com.stealthsync.service.cloud.CloudCiphertextService;
import com.stealthsync.service.cloud.EncryptedEnvelopeV2Inspector;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.KeyManagementService;
import com.stealthsync.service.crypto.UserVaultService;
import com.stealthsync.service.security.SecurityAuditService;
import com.stealthsync.service.security.DeviceIdentifierService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CloudStorageControllerTest {

    @Test
    void providerStatusReportsWhenOwnedFilesNeedTheirCloudAccountReconnected() {
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);
        CloudCiphertextService ciphertextService = mock(CloudCiphertextService.class);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(adapter.providerKey()).thenReturn("google_drive");
        when(adapter.providerPath()).thenReturn("google-drive");
        when(adapter.isConfigured()).thenReturn(true);
        when(adapter.isConnected(7L)).thenReturn(false);
        when(ciphertextService.listOwned(7L, "google_drive")).thenReturn(List.of(
                mock(CloudFileRecord.class), mock(CloudFileRecord.class)));

        CloudStorageController controller = new CloudStorageController(
                mock(AppDataService.class), List.of(adapter), mock(AesGcmService.class), currentUserService,
                mock(UserVaultService.class), mock(EncryptionPolicyService.class), mock(EncryptionKeyService.class),
                mock(SecurityAuditService.class), mock(DeviceIdentifierService.class),
                mock(EncryptedEnvelopeV2Inspector.class), ciphertextService);

        Map<String, Object> status = controller.providerStatus("google-drive").getBody();

        assertEquals("google_drive", status.get("provider"));
        assertEquals(true, status.get("configured"));
        assertEquals(false, status.get("connected"));
        assertEquals(true, status.get("reconnectRequired"));
        assertEquals(2, status.get("ownedEncryptedFileCount"));
        verify(ciphertextService).listOwned(7L, "google_drive");
    }

    @Test
    void providerStatusDoesNotRequestReconnectWithoutOwnedFiles() {
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);
        CloudCiphertextService ciphertextService = mock(CloudCiphertextService.class);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(adapter.providerKey()).thenReturn("google_drive");
        when(adapter.providerPath()).thenReturn("google-drive");
        when(adapter.isConnected(7L)).thenReturn(false);
        when(ciphertextService.listOwned(7L, "google_drive")).thenReturn(List.of());

        CloudStorageController controller = new CloudStorageController(
                mock(AppDataService.class), List.of(adapter), mock(AesGcmService.class), currentUserService,
                mock(UserVaultService.class), mock(EncryptionPolicyService.class), mock(EncryptionKeyService.class),
                mock(SecurityAuditService.class), mock(DeviceIdentifierService.class),
                mock(EncryptedEnvelopeV2Inspector.class), ciphertextService);

        Map<String, Object> status = controller.providerStatus("google-drive").getBody();

        assertEquals(false, status.get("reconnectRequired"));
        assertEquals(0, status.get("ownedEncryptedFileCount"));
    }

    @Test
    void removingOwnedCloudLinkDisconnectsCredentialAndRecordsAuditEvent() {
        AppDataService dataStore = mock(AppDataService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);
        SecurityAuditService auditService = mock(SecurityAuditService.class);
        CloudStorageLink link = new CloudStorageLink(
                12L, "google_drive", "owner@example.test", Instant.now(), "connected", true, 7L);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(dataStore.findCloudStorageLink(12L, 7L)).thenReturn(Optional.of(link));
        when(dataStore.removeCloudStorageLink(12L, 7L)).thenReturn(true);
        when(adapter.providerKey()).thenReturn("google_drive");
        when(adapter.providerPath()).thenReturn("google-drive");

        CloudStorageController controller = new CloudStorageController(
                dataStore, List.of(adapter), mock(AesGcmService.class), currentUserService,
                mock(UserVaultService.class), mock(EncryptionPolicyService.class), mock(EncryptionKeyService.class),
                auditService, mock(DeviceIdentifierService.class), mock(EncryptedEnvelopeV2Inspector.class),
                mock(CloudCiphertextService.class));

        assertEquals(HttpStatus.NO_CONTENT, controller.remove(12L).getStatusCode());
        verify(adapter).disconnect(7L);
        verify(auditService).recordForUser(7L, "CLOUD_ACCOUNT_REMOVED", "google_drive");
    }

    @Test
    void legacyGoogleDriveFilesCanStillDecryptAfterMetadataMigration() throws Exception {
        AesGcmService aesGcmService = new AesGcmService(new KeyManagementService());
        UserVaultService userVaultService = mock(UserVaultService.class);
        when(userVaultService.filePassphraseFor(7L)).thenReturn("current-user-vault-key");

        byte[] encryptedWithOldDemoPassphrase;
        try (InputStream encrypted = aesGcmService.encryptStream(
                new ByteArrayInputStream("legacy drive content".getBytes(StandardCharsets.UTF_8)),
                "stealthsync-demo-passphrase",
                256)) {
            encryptedWithOldDemoPassphrase = encrypted.readAllBytes();
        }

        CloudStorageController controller = new CloudStorageController(
                mock(AppDataService.class),
                List.of(mock(CloudStorageAdapter.class)),
                aesGcmService,
                mock(CurrentUserService.class),
                userVaultService,
                new EncryptionPolicyService(mock(UserAccountRepository.class), mock(SubscriptionRepository.class)),
                mock(EncryptionKeyService.class),
                mock(SecurityAuditService.class),
                mock(DeviceIdentifierService.class),
                mock(EncryptedEnvelopeV2Inspector.class),
                mock(CloudCiphertextService.class)
        );

        CloudStorageAdapter.DownloadedCloudFile legacyFile = new CloudStorageAdapter.DownloadedCloudFile(
                "legacy-note.txt",
                "AES-256-GCM",
                null,
                null,
                null,
                encryptedWithOldDemoPassphrase
        );

        try (InputStream decrypted = ReflectionTestUtils.invokeMethod(
                controller,
                "decryptCloudContent",
                7L,
                legacyFile,
                null)) {
            assertEquals("legacy drive content", new String(decrypted.readAllBytes(), StandardCharsets.UTF_8));
        }
    }

    @Test
    void uploadRequiresAnActiveCloudLinkBeforeReadingKeyPassword() {
        AppDataService dataStore = mock(AppDataService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(dataStore.activeCloudStorageLink(7L)).thenReturn(Optional.empty());
        when(adapter.providerKey()).thenReturn("google_drive");
        when(adapter.providerPath()).thenReturn("google-drive");
        when(adapter.providerLabel()).thenReturn("Google Drive");

        CloudStorageController controller = new CloudStorageController(
                dataStore,
                List.of(adapter),
                mock(AesGcmService.class),
                currentUserService,
                mock(UserVaultService.class),
                mock(EncryptionPolicyService.class),
                mock(EncryptionKeyService.class),
                mock(SecurityAuditService.class),
                mock(DeviceIdentifierService.class),
                mock(EncryptedEnvelopeV2Inspector.class),
                mock(CloudCiphertextService.class)
        );

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "note.txt",
                "text/plain",
                "hello".getBytes(StandardCharsets.UTF_8)
        );

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> controller.encryptAndUploadToProvider("google-drive", file, 44L, "key-password"));

        assertEquals("Activate a cloud storage account before uploading.", error.getMessage());
    }

    @Test
    void v2UploadRejectsAnyKeyPasswordParameter() {
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserID()).thenReturn(7L);
        CloudStorageController controller = new CloudStorageController(
                mock(AppDataService.class), List.of(mock(CloudStorageAdapter.class)), mock(AesGcmService.class),
                currentUserService, mock(UserVaultService.class), mock(EncryptionPolicyService.class),
                mock(EncryptionKeyService.class), mock(SecurityAuditService.class), mock(DeviceIdentifierService.class),
                mock(EncryptedEnvelopeV2Inspector.class), mock(CloudCiphertextService.class));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> controller.uploadCiphertext(
                        "google-drive",
                        new MockMultipartFile("file", "encrypted.ssenc", "application/octet-stream", new byte[]{1}),
                        Map.of("keyPassword", "must-not-leave-browser")));

        assertEquals("Key passwords must remain in the browser.", error.getMessage());
    }

    @Test
    void v2UploadForwardsEnvelopeBytesWithoutServerEncryption() throws Exception {
        AppDataService dataStore = mock(AppDataService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);
        EncryptionKeyService keyService = mock(EncryptionKeyService.class);
        EncryptedEnvelopeV2Inspector inspector = mock(EncryptedEnvelopeV2Inspector.class);
        CloudCiphertextService ciphertextService = mock(CloudCiphertextService.class);
        AesGcmService aesGcmService = mock(AesGcmService.class);
        String objectName = "stealthsync-11111111-1111-4111-8111-111111111111.ssenc";
        byte[] envelopeBytes = new byte[]{1, 2, 3, 4, 5};
        var header = new EncryptedEnvelopeV2Inspector.EnvelopeHeader(
                2, "AES-128", "ABCDEFGHIJKLMNOP", "encrypted-metadata", 4);
        Instant now = Instant.now();
        EncryptionKeyRecord key = new EncryptionKeyRecord(
                44L, 7L, "Browser key", "AES-128", "active", "ABCDEFGHIJKLMNOP",
                "AAAAAAAAAAAAAAAAAAAAAA", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                EncryptionKeyService.KEY_SCHEME_V2, 310_000, 2, now, now);
        CloudFileDTO providerResult = new CloudFileDTO(
                "google_drive", "remote-1", objectName, null, envelopeBytes.length,
                now, now, "AES-128", null, null, "ABCDEFGHIJKLMNOP", 2, "encrypted-metadata");
        CloudFileRecord record = new CloudFileRecord(
                1L, 7L, "google_drive", "remote-1", objectName, "AES-128", "ABCDEFGHIJKLMNOP",
                "encrypted-metadata", 2, 3, envelopeBytes.length, now, now);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(adapter.providerKey()).thenReturn("google_drive");
        when(adapter.providerPath()).thenReturn("google-drive");
        when(adapter.providerLabel()).thenReturn("Google Drive");
        when(dataStore.activeCloudStorageLink(7L)).thenReturn(Optional.of(new CloudStorageLink(
                1L, "google_drive", "owner@example.test", now, "connected", true, 7L)));
        when(inspector.inspect(envelopeBytes)).thenReturn(header);
        when(keyService.requireActiveClientKeyForEncryption(7L, "ABCDEFGHIJKLMNOP")).thenReturn(key);
        when(adapter.uploadCiphertextForProvider(eq(7L), any(), any())).thenReturn(providerResult);
        when(ciphertextService.register(eq(7L), eq("google_drive"), eq("remote-1"), eq(objectName),
                eq(header), eq(3L), eq((long) envelopeBytes.length))).thenReturn(record);

        CloudStorageController controller = new CloudStorageController(
                dataStore, List.of(adapter), aesGcmService, currentUserService, mock(UserVaultService.class),
                mock(EncryptionPolicyService.class), keyService, mock(SecurityAuditService.class),
                mock(DeviceIdentifierService.class), inspector, ciphertextService);
        controller.uploadCiphertext(
                "google-drive",
                new MockMultipartFile("file", objectName, "application/vnd.stealthsync.encrypted", envelopeBytes),
                Map.of("objectName", objectName, "plaintextSize", "3"));

        ArgumentCaptor<InputStream> content = ArgumentCaptor.forClass(InputStream.class);
        verify(adapter).uploadCiphertextForProvider(eq(7L), any(), content.capture());
        assertArrayEquals(envelopeBytes, content.getValue().readAllBytes());
        verify(aesGcmService, never()).encryptStream(any(InputStream.class), anyString(), anyInt());
    }

    @Test
    void v2DownloadReturnsCiphertextWithoutServerDecryption() throws Exception {
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        CloudStorageAdapter adapter = mock(CloudStorageAdapter.class);
        CloudCiphertextService ciphertextService = mock(CloudCiphertextService.class);
        EncryptedEnvelopeV2Inspector inspector = mock(EncryptedEnvelopeV2Inspector.class);
        AesGcmService aesGcmService = mock(AesGcmService.class);
        byte[] ciphertext = new byte[]{9, 8, 7, 6};
        Instant now = Instant.now();
        CloudFileRecord record = new CloudFileRecord(
                1L, 7L, "dropbox", "remote-2", "encrypted.ssenc", "AES-256-GCM", "ABCDEFGHIJKLMNOP",
                "encrypted-metadata", 2, 3, ciphertext.length, now, now);
        var header = new EncryptedEnvelopeV2Inspector.EnvelopeHeader(
                2, "AES-256-GCM", "ABCDEFGHIJKLMNOP", "encrypted-metadata", 3);

        when(currentUserService.requireUserID()).thenReturn(7L);
        when(adapter.providerKey()).thenReturn("dropbox");
        when(adapter.providerPath()).thenReturn("dropbox");
        when(ciphertextService.requireOwned(7L, "dropbox", "remote-2")).thenReturn(record);
        when(adapter.downloadCiphertextForProvider(7L, "remote-2"))
                .thenReturn(new CloudStorageAdapter.DownloadedCiphertext("encrypted.ssenc", ciphertext));
        when(inspector.inspect(ciphertext)).thenReturn(header);

        CloudStorageController controller = new CloudStorageController(
                mock(AppDataService.class), List.of(adapter), aesGcmService, currentUserService,
                mock(UserVaultService.class), mock(EncryptionPolicyService.class), mock(EncryptionKeyService.class),
                mock(SecurityAuditService.class), mock(DeviceIdentifierService.class), inspector, ciphertextService);

        assertArrayEquals(ciphertext, controller.downloadCiphertext("dropbox", "remote-2").getBody());
        verify(aesGcmService, never()).decryptStream(any(InputStream.class), anyString(), anyInt());
    }
}
