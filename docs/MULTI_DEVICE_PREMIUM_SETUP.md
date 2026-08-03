# Premium Multi-device Shared Test Setup

Updated: 2026-07-31

## Current Topology

Both Device A and Device B open the same controlled HTTPS StealthSync URL. The shared deployment hosts React, Spring Boot and PostgreSQL. The teammate does not install PostgreSQL, Java, Maven, Node.js, Docker or the source repository.

```text
Device A browser ----+
                     +---- Shared HTTPS StealthSync service ---- PostgreSQL
Device B browser ----+                 |
                                       +---- Google Drive / Dropbox / OneDrive
```

## Account And Device Rules

- Both devices use the same active `PremiumUser` account.
- The first registered device is Primary.
- Premium permits at most five active devices; a sixth is rejected.
- Free permits one active device; a second device receives the explicit Premium entitlement error.
- Device identifiers are generated in browser local storage; only a SHA-256 hash is persisted.
- Different customer accounts remain isolated. Cross-account file sharing is not implemented.

## Cross-device Validation

Repeat the following sequence for Google Drive, Dropbox and OneDrive:

1. Device A activates the provider and confirms the encrypted `.ssenc` object is listed.
2. Device B lists the same ciphertext under the same Premium account.
3. Device B enters the intentional wrong key password and records the rejection.
4. Device B enters the correct key password, downloads/decrypts and compares SHA-256 with the Device A source file.
5. Device B uploads its own test file using the same active key and key password.
6. Device A downloads/decrypts the Device B object and compares SHA-256.
7. Delete test objects only after both directions and both hashes are recorded.

The raw key, key password, OAuth token and plaintext are never transferred between devices. Password verification and AES-GCM encryption/decryption occur in the browser.

## Evidence Safety

- Do not show passwords, OAuth codes/tokens, JWTs, client secrets, database credentials or personal file content.
- A masked password field is acceptable; the actual value must not be written into a public screenshot.
- Keep only one provider active at a time.
- The current final evidence paths are indexed in `docs/FINAL_EVIDENCE_INDEX_2026-07-31.md`.

## Troubleshooting

- Shared URL unavailable: run `scripts/start-shared-test-deployment.ps1` on the host computer.
- Device B rejected: confirm the Premium subscription is active and fewer than five devices are active.
- Cloud list returns 401: reconnect that provider from the shared deployment and retry.
- Decryption fails: verify the same Premium account, final key fingerprint and key password.
- Storage usage displays zero while `.ssenc` rows are visible: use the provider file list as evidence; the legacy usage counter is not the cloud-record source of truth.
