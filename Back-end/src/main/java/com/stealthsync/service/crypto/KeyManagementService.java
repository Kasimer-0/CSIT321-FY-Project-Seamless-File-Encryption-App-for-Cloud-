package com.stealthsync.service.crypto;

import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Arrays;

@Service
/** Creates, derives, fingerprints, and clears cryptographic keys used by vault/file services. */
public class KeyManagementService {

    private static final int AES_KEY_LENGTH_BITS = 256;
    private static final int PBKDF2_ITERATIONS = 210_000;

    public SecretKey deriveAesKey(String passphrase, byte[] salt) throws GeneralSecurityException {
        if (passphrase == null || passphrase.isBlank()) {
            throw new IllegalArgumentException("Passphrase is required.");
        }
        if (salt == null || salt.length == 0) {
            throw new IllegalArgumentException("A salt is required to derive an AES key.");
        }

        byte[] keyBytes = null;
        PBEKeySpec keySpec = new PBEKeySpec(
                passphrase.toCharArray(),
                salt,
                PBKDF2_ITERATIONS,
                AES_KEY_LENGTH_BITS
        );
        try {
            SecretKeyFactory keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            keyBytes = keyFactory.generateSecret(keySpec).getEncoded();
            return new SecretKeySpec(keyBytes, "AES");
        } finally {
            keySpec.clearPassword();
            if (keyBytes != null) {
                Arrays.fill(keyBytes, (byte) 0);
            }
        }
    }

    public SecretKey deriveLegacyAesKey(String passphrase) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(passphrase.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, "AES");
    }

    public boolean verifyPhysicalToken(String tokenCode) {
        return tokenCode != null && !tokenCode.isBlank();
    }
}
