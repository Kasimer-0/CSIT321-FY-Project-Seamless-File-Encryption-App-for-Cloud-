package com.stealthsync.service.crypto;

import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class KeyManagementService {

    public SecretKey deriveAesKey(String passphrase) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(passphrase.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, "AES");
    }

    public boolean verifyPhysicalToken(String tokenCode) {
        return tokenCode != null && !tokenCode.isBlank();
    }
}