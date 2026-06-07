package com.stealthsync.service.crypto;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VaultServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void createsLocksAndUnlocksVault() throws Exception {
        VaultService vaultService = vaultService();

        assertFalse(vaultService.status().isCreated());
        assertFalse(vaultService.status().isUnlocked());

        vaultService.createVault("MasterPassword@123");

        assertTrue(Files.exists(tempDir.resolve("vault.dat")));
        assertTrue(vaultService.status().isCreated());
        assertTrue(vaultService.status().isUnlocked());

        vaultService.lockVault();

        assertTrue(vaultService.status().isCreated());
        assertFalse(vaultService.status().isUnlocked());

        vaultService.unlockVault("MasterPassword@123");

        assertTrue(vaultService.status().isUnlocked());
    }

    @Test
    void rejectsIncorrectVaultPassword() throws Exception {
        VaultService vaultService = vaultService();
        vaultService.createVault("MasterPassword@123");
        vaultService.lockVault();

        assertThrows(IllegalArgumentException.class, () -> vaultService.unlockVault("wrong password"));
    }

    private VaultService vaultService() {
        VaultService vaultService = new VaultService(new KeyManagementService());
        ReflectionTestUtils.setField(vaultService, "configuredVaultDirectory", tempDir.toString());
        return vaultService;
    }
}
