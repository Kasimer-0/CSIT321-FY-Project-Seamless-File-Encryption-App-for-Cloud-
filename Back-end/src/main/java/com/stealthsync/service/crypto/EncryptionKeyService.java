package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.dto.TrustedKeyPackage;
import com.stealthsync.model.dto.TrustedKeyPackageImportResponse;
import com.stealthsync.repository.EncryptionKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
/** Derives file-encryption material from a customer key password without storing the password itself. */
public class EncryptionKeyService {

    private static final String KEY_SCHEME = "password-derived-v1";
    private static final String TRUSTED_DEVICE_PACKAGE_VERSION = "trusted-device-key-package-v1";
    private static final int SALT_LENGTH_BYTE = 16;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EncryptionKeyRepository encryptionKeyRepository;
    private final KeyManagementService keyManagementService;
    private final EncryptionPolicyService encryptionPolicyService;

    public List<EncryptionKeyRecord> listKeys(Long ownerID) {
        return encryptionKeyRepository.findByOwnerIDOrderByCreatedAtDesc(ownerID);
    }

    public Optional<EncryptionKeyRecord> findKey(Long ownerID, Long keyID) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(keyID, ownerID);
    }

    @Transactional
    public Optional<EncryptionKeyRecord> renameKey(Long ownerID, Long keyID, String keyName) {
        if (isBlank(keyName)) {
            throw new IllegalArgumentException("Encryption key name cannot be empty.");
        }
        return findKey(ownerID, keyID).map(key -> {
            key.setKeyName(keyName.trim());
            key.setUpdatedAt(Instant.now());
            return encryptionKeyRepository.save(key);
        });
    }

    @Transactional
    public Optional<EncryptionKeyRecord> updateStatus(Long ownerID, Long keyID, String status) {
        String normalizedStatus = status == null ? "" : status.trim().toLowerCase(java.util.Locale.ROOT);
        if (!"active".equals(normalizedStatus) && !"inactive".equals(normalizedStatus)) {
            throw new IllegalArgumentException("Encryption key status must be active or inactive.");
        }
        return findKey(ownerID, keyID).map(key -> {
            if ("retired".equalsIgnoreCase(key.getStatus())) {
                throw new IllegalArgumentException("Retired encryption keys cannot be reactivated.");
            }
            key.setStatus(normalizedStatus);
            key.setUpdatedAt(Instant.now());
            return encryptionKeyRepository.save(key);
        });
    }

    @Transactional
    public boolean deleteKey(Long ownerID, Long keyID) {
        return findKey(ownerID, keyID).map(key -> {
            // Retirement preserves the salt and fingerprint needed to derive
            // key material for files encrypted before the key was archived.
            key.setStatus("retired");
            key.setUpdatedAt(Instant.now());
            encryptionKeyRepository.save(key);
            return true;
        }).orElse(false);
    }

    public Optional<EncryptionKeyRecord> findKeyByFingerprint(Long ownerID, String fingerprint) {
        return isBlank(fingerprint)
                ? Optional.empty()
                : encryptionKeyRepository.findByOwnerIDAndFingerprint(ownerID, fingerprint.trim());
    }

    public TrustedKeyPackage exportTrustedKeyPackage(Long ownerID, Long keyID) {
        EncryptionKeyRecord key = findKey(ownerID, keyID)
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        return new TrustedKeyPackage(
                TRUSTED_DEVICE_PACKAGE_VERSION,
                Instant.now(),
                key.getKeyID(),
                key.getKeyName(),
                key.getAlgorithm(),
                key.getFingerprint(),
                key.getSalt(),
                key.getKeyScheme()
        );
    }

    @Transactional
    public TrustedKeyPackageImportResponse importTrustedKeyPackage(Long ownerID, TrustedKeyPackage keyPackage) {
        validateTrustedKeyPackage(keyPackage);
        Optional<EncryptionKeyRecord> existing =
                encryptionKeyRepository.findByOwnerIDAndFingerprint(ownerID, keyPackage.fingerprint());
        if (existing.isPresent()) {
            return new TrustedKeyPackageImportResponse("existing", existing.get());
        }

        String normalizedAlgorithm = encryptionPolicyService.requireAlgorithmAllowedForUser(ownerID, keyPackage.algorithm()).algorithm();
        Instant now = Instant.now();
        EncryptionKeyRecord imported = new EncryptionKeyRecord(
                null,
                ownerID,
                isBlank(keyPackage.keyName()) ? "Imported trusted-device key" : keyPackage.keyName().trim(),
                normalizedAlgorithm,
                "active",
                keyPackage.fingerprint().trim(),
                keyPackage.salt().trim(),
                null,
                isBlank(keyPackage.keyScheme()) ? KEY_SCHEME : keyPackage.keyScheme().trim(),
                now,
                now
        );
        return new TrustedKeyPackageImportResponse("imported", encryptionKeyRepository.save(imported));
    }

    @Transactional
    public EncryptionKeyRecord createKey(Long ownerID, String keyName, String algorithm, String keyPassword) {
        requirePassword(keyPassword);
        String normalizedAlgorithm = encryptionPolicyService.requireAlgorithmAllowedForUser(ownerID, algorithm).algorithm();
        byte[] salt = randomBytes(SALT_LENGTH_BYTE);
        byte[] derivedBytes = derivePasswordKey(keyPassword, salt);
        try {
            Instant now = Instant.now();
            EncryptionKeyRecord key = new EncryptionKeyRecord(
                    null,
                    ownerID,
                    isBlank(keyName) ? "New Encryption Key" : keyName.trim(),
                    normalizedAlgorithm,
                    "active",
                    fingerprint(derivedBytes),
                    encode(salt),
                    verifier(derivedBytes),
                    KEY_SCHEME,
                    now,
                    now
            );
            return encryptionKeyRepository.save(key);
        } finally {
            Arrays.fill(salt, (byte) 0);
            Arrays.fill(derivedBytes, (byte) 0);
        }
    }

    public DerivedKeyMaterial requireActiveKeyMaterial(Long ownerID, Long keyID, String keyPassword) {
        return deriveMaterial(requireActiveKey(ownerID, keyID), keyPassword);
    }

    public DerivedKeyMaterial requireActiveKeyMaterialForEncryption(Long ownerID, Long keyID, String keyPassword) {
        EncryptionKeyRecord key = requireActiveKey(ownerID, keyID);
        encryptionPolicyService.requireAlgorithmAllowedForUser(ownerID, key.getAlgorithm());
        return deriveMaterial(key, keyPassword);
    }

    public DerivedKeyMaterial requireActiveKeyMaterial(Long ownerID, Long keyID, String keyFingerprint, String keyPassword) {
        EncryptionKeyRecord key = findKey(ownerID, keyID)
                .or(() -> findKeyByFingerprint(ownerID, keyFingerprint))
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        if (!"active".equalsIgnoreCase(key.getStatus())) {
            throw new IllegalArgumentException("Encryption key is not active.");
        }
        return deriveMaterial(key, keyPassword);
    }

    public DerivedKeyMaterial requireKeyMaterialForDecryption(Long ownerID, Long keyID, String keyPassword) {
        EncryptionKeyRecord key = findKey(ownerID, keyID)
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        requireDecryptableStatus(key);
        return deriveMaterial(key, keyPassword);
    }

    public DerivedKeyMaterial requireKeyMaterialForDecryption(
            Long ownerID,
            Long keyID,
            String keyFingerprint,
            String keyPassword) {
        // Trusted-device imports may create a new database keyID, so cloud decrypt can fall back to the portable fingerprint.
        EncryptionKeyRecord key = findKey(ownerID, keyID)
                .or(() -> findKeyByFingerprint(ownerID, keyFingerprint))
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        requireDecryptableStatus(key);
        return deriveMaterial(key, keyPassword);
    }

    private void requireDecryptableStatus(EncryptionKeyRecord key) {
        if (!"active".equalsIgnoreCase(key.getStatus()) && !"retired".equalsIgnoreCase(key.getStatus())) {
            throw new IllegalArgumentException("Encryption key is inactive. Reactivate it before decrypting files.");
        }
    }

    private DerivedKeyMaterial deriveMaterial(EncryptionKeyRecord key, String keyPassword) {
        verifyPassword(key, keyPassword);
        byte[] salt = decode(key.getSalt());
        byte[] derivedBytes = derivePasswordKey(keyPassword, salt);
        try {
            return new DerivedKeyMaterial(key, passphrase(derivedBytes));
        } finally {
            Arrays.fill(salt, (byte) 0);
            Arrays.fill(derivedBytes, (byte) 0);
        }
    }

    public EncryptionKeyRecord requireActiveKey(Long ownerID, Long keyID) {
        if (keyID == null) {
            throw new IllegalArgumentException("Encryption key is required.");
        }
        EncryptionKeyRecord key = findKey(ownerID, keyID)
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        if (!"active".equalsIgnoreCase(key.getStatus())) {
            throw new IllegalArgumentException("Encryption key is not active.");
        }
        return key;
    }

    private void verifyPassword(EncryptionKeyRecord key, String keyPassword) {
        requirePassword(keyPassword);
        if (isBlank(key.getSalt())) {
            throw new IllegalArgumentException("This encryption key must be recreated before it can encrypt or decrypt files.");
        }
        byte[] salt = decode(key.getSalt());
        byte[] derivedBytes = derivePasswordKey(keyPassword, salt);
        try {
            if (!passwordMatches(key, derivedBytes)) {
                throw new IllegalArgumentException("Wrong key password or corrupted ciphertext.");
            }
        } finally {
            Arrays.fill(salt, (byte) 0);
            Arrays.fill(derivedBytes, (byte) 0);
        }
    }

    private boolean passwordMatches(EncryptionKeyRecord key, byte[] derivedBytes) {
        if (!isBlank(key.getPasswordVerifier())) {
            byte[] expected = decode(key.getPasswordVerifier());
            byte[] actual = decode(verifier(derivedBytes));
            return MessageDigest.isEqual(expected, actual);
        }
        return MessageDigest.isEqual(
                key.getFingerprint().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                fingerprint(derivedBytes).getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );
    }

    private void validateTrustedKeyPackage(TrustedKeyPackage keyPackage) {
        if (keyPackage == null) {
            throw new IllegalArgumentException("Trusted-device key package is required.");
        }
        if (!TRUSTED_DEVICE_PACKAGE_VERSION.equals(keyPackage.version())) {
            throw new IllegalArgumentException("Unsupported trusted-device key package version.");
        }
        if (isBlank(keyPackage.fingerprint()) || isBlank(keyPackage.salt())) {
            throw new IllegalArgumentException("Trusted-device key package is missing key metadata.");
        }
        encryptionPolicyService.policyForAlgorithm(keyPackage.algorithm());
    }

    private byte[] derivePasswordKey(String keyPassword, byte[] salt) {
        try {
            SecretKey secretKey = keyManagementService.deriveAesKey(keyPassword, salt, 256);
            return secretKey.getEncoded();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Unable to derive encryption key material.");
        }
    }

    private String fingerprint(byte[] derivedBytes) {
        return encode(digest("fingerprint", derivedBytes)).substring(0, 16);
    }

    private String verifier(byte[] derivedBytes) {
        return encode(digest("verifier", derivedBytes));
    }

    private String passphrase(byte[] derivedBytes) {
        return encode(digest("file-passphrase", derivedBytes));
    }

    private byte[] digest(String purpose, byte[] derivedBytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(purpose.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            digest.update((byte) ':');
            return digest.digest(derivedBytes);
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is required for key derivation.");
        }
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return bytes;
    }

    private void requirePassword(String keyPassword) {
        if (isBlank(keyPassword)) {
            throw new IllegalArgumentException("Key password is required.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] decode(String value) {
        return Base64.getUrlDecoder().decode(value);
    }

    public record DerivedKeyMaterial(EncryptionKeyRecord key, String passphrase) {
    }
}
