package com.stealthsync.service.crypto;

import com.stealthsync.model.dto.VaultStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class VaultService {

    private static final byte[] MAGIC = "SVLT".getBytes(StandardCharsets.US_ASCII);
    private static final byte VERSION = 1;
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int SALT_LENGTH_BYTE = 16;
    private static final int IV_LENGTH_BYTE = 12;
    private static final int AUTH_TAG_LENGTH_BYTE = 16;
    private static final int MASTER_KEY_LENGTH_BYTE = 32;
    private static final int TAG_LENGTH_BIT = 128;
    private static final String VAULT_FILE_NAME = "vault.dat";

    private final KeyManagementService keyManagementService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${stealthsync.vault.directory:}")
    private String configuredVaultDirectory;

    private byte[] activeMasterKey;

    public synchronized VaultStatusResponse status() {
        return new VaultStatusResponse(Files.exists(vaultPath()), activeMasterKey != null);
    }

    public synchronized VaultStatusResponse createVault(String masterPassword) throws Exception {
        requirePassword(masterPassword);
        Path vaultPath = vaultPath();
        if (Files.exists(vaultPath)) {
            throw new IllegalArgumentException("Vault already exists.");
        }

        byte[] masterKey = randomBytes(MASTER_KEY_LENGTH_BYTE);
        byte[] salt = randomBytes(SALT_LENGTH_BYTE);
        byte[] iv = randomBytes(IV_LENGTH_BYTE);
        SecretKey vaultKey = keyManagementService.deriveAesKey(masterPassword, salt);

        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, vaultKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));
            byte[] encryptedMasterKey = cipher.doFinal(masterKey);
            byte[] vaultBuffer = buildVaultBuffer(salt, iv, encryptedMasterKey);

            Files.createDirectories(vaultPath.getParent());
            Files.write(vaultPath, vaultBuffer);
            setActiveMasterKey(masterKey);
            return status();
        } finally {
            Arrays.fill(masterKey, (byte) 0);
        }
    }

    public synchronized VaultStatusResponse unlockVault(String masterPassword) throws Exception {
        requirePassword(masterPassword);
        Path vaultPath = vaultPath();
        if (!Files.exists(vaultPath)) {
            throw new IllegalArgumentException("Vault has not been created.");
        }

        VaultFileData vault = parseVaultBuffer(Files.readAllBytes(vaultPath));
        SecretKey vaultKey = keyManagementService.deriveAesKey(masterPassword, vault.salt());

        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, vaultKey, new GCMParameterSpec(TAG_LENGTH_BIT, vault.iv()));
            byte[] masterKey = cipher.doFinal(vault.encryptedMasterKeyWithTag());
            setActiveMasterKey(masterKey);
            Arrays.fill(masterKey, (byte) 0);
            return status();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Incorrect vault password.");
        }
    }

    public synchronized VaultStatusResponse lockVault() {
        clearActiveMasterKey();
        return status();
    }

    public synchronized SecretKey getActiveMasterKey() {
        if (activeMasterKey == null) {
            throw new IllegalStateException("Vault is locked.");
        }
        return new SecretKeySpec(activeMasterKey, "AES");
    }

    private byte[] buildVaultBuffer(byte[] salt, byte[] iv, byte[] encryptedMasterKeyWithTag) throws Exception {
        byte[] header = headerBytes(salt, iv);
        byte[] output = new byte[header.length + encryptedMasterKeyWithTag.length];
        System.arraycopy(header, 0, output, 0, header.length);
        System.arraycopy(encryptedMasterKeyWithTag, 0, output, header.length, encryptedMasterKeyWithTag.length);
        return output;
    }

    private VaultFileData parseVaultBuffer(byte[] vaultBuffer) throws IOException {
        int headerSize = MAGIC.length + 1 + SALT_LENGTH_BYTE + IV_LENGTH_BYTE;
        int minimumSize = headerSize + MASTER_KEY_LENGTH_BYTE + AUTH_TAG_LENGTH_BYTE;
        if (vaultBuffer.length < minimumSize) {
            throw new IOException("Invalid vault file.");
        }
        for (int index = 0; index < MAGIC.length; index++) {
            if (vaultBuffer[index] != MAGIC[index]) {
                throw new IOException("Invalid vault format.");
            }
        }
        if (vaultBuffer[MAGIC.length] != VERSION) {
            throw new IOException("Unsupported vault version: " + vaultBuffer[MAGIC.length]);
        }

        int offset = MAGIC.length + 1;
        byte[] salt = Arrays.copyOfRange(vaultBuffer, offset, offset + SALT_LENGTH_BYTE);
        offset += SALT_LENGTH_BYTE;
        byte[] iv = Arrays.copyOfRange(vaultBuffer, offset, offset + IV_LENGTH_BYTE);
        offset += IV_LENGTH_BYTE;
        byte[] encryptedMasterKeyWithTag = Arrays.copyOfRange(vaultBuffer, offset, vaultBuffer.length);

        return new VaultFileData(salt, iv, encryptedMasterKeyWithTag);
    }

    private byte[] headerBytes(byte[] salt, byte[] iv) {
        byte[] header = new byte[MAGIC.length + 1 + SALT_LENGTH_BYTE + IV_LENGTH_BYTE];
        System.arraycopy(MAGIC, 0, header, 0, MAGIC.length);
        header[MAGIC.length] = VERSION;
        System.arraycopy(salt, 0, header, MAGIC.length + 1, SALT_LENGTH_BYTE);
        System.arraycopy(iv, 0, header, MAGIC.length + 1 + SALT_LENGTH_BYTE, IV_LENGTH_BYTE);
        return header;
    }

    private void setActiveMasterKey(byte[] masterKey) {
        clearActiveMasterKey();
        activeMasterKey = Arrays.copyOf(masterKey, masterKey.length);
    }

    private void clearActiveMasterKey() {
        if (activeMasterKey != null) {
            Arrays.fill(activeMasterKey, (byte) 0);
            activeMasterKey = null;
        }
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        secureRandom.nextBytes(bytes);
        return bytes;
    }

    private Path vaultPath() {
        String directory = configuredVaultDirectory == null || configuredVaultDirectory.isBlank()
                ? Path.of(System.getProperty("user.home"), ".stealthsync").toString()
                : configuredVaultDirectory;
        return Path.of(directory).resolve(VAULT_FILE_NAME);
    }

    private void requirePassword(String masterPassword) {
        if (masterPassword == null || masterPassword.isBlank()) {
            throw new IllegalArgumentException("Master password is required.");
        }
    }

    private record VaultFileData(byte[] salt, byte[] iv, byte[] encryptedMasterKeyWithTag) {
    }
}
