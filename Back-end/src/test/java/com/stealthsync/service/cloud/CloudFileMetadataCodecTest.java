package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.KeyManagementService;
import com.stealthsync.service.crypto.UserVaultService;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CloudFileMetadataCodecTest {

    @Test
    void packagesEncryptedMetadataWithoutLeakingOriginalNameOrKeyLabel() throws Exception {
        UserVaultService userVaultService = mock(UserVaultService.class);
        when(userVaultService.metadataPassphraseFor(7L)).thenReturn("metadata-passphrase");
        CloudFileMetadataCodec codec = new CloudFileMetadataCodec(
                new ObjectMapper(),
                new AesGcmService(new KeyManagementService()),
                userVaultService
        );
        byte[] ciphertext = "already-encrypted-file-bytes".getBytes(StandardCharsets.UTF_8);
        CloudStorageAdapter.CloudUploadMetadata metadata = new CloudStorageAdapter.CloudUploadMetadata(
                "private-contract.pdf",
                "AES-256-GCM",
                42L,
                "Dropbox key",
                "ABCD1234"
        );

        byte[] packaged = codec.packageEncryptedContent(7L, metadata, ciphertext);
        String packagedText = new String(packaged, StandardCharsets.ISO_8859_1);

        assertFalse(packagedText.contains("private-contract.pdf"));
        assertFalse(packagedText.contains("Dropbox key"));

        CloudFileMetadataCodec.PackagedCloudFile unpacked =
                codec.unpack(7L, "stlh-random.stealthsync.enc", packaged);

        assertEquals("private-contract.pdf", unpacked.metadata().originalName());
        assertEquals("AES-256-GCM", unpacked.metadata().encMethod());
        assertEquals(42L, unpacked.metadata().keyID());
        assertEquals("Dropbox key", unpacked.metadata().keyName());
        assertEquals("ABCD1234", unpacked.metadata().keyFingerprint());
        assertArrayEquals(ciphertext, unpacked.encryptedContent());
    }
}
