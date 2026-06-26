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
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
/** Derives file-encryption material from a customer key password without storing the password itself. */
public class EncryptionKeyService {

    private static final String KEY_SCHEME = "password-derived-v1";
    private static final int SALT_LENGTH_BYTE = 16;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EncryptionKeyRepository encryptionKeyRepository;
    private final KeyManagementService keyManagementService;
    private final EncryptionPolicyService encryptionPolicyService;

    public List<EncryptionKeyRecord> listKeys(Long ownerID, String search) {
        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return encryptionKeyRepository.findByOwnerIDOrderByCreatedAtDesc(ownerID).stream()
                .filter(key -> keyword.isBlank()
                        || key.getKeyName().toLowerCase(Locale.ROOT).contains(keyword)
                        || key.getAlgorithm().toLowerCase(Locale.ROOT).contains(keyword)
                        || key.getFingerprint().toLowerCase(Locale.ROOT).contains(keyword))
                .toList();
    }

    public Optional<EncryptionKeyRecord> findKey(Long ownerID, Long keyID) {
        return encryptionKeyRepository.findByKeyIDAndOwnerID(keyID, ownerID);
    }

    @Transactional
    public EncryptionKeyRecord createKey(Long ownerID, String keyName, String algorithm, String keyPassword) {
        requirePassword(keyPassword);
        String normalizedAlgorithm = encryptionPolicyService.policyForAlgorithm(algorithm).algorithm();
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
        EncryptionKeyRecord key = requireActiveKey(ownerID, keyID);
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
        if (isBlank(key.getSalt()) || isBlank(key.getPasswordVerifier())) {
            throw new IllegalArgumentException("This encryption key must be recreated before it can encrypt or decrypt files.");
        }
        byte[] salt = decode(key.getSalt());
        byte[] derivedBytes = derivePasswordKey(keyPassword, salt);
        try {
            byte[] expected = decode(key.getPasswordVerifier());
            byte[] actual = decode(verifier(derivedBytes));
            if (!MessageDigest.isEqual(expected, actual)) {
                throw new IllegalArgumentException("Wrong key password or corrupted ciphertext.");
            }
        } finally {
            Arrays.fill(salt, (byte) 0);
            Arrays.fill(derivedBytes, (byte) 0);
        }
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
