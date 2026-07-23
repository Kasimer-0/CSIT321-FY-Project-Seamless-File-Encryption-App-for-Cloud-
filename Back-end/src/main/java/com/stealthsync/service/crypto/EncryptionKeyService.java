package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.EncryptionKeyRecord;
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
    public static final String KEY_SCHEME_V2 = "webcrypto-pbkdf2-aes-gcm-v2";
    public static final int KDF_ITERATIONS_V2 = 310_000;
    public static final int KDF_VERSION_V2 = 2;
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
        // The current user story has only Active and Retired states. PATCH may
        // reactivate legacy inactive rows, while retirement remains DELETE-only.
        if (!"active".equals(normalizedStatus)) {
            throw new IllegalArgumentException("Encryption keys can only be active or retired.");
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
                    null,
                    null,
                    now,
                    now
            );
            return encryptionKeyRepository.save(key);
        } finally {
            Arrays.fill(salt, (byte) 0);
            Arrays.fill(derivedBytes, (byte) 0);
        }
    }

    @Transactional
    public EncryptionKeyRecord createClientDerivedKey(
            Long ownerID,
            String keyName,
            String algorithm,
            String salt,
            String fingerprint,
            String passwordVerifier,
            String keyScheme,
            Integer kdfIterations,
            Integer kdfVersion) {
        String normalizedAlgorithm = encryptionPolicyService
                .requireAlgorithmAllowedForUser(ownerID, algorithm)
                .algorithm();
        requireClientKeyMetadata(salt, fingerprint, passwordVerifier, keyScheme, kdfIterations, kdfVersion);
        if (encryptionKeyRepository.findByOwnerIDAndFingerprint(ownerID, fingerprint.trim()).isPresent()) {
            throw new IllegalArgumentException("An encryption key with this fingerprint already exists.");
        }

        Instant now = Instant.now();
        return encryptionKeyRepository.save(new EncryptionKeyRecord(
                null,
                ownerID,
                isBlank(keyName) ? "New Encryption Key" : keyName.trim(),
                normalizedAlgorithm,
                "active",
                fingerprint.trim(),
                salt.trim(),
                passwordVerifier.trim(),
                KEY_SCHEME_V2,
                KDF_ITERATIONS_V2,
                KDF_VERSION_V2,
                now,
                now
        ));
    }

    public EncryptionKeyRecord requireActiveClientKeyForEncryption(Long ownerID, String fingerprint) {
        EncryptionKeyRecord key = findKeyByFingerprint(ownerID, fingerprint)
                .orElseThrow(() -> new IllegalArgumentException("Encryption key was not found."));
        if (!"active".equalsIgnoreCase(key.getStatus())) {
            throw new IllegalArgumentException("Encryption key is not active.");
        }
        if (!KEY_SCHEME_V2.equals(key.getKeyScheme())) {
            throw new IllegalArgumentException("Legacy keys cannot be used for new browser-encrypted uploads.");
        }
        encryptionPolicyService.requireAlgorithmAllowedForUser(ownerID, key.getAlgorithm());
        return key;
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
        // Cloud metadata may reference an older database key ID, so decryption
        // retains the owner-scoped fingerprint fallback for migrated records.
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

    private void requireClientKeyMetadata(
            String salt,
            String fingerprint,
            String passwordVerifier,
            String keyScheme,
            Integer kdfIterations,
            Integer kdfVersion) {
        if (!KEY_SCHEME_V2.equals(keyScheme)) {
            throw new IllegalArgumentException("Unsupported encryption key scheme.");
        }
        if (!Integer.valueOf(KDF_ITERATIONS_V2).equals(kdfIterations)
                || !Integer.valueOf(KDF_VERSION_V2).equals(kdfVersion)) {
            throw new IllegalArgumentException("Unsupported key-derivation parameters.");
        }
        if (decodeMetadata(salt, "Encryption key salt").length != SALT_LENGTH_BYTE) {
            throw new IllegalArgumentException("Encryption key salt must be 16 bytes.");
        }
        if (decodeMetadata(passwordVerifier, "Password verifier").length != 32) {
            throw new IllegalArgumentException("Password verifier must be 32 bytes.");
        }
        if (isBlank(fingerprint) || !fingerprint.matches("[A-Za-z0-9_-]{16}")) {
            throw new IllegalArgumentException("Encryption key fingerprint is invalid.");
        }
    }

    private byte[] decodeMetadata(String value, String fieldName) {
        if (isBlank(value)) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        try {
            return decode(value.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(fieldName + " is not valid base64url.");
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
