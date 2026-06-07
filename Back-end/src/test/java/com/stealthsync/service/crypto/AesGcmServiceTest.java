package com.stealthsync.service.crypto;

import org.junit.jupiter.api.Test;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AesGcmServiceTest {

    private static final String PASSPHRASE = "correct horse battery staple";

    private final KeyManagementService keyManagementService = new KeyManagementService();
    private final AesGcmService aesGcmService = new AesGcmService(keyManagementService);

    @Test
    void encryptStreamWritesVersionedHeaderAndDecrypts() throws Exception {
        byte[] plaintext = "StealthSync encryption payload".getBytes(StandardCharsets.UTF_8);

        byte[] encrypted = aesGcmService
                .encryptStream(new ByteArrayInputStream(plaintext), PASSPHRASE)
                .readAllBytes();
        byte[] decrypted = aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), PASSPHRASE)
                .readAllBytes();

        assertEquals('S', encrypted[0]);
        assertEquals('T', encrypted[1]);
        assertEquals('L', encrypted[2]);
        assertEquals('H', encrypted[3]);
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    void decryptStreamRejectsTamperedCiphertext() throws Exception {
        byte[] encrypted = aesGcmService
                .encryptStream(new ByteArrayInputStream("sensitive".getBytes(StandardCharsets.UTF_8)), PASSPHRASE)
                .readAllBytes();
        encrypted[encrypted.length - 1] ^= 1;

        assertThrows(Exception.class, () -> aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), PASSPHRASE)
                .readAllBytes());
    }

    @Test
    void decryptStreamSupportsLegacyIvOnlyFiles() throws Exception {
        byte[] plaintext = "legacy payload".getBytes(StandardCharsets.UTF_8);
        byte[] legacyEncrypted = legacyEncrypt(plaintext);

        byte[] decrypted = aesGcmService
                .decryptStream(new ByteArrayInputStream(legacyEncrypted), PASSPHRASE)
                .readAllBytes();

        assertArrayEquals(plaintext, decrypted);
    }

    private byte[] legacyEncrypt(byte[] plaintext) throws Exception {
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        SecretKey secretKey = keyManagementService.deriveLegacyAesKey(PASSPHRASE);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(128, iv));
        byte[] ciphertext = cipher.doFinal(plaintext);

        byte[] encrypted = new byte[iv.length + ciphertext.length];
        System.arraycopy(iv, 0, encrypted, 0, iv.length);
        System.arraycopy(ciphertext, 0, encrypted, iv.length, ciphertext.length);
        return encrypted;
    }
}
