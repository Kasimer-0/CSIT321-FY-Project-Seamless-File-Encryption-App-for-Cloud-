package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.UserVaultRecord;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.repository.UserVaultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
@RequiredArgsConstructor
/**
 * Provides a per-user vault key for file and metadata encryption.
 * This is a server-managed FYP baseline; a production zero-knowledge design would wrap this key with user-held material.
 */
public class UserVaultService {

    private static final String KEY_SCHEME = "server-managed-v1";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserVaultRepository userVaultRepository;
    private final UserAccountRepository userAccountRepository;

    @Value("${stealthsync.vault.server-secret:stealthsync-development-vault-secret-change-before-release}")
    private String serverSecret;

    @Transactional
    public String filePassphraseFor(Long ownerID) {
        UserVaultRecord vault = userVaultRepository.findByOwnerID(ownerID)
                .orElseGet(() -> createVault(ownerID));
        return decryptFileKey(vault);
    }

    /** Separates metadata encryption from file-content encryption even though both belong to the same user vault. */
    @Transactional
    public String metadataPassphraseFor(Long ownerID) {
        return filePassphraseFor(ownerID) + ":metadata";
    }

    private UserVaultRecord createVault(Long ownerID) {
        if (ownerID == null || !userAccountRepository.existsById(ownerID)) {
            throw new IllegalArgumentException("A valid user is required for vault creation.");
        }
        String salt = KeyGenerators.string().generateKey();
        String fileKey = randomSecret();
        Instant now = Instant.now();
        UserVaultRecord vault = new UserVaultRecord(
                null,
                ownerID,
                salt,
                Encryptors.text(serverSecret, salt).encrypt(fileKey),
                KEY_SCHEME,
                now,
                now
        );
        return userVaultRepository.save(vault);
    }

    private String decryptFileKey(UserVaultRecord vault) {
        return Encryptors.text(serverSecret, vault.getVaultSalt()).decrypt(vault.getWrappedFileKey());
    }

    private String randomSecret() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
