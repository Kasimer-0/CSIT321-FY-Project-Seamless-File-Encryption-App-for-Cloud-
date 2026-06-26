package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:key-service-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/key-service-test-vault",
        "stealthsync.jwt.secret=key-service-test-signing-secret"
})
class EncryptionKeyServiceTest {

    private static final Long OWNER_ID = 4401L;
    private static final String PASSWORD = "Master@12345";

    @Autowired
    private EncryptionKeyService encryptionKeyService;

    @Autowired
    private AesGcmService aesGcmService;

    @Test
    void createKeyStoresOnlyPasswordVerificationMaterial() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Drive key", "AES-256-GCM", PASSWORD);

        assertNotNull(key.getSalt());
        assertNotNull(key.getPasswordVerifier());
        assertNotNull(key.getFingerprint());
        assertNotEquals(PASSWORD, key.getSalt());
        assertNotEquals(PASSWORD, key.getPasswordVerifier());
    }

    @Test
    void derivedKeyPasswordCanEncryptAndDecryptContent() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Project key", "AES-256-GCM", PASSWORD);
        byte[] plaintext = "customer cloud file".getBytes(StandardCharsets.UTF_8);

        String encryptPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] encrypted = aesGcmService
                .encryptStream(new ByteArrayInputStream(plaintext), encryptPassphrase)
                .readAllBytes();

        String decryptPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] decrypted = aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), decryptPassphrase)
                .readAllBytes();

        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    void wrongPasswordIsRejectedBeforeDecrypting() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Wrong password key", "AES-256-GCM", PASSWORD);

        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, key.getKeyID(), "Wrong@12345"));
    }

    @Test
    void differentKeyCannotDecryptAnotherKeysCiphertext() throws Exception {
        EncryptionKeyRecord firstKey = encryptionKeyService.createKey(OWNER_ID, "First key", "AES-256-GCM", PASSWORD);
        EncryptionKeyRecord secondKey = encryptionKeyService.createKey(OWNER_ID, "Second key", "AES-256-GCM", "Other@12345");
        byte[] encrypted = aesGcmService
                .encryptStream(
                        new ByteArrayInputStream("isolated payload".getBytes(StandardCharsets.UTF_8)),
                        encryptionKeyService.requireActiveKeyMaterial(OWNER_ID, firstKey.getKeyID(), PASSWORD).passphrase())
                .readAllBytes();

        String wrongPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, secondKey.getKeyID(), "Other@12345")
                .passphrase();

        assertThrows(Exception.class, () -> aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), wrongPassphrase)
                .readAllBytes());
    }

    @Test
    void blankPasswordCannotCreateKey() {
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .createKey(OWNER_ID, "Blank key", "AES-256-GCM", " "));
    }
}