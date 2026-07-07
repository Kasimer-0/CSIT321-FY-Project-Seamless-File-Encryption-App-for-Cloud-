package com.stealthsync.service.crypto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.dto.TrustedKeyPackage;
import com.stealthsync.model.dto.TrustedKeyPackageImportResponse;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.repository.EncryptionKeyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

    @Autowired
    private EncryptionKeyRepository encryptionKeyRepository;

    @Autowired
    private ObjectMapper objectMapper;

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

    @Test
    void differentKeyPasswordsDeriveDifferentFilePassphrases() {
        EncryptionKeyRecord firstKey = encryptionKeyService.createKey(OWNER_ID, "First material key", "AES-256-GCM", PASSWORD);
        EncryptionKeyRecord secondKey = encryptionKeyService.createKey(OWNER_ID, "Second material key", "AES-256-GCM", "Other@12345");

        String firstPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, firstKey.getKeyID(), PASSWORD)
                .passphrase();
        String secondPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, secondKey.getKeyID(), "Other@12345")
                .passphrase();

        assertNotEquals(firstPassphrase, secondPassphrase);
    }

    @Test
    void inactiveKeyCannotProvideEncryptionMaterial() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Inactive key", "AES-256-GCM", PASSWORD);
        key.setStatus("inactive");
        encryptionKeyRepository.save(key);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, key.getKeyID(), PASSWORD));

        assertEquals("Encryption key is not active.", error.getMessage());
    }

    @Test
    void fingerprintIsStableAndDoesNotContainPassword() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Fingerprint key", "AES-256-GCM", PASSWORD);
        String fingerprint = key.getFingerprint();

        EncryptionKeyRecord materialKey = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, key.getKeyID(), PASSWORD)
                .key();

        assertEquals(fingerprint, materialKey.getFingerprint());
        assertNotEquals(PASSWORD, fingerprint);
        assertFalse(fingerprint.contains(PASSWORD));
    }

    @Test
    void serializedKeyDoesNotExposeSaltOrPasswordVerifier() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Serialized key", "AES-256-GCM", PASSWORD);

        String json = objectMapper.writeValueAsString(key);

        assertFalse(json.contains("salt"));
        assertFalse(json.contains("passwordVerifier"));
        assertFalse(json.contains(key.getSalt()));
        assertFalse(json.contains(key.getPasswordVerifier()));
    }

    @Test
    void trustedDevicePackageDoesNotExposeVerifierOrRawKeyMaterial() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(OWNER_ID, "Transfer key", "AES-256-GCM", PASSWORD);

        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(OWNER_ID, key.getKeyID());
        String json = objectMapper.writeValueAsString(keyPackage);

        assertEquals("trusted-device-key-package-v1", keyPackage.version());
        assertEquals(key.getFingerprint(), keyPackage.fingerprint());
        assertEquals(key.getSalt(), keyPackage.salt());
        assertFalse(json.contains("passwordVerifier"));
        assertFalse(json.contains(key.getPasswordVerifier()));
        assertFalse(json.contains(PASSWORD));
    }

    @Test
    void importedTrustedDevicePackageDerivesSamePassphraseWithSamePassword() {
        EncryptionKeyRecord sourceKey = encryptionKeyService.createKey(OWNER_ID, "Demo transfer key", "AES-256-GCM", PASSWORD);
        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(OWNER_ID, sourceKey.getKeyID());

        TrustedKeyPackageImportResponse response = encryptionKeyService.importTrustedKeyPackage(5502L, keyPackage);

        assertEquals("imported", response.status());
        assertEquals(sourceKey.getFingerprint(), response.key().getFingerprint());
        assertEquals(sourceKey.getSalt(), response.key().getSalt());
        assertEquals(null, response.key().getPasswordVerifier());

        String sourcePassphrase = encryptionKeyService
                .requireActiveKeyMaterial(OWNER_ID, sourceKey.getKeyID(), PASSWORD)
                .passphrase();
        String importedPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(5502L, response.key().getKeyID(), PASSWORD)
                .passphrase();

        assertEquals(sourcePassphrase, importedPassphrase);
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(5502L, response.key().getKeyID(), "Wrong@12345"));
    }

    @Test
    void importingSameTrustedDevicePackageReturnsExistingKey() {
        EncryptionKeyRecord sourceKey = encryptionKeyService.createKey(OWNER_ID, "Existing transfer key", "AES-256-GCM", PASSWORD);
        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(OWNER_ID, sourceKey.getKeyID());

        TrustedKeyPackageImportResponse first = encryptionKeyService.importTrustedKeyPackage(6603L, keyPackage);
        TrustedKeyPackageImportResponse second = encryptionKeyService.importTrustedKeyPackage(6603L, keyPackage);

        assertEquals("imported", first.status());
        assertEquals("existing", second.status());
        assertEquals(first.key().getKeyID(), second.key().getKeyID());
    }
}
