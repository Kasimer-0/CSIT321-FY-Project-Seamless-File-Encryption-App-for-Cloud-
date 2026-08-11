package com.stealthsync.service.cloud;

import org.springframework.security.crypto.encrypt.Encryptors;

/** Encrypts OAuth tokens with a dedicated installation secret and reads legacy provider-key rows. */
final class OAuthTokenEncryption {

    private OAuthTokenEncryption() {
    }

    static String encrypt(String token, String salt, String tokenSecret, String legacyProviderSecret) {
        return Encryptors.text(preferredSecret(tokenSecret, legacyProviderSecret), salt).encrypt(token);
    }

    static String decrypt(String encryptedToken, String salt, String tokenSecret, String legacyProviderSecret) {
        if (encryptedToken == null || encryptedToken.isBlank()) {
            return null;
        }
        if (salt == null || salt.isBlank()) {
            return encryptedToken;
        }

        String preferred = preferredSecret(tokenSecret, legacyProviderSecret);
        try {
            return Encryptors.text(preferred, salt).decrypt(encryptedToken);
        } catch (RuntimeException exception) {
            if (tokenSecret == null || tokenSecret.isBlank() || preferred.equals(legacyProviderSecret)) {
                throw exception;
            }
            // Existing local deployments encrypted tokens with each provider's
            // client secret. This read-only fallback preserves those rows while
            // all newly written tokens use TOKEN_ENCRYPTION_SECRET.
            return Encryptors.text(legacyProviderSecret, salt).decrypt(encryptedToken);
        }
    }

    private static String preferredSecret(String tokenSecret, String legacyProviderSecret) {
        return tokenSecret == null || tokenSecret.isBlank() ? legacyProviderSecret : tokenSecret;
    }
}
