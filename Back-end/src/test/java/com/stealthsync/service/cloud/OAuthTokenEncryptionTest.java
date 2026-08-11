package com.stealthsync.service.cloud;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.keygen.KeyGenerators;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class OAuthTokenEncryptionTest {

    @Test
    void writesWithDedicatedSecretAndDecryptsIt() {
        String salt = KeyGenerators.string().generateKey();
        String encrypted = OAuthTokenEncryption.encrypt(
                "refresh-token",
                salt,
                "dedicated-token-encryption-secret",
                "legacy-provider-client-secret"
        );

        assertNotEquals("refresh-token", encrypted);
        assertEquals(
                "refresh-token",
                OAuthTokenEncryption.decrypt(
                        encrypted,
                        salt,
                        "dedicated-token-encryption-secret",
                        "legacy-provider-client-secret"
                )
        );
    }

    @Test
    void readsRowsEncryptedWithLegacyProviderSecret() {
        String salt = KeyGenerators.string().generateKey();
        String encrypted = OAuthTokenEncryption.encrypt(
                "legacy-token",
                salt,
                "",
                "legacy-provider-client-secret"
        );

        assertEquals(
                "legacy-token",
                OAuthTokenEncryption.decrypt(
                        encrypted,
                        salt,
                        "new-dedicated-token-secret",
                        "legacy-provider-client-secret"
                )
        );
    }
}
