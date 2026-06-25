# Vault-Derived Key Design - 2026-06-25

## Current Implementation

StealthSync currently has two vault-related layers:

- `VaultService` implements a local `vault.dat` file, PBKDF2WithHmacSHA256 master-password derivation, AES-GCM wrapping, and in-memory unlock/lock state through `/vault/create`, `/vault/unlock`, `/vault/lock`, and `/vault/status`.
- `UserVaultService` is the active file-encryption source used by `FileController`, `CloudStorageController`, and `GoogleDriveService`. It creates one random per-user file key and wraps it with the configured server secret.

This means the production-facing file and Google Drive encryption flow is no longer based on the old shared demo passphrase, but it is still a server-managed per-user vault baseline. It must not be described as strict zero-knowledge storage.

## Target Architecture

The FYP target is a zero-knowledge-style local encryption design for the Windows desktop app:

1. The user creates or unlocks a local vault with a master password.
2. The local Spring Boot runtime derives a vault key from `masterPassword + vaultSalt` using PBKDF2WithHmacSHA256.
3. The derived vault key stays only in memory while the desktop app is unlocked.
4. File encryption, local file decryption, Google Drive upload encryption, Google Drive download decryption, and encrypted Drive metadata all use keys derived from the unlocked local vault.
5. Logout, lock vault, or app close clears the in-memory key.
6. Google Drive stores only ciphertext plus protected metadata. New Drive object names must remain randomized.

Because the Spring Boot backend is packaged with the Windows desktop app, the report can describe this as a local zero-knowledge-style encryption architecture. Do not claim that a remote server is zero knowledge unless the master password and unwrapped keys never reach that remote server.

## Migration Plan

The safest implementation path is:

1. Keep the existing `VaultService` endpoints and tests.
2. Add a small adapter method that exposes an unlocked vault-derived file passphrase or key handle without returning it through an API response.
3. Change `FileController`, `CloudStorageController`, and `GoogleDriveService` to request the active unlocked vault key before encrypt/decrypt.
4. Return a clear 423-style or 400-style API error when the vault is locked, so the frontend can prompt the user to unlock.
5. Only remove `UserVaultService` after the frontend has an unlock UI and old test/demo files are migrated or explicitly documented.

## Current Risk

- `VaultService` already supports create/unlock/lock, but the main file and Google Drive paths still use `UserVaultService`.
- `UserVaultService` depends on `stealthsync.vault.server-secret`, so compromise of the local backend configuration could unwrap per-user file keys.
- Existing files encrypted before the vault migration may require re-upload or migration if they were created with older passphrase rules.

## 2026-06-25 Minimum Decision

For the current sprint, keep the existing server-managed per-user vault as a safer baseline than the old shared demo passphrase, and document it honestly. The next P0 implementation step is to connect the already-tested `VaultService` unlock state to the file and Google Drive encryption controllers, then add the matching frontend unlock prompt.
