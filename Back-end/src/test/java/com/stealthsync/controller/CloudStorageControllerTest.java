package com.stealthsync.controller;

import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.CloudStorageAdapter;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.KeyManagementService;
import com.stealthsync.service.crypto.UserVaultService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CloudStorageControllerTest {

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
                mock(EncryptionKeyService.class)
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
                mock(EncryptionKeyService.class)
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
}
