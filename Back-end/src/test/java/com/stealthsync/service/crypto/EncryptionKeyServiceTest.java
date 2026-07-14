package com.stealthsync.service.crypto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.dto.TrustedKeyPackage;
import com.stealthsync.model.dto.TrustedKeyPackageImportResponse;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.EncryptionKeyRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
@Transactional
class EncryptionKeyServiceTest {

    private static final String PASSWORD = "Master@12345";

    private Long ownerID;
    private Long importOwnerID;
    private Long importFingerprintOwnerID;
    private Long importExistingOwnerID;
    private Long freeOwnerID;
    private Long downgradedOwnerID;

    @Autowired
    private EncryptionKeyService encryptionKeyService;

    @Autowired
    private AesGcmService aesGcmService;

    @Autowired
    private EncryptionKeyRepository encryptionKeyRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUpTierPolicyOwners() {
        Plan premiumPlan = planRepository.save(new Plan(
                null,
                "Premium Test Plan",
                15.0,
                "Test AES-256 plan",
                "active",
                "AES-256-GCM"
        ));
        ownerID = seedOwner("key-owner", premiumPlan).getUserID();
        importOwnerID = seedOwner("import-owner", premiumPlan).getUserID();
        importFingerprintOwnerID = seedOwner("import-fingerprint-owner", premiumPlan).getUserID();
        importExistingOwnerID = seedOwner("import-existing-owner", premiumPlan).getUserID();
        downgradedOwnerID = seedOwner("downgraded-owner", premiumPlan).getUserID();
        freeOwnerID = seedOwner("free-key-owner", null).getUserID();
    }

    @Test
    void freeCustomerCanCreateAes128Key() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(freeOwnerID, "Free tier key", "AES-128", PASSWORD);

        assertEquals("AES-128", key.getAlgorithm());
    }

    @Test
    void freeCustomerCannotCreateAes256GcmKey() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .createKey(freeOwnerID, "Blocked premium key", "AES-256-GCM", PASSWORD));

        assertEquals("AES-256-GCM requires an active premium subscription.", error.getMessage());
    }

    @Test
    void premiumCustomerCanCreateAes256GcmKey() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Premium tier key", "AES-256-GCM", PASSWORD);

        assertEquals("AES-256-GCM", key.getAlgorithm());
    }

    @Test
    void ownerScopedCrudSupportsListRenameAndRetirementOnly() {
        EncryptionKeyRecord ownerKey = encryptionKeyService.createKey(ownerID, "Original name", "AES-256-GCM", PASSWORD);
        encryptionKeyService.createKey(importOwnerID, "Other owner key", "AES-256-GCM", PASSWORD);

        assertEquals(1, encryptionKeyService.listKeys(ownerID).size());
        assertEquals("Original name", encryptionKeyService.listKeys(ownerID).get(0).getKeyName());

        EncryptionKeyRecord renamed = encryptionKeyService.renameKey(ownerID, ownerKey.getKeyID(), "Renamed key").orElseThrow();
        assertEquals("Renamed key", renamed.getKeyName());

        IllegalArgumentException inactiveError = assertThrows(IllegalArgumentException.class,
                () -> encryptionKeyService.updateStatus(ownerID, ownerKey.getKeyID(), "inactive"));
        assertEquals("Encryption keys can only be active or retired.", inactiveError.getMessage());
        EncryptionKeyRecord active = encryptionKeyService.updateStatus(ownerID, ownerKey.getKeyID(), "active").orElseThrow();
        assertEquals("active", active.getStatus());

        String salt = ownerKey.getSalt();
        String fingerprint = ownerKey.getFingerprint();
        assertTrue(encryptionKeyService.deleteKey(ownerID, ownerKey.getKeyID()));
        EncryptionKeyRecord retired = encryptionKeyRepository.findById(ownerKey.getKeyID()).orElseThrow();
        assertEquals("retired", retired.getStatus());
        assertEquals(salt, retired.getSalt());
        assertEquals(fingerprint, retired.getFingerprint());
    }

    @Test
    void renameRejectsBlankNameAndOtherOwnerCannotMutateKey() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Protected key", "AES-256-GCM", PASSWORD);

        assertThrows(IllegalArgumentException.class,
                () -> encryptionKeyService.renameKey(ownerID, key.getKeyID(), " "));
        assertTrue(encryptionKeyService.renameKey(importOwnerID, key.getKeyID(), "Tampered").isEmpty());
        assertFalse(encryptionKeyService.deleteKey(importOwnerID, key.getKeyID()));
        assertEquals("Protected key", encryptionKeyRepository.findById(key.getKeyID()).orElseThrow().getKeyName());
    }

    @Test
    void downgradedCustomerCannotUseAes256KeyForNewEncryption() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(downgradedOwnerID, "Old premium key", "AES-256-GCM", PASSWORD);
        UserAccount owner = userAccountRepository.findById(downgradedOwnerID).orElseThrow();
        owner.setSubscribed(false);
        owner.setSubscription(null);
        userAccountRepository.save(owner);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterialForEncryption(downgradedOwnerID, key.getKeyID(), PASSWORD));

        assertEquals("AES-256-GCM requires an active premium subscription.", error.getMessage());
        assertNotNull(encryptionKeyService.requireActiveKeyMaterial(downgradedOwnerID, key.getKeyID(), PASSWORD));
    }

    @Test
    void createKeyStoresOnlyPasswordVerificationMaterial() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Drive key", "AES-256-GCM", PASSWORD);

        assertNotNull(key.getSalt());
        assertNotNull(key.getPasswordVerifier());
        assertNotNull(key.getFingerprint());
        assertNotEquals(PASSWORD, key.getSalt());
        assertNotEquals(PASSWORD, key.getPasswordVerifier());
    }

    @Test
    void derivedKeyPasswordCanEncryptAndDecryptContent() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Project key", "AES-256-GCM", PASSWORD);
        byte[] plaintext = "customer cloud file".getBytes(StandardCharsets.UTF_8);

        String encryptPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] encrypted = aesGcmService
                .encryptStream(new ByteArrayInputStream(plaintext), encryptPassphrase)
                .readAllBytes();

        String decryptPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] decrypted = aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), decryptPassphrase)
                .readAllBytes();

        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    void wrongPasswordIsRejectedBeforeDecrypting() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Wrong password key", "AES-256-GCM", PASSWORD);

        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(ownerID, key.getKeyID(), "Wrong@12345"));
    }

    @Test
    void differentKeyCannotDecryptAnotherKeysCiphertext() throws Exception {
        EncryptionKeyRecord firstKey = encryptionKeyService.createKey(ownerID, "First key", "AES-256-GCM", PASSWORD);
        EncryptionKeyRecord secondKey = encryptionKeyService.createKey(ownerID, "Second key", "AES-256-GCM", "Other@12345");
        byte[] encrypted = aesGcmService
                .encryptStream(
                        new ByteArrayInputStream("isolated payload".getBytes(StandardCharsets.UTF_8)),
                        encryptionKeyService.requireActiveKeyMaterial(ownerID, firstKey.getKeyID(), PASSWORD).passphrase())
                .readAllBytes();

        String wrongPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, secondKey.getKeyID(), "Other@12345")
                .passphrase();

        assertThrows(Exception.class, () -> aesGcmService
                .decryptStream(new ByteArrayInputStream(encrypted), wrongPassphrase)
                .readAllBytes());
    }

    @Test
    void blankPasswordCannotCreateKey() {
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .createKey(ownerID, "Blank key", "AES-256-GCM", " "));
    }

    @Test
    void differentKeyPasswordsDeriveDifferentFilePassphrases() {
        EncryptionKeyRecord firstKey = encryptionKeyService.createKey(ownerID, "First material key", "AES-256-GCM", PASSWORD);
        EncryptionKeyRecord secondKey = encryptionKeyService.createKey(ownerID, "Second material key", "AES-256-GCM", "Other@12345");

        String firstPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, firstKey.getKeyID(), PASSWORD)
                .passphrase();
        String secondPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, secondKey.getKeyID(), "Other@12345")
                .passphrase();

        assertNotEquals(firstPassphrase, secondPassphrase);
    }

    @Test
    void inactiveKeyCannotProvideEncryptionMaterial() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Inactive key", "AES-256-GCM", PASSWORD);
        key.setStatus("inactive");
        encryptionKeyRepository.save(key);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(ownerID, key.getKeyID(), PASSWORD));

        assertEquals("Encryption key is not active.", error.getMessage());
    }

    @Test
    void retiredKeyCannotEncryptNewContentButCanDecryptExistingContent() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Archive key", "AES-256-GCM", PASSWORD);
        byte[] plaintext = "content encrypted before retirement".getBytes(StandardCharsets.UTF_8);
        String encryptionPassphrase = encryptionKeyService
                .requireActiveKeyMaterialForEncryption(ownerID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] ciphertext = aesGcmService
                .encryptStream(new ByteArrayInputStream(plaintext), encryptionPassphrase)
                .readAllBytes();

        assertTrue(encryptionKeyService.deleteKey(ownerID, key.getKeyID()));
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterialForEncryption(ownerID, key.getKeyID(), PASSWORD));

        String decryptionPassphrase = encryptionKeyService
                .requireKeyMaterialForDecryption(ownerID, key.getKeyID(), PASSWORD)
                .passphrase();
        byte[] decrypted = aesGcmService
                .decryptStream(new ByteArrayInputStream(ciphertext), decryptionPassphrase)
                .readAllBytes();
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    void fingerprintIsStableAndDoesNotContainPassword() {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Fingerprint key", "AES-256-GCM", PASSWORD);
        String fingerprint = key.getFingerprint();

        EncryptionKeyRecord materialKey = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, key.getKeyID(), PASSWORD)
                .key();

        assertEquals(fingerprint, materialKey.getFingerprint());
        assertNotEquals(PASSWORD, fingerprint);
        assertFalse(fingerprint.contains(PASSWORD));
    }

    @Test
    void serializedKeyDoesNotExposeSaltOrPasswordVerifier() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Serialized key", "AES-256-GCM", PASSWORD);

        String json = objectMapper.writeValueAsString(key);

        assertFalse(json.contains("salt"));
        assertFalse(json.contains("passwordVerifier"));
        assertFalse(json.contains(key.getSalt()));
        assertFalse(json.contains(key.getPasswordVerifier()));
    }

    @Test
    void trustedDevicePackageDoesNotExposeVerifierOrRawKeyMaterial() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(ownerID, "Transfer key", "AES-256-GCM", PASSWORD);

        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(ownerID, key.getKeyID());
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
        EncryptionKeyRecord sourceKey = encryptionKeyService.createKey(ownerID, "Demo transfer key", "AES-256-GCM", PASSWORD);
        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(ownerID, sourceKey.getKeyID());

        TrustedKeyPackageImportResponse response = encryptionKeyService.importTrustedKeyPackage(importOwnerID, keyPackage);

        assertEquals("imported", response.status());
        assertEquals(sourceKey.getFingerprint(), response.key().getFingerprint());
        assertEquals(sourceKey.getSalt(), response.key().getSalt());
        assertEquals(null, response.key().getPasswordVerifier());

        String sourcePassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, sourceKey.getKeyID(), PASSWORD)
                .passphrase();
        String importedPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(importOwnerID, response.key().getKeyID(), PASSWORD)
                .passphrase();

        assertEquals(sourcePassphrase, importedPassphrase);
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(importOwnerID, response.key().getKeyID(), "Wrong@12345"));
    }

    @Test
    void importedTrustedDevicePackageCanResolveCloudFileByFingerprintWhenOriginalKeyIdDiffers() {
        EncryptionKeyRecord sourceKey = encryptionKeyService.createKey(ownerID, "Portable transfer key", "AES-256-GCM", PASSWORD);
        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(ownerID, sourceKey.getKeyID());
        TrustedKeyPackageImportResponse response = encryptionKeyService.importTrustedKeyPackage(importFingerprintOwnerID, keyPackage);

        String sourcePassphrase = encryptionKeyService
                .requireActiveKeyMaterial(ownerID, sourceKey.getKeyID(), PASSWORD)
                .passphrase();
        String importedPassphrase = encryptionKeyService
                .requireActiveKeyMaterial(importFingerprintOwnerID, sourceKey.getKeyID(), sourceKey.getFingerprint(), PASSWORD)
                .passphrase();

        assertNotEquals(sourceKey.getKeyID(), response.key().getKeyID());
        assertEquals(sourcePassphrase, importedPassphrase);
        assertThrows(IllegalArgumentException.class, () -> encryptionKeyService
                .requireActiveKeyMaterial(importFingerprintOwnerID, sourceKey.getKeyID(), sourceKey.getFingerprint(), "Wrong@12345"));
    }

    @Test
    void importingSameTrustedDevicePackageReturnsExistingKey() {
        EncryptionKeyRecord sourceKey = encryptionKeyService.createKey(ownerID, "Existing transfer key", "AES-256-GCM", PASSWORD);
        TrustedKeyPackage keyPackage = encryptionKeyService.exportTrustedKeyPackage(ownerID, sourceKey.getKeyID());

        TrustedKeyPackageImportResponse first = encryptionKeyService.importTrustedKeyPackage(importExistingOwnerID, keyPackage);
        TrustedKeyPackageImportResponse second = encryptionKeyService.importTrustedKeyPackage(importExistingOwnerID, keyPackage);

        assertEquals("imported", first.status());
        assertEquals("existing", second.status());
        assertEquals(first.key().getKeyID(), second.key().getKeyID());
    }

    private UserAccount seedOwner(String username, Plan premiumPlan) {
        UserAccount user = new UserAccount(null, username, username + "@stealthsync.test", "customer", premiumPlan != null, false, null);
        user.setUsername(username);
        user.setEmail(username + "@stealthsync.test");
        user.setRole("customer");
        user.setSubscribed(premiumPlan != null);
        user.setSuspended(false);
        user.setPasswordHash("test-password-hash");
        user = userAccountRepository.save(user);

        if (premiumPlan != null) {
            Subscription subscription = subscriptionRepository.save(new Subscription(
                    null,
                    premiumPlan,
                    user,
                    "active",
                    LocalDate.now().minusDays(1),
                    LocalDate.now().plusDays(29)
            ));
            user.setSubscription(subscription.getSubscriptionID());
            userAccountRepository.save(user);
        } else {
            user.setSubscription(null);
            user = userAccountRepository.save(user);
        }
        return user;
    }
}
