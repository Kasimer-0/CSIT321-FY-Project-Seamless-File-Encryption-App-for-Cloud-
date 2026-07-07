# Daily Record - 2026-06-27

## Focus

- Audited current-user ownership handling across customer, admin, file, cloud-storage, key, account-security, subscription, report, and physical-token endpoints.
- Verified the password-protected encryption key flow for local file storage and Google Drive upload/decrypt paths.
- Added test evidence for no-token access, inactive-key rejection, encrypted-file keyID persistence, and encrypted Google Drive metadata recovery.

## currentUser / ownerID Audit

Customer-owned endpoints now resolve the owner from `CurrentUserService` / JWT instead of trusting request `ownerID` or `userID` values. This was confirmed for local files, Google Drive links/files, encryption keys, account-security actions, subscription purchase, and physical-token records.

Admin-only operations are protected either by `@PreAuthorize("hasRole('ADMIN')")` or by `SecurityConfig` route rules. Subscription management remains admin-only, while `/subscriptions/purchase` uses the authenticated customer account.

## Encryption Key Password Flow

- Creating an encryption key requires `keyPassword`.
- The backend stores salt, password verifier, fingerprint, and key scheme; it does not serialize plaintext password or derived key material.
- Local and Google Drive encryption paths require `keyID` and `keyPassword`.
- Decryption uses the stored local record or encrypted Google Drive metadata `keyID` to choose the key.
- Wrong key passwords fail before decrypting file content.
- Inactive keys cannot be used to derive encryption material for new encryption.
- `keyPassword` is not stored in frontend `localStorage`; it is passed only in request bodies/form data or the existing download header.

## Google Drive Metadata

New Google Drive uploads use randomized object names. Original filename, encryption method, keyID, key name, and key fingerprint are stored in encrypted description metadata. The legacy metadata migration path still detects old plaintext metadata and can fall back without breaking old file listings.

## Physical Token Status

Physical-token code is prototype registration only. It does not perform USB, FIDO2, WebAuthn, token-bound key release, or hardware-backed unlock. Current encryption/decryption still requires the selected key password. Real hardware unlock remains Future Work.

## Test Evidence

- `mvn test "-Dtest=OwnershipSecurityTest,EncryptionKeyServiceTest,GoogleDriveServiceTest,AppDataServiceTest"`: passed, 24 tests.
- `mvn test`: passed, 37 tests.
- Frontend TypeScript check with bundled Node: passed.
- Frontend Vite build with bundled Node: passed.

## Remaining Risks

- The legacy `/api/file/encrypt` and `/api/file/decrypt` endpoints still accept direct passphrases for manual local demo testing. They are documented as legacy and are not the main Google Drive/customer key workflow.
- Physical-token binding is not real hardware authentication and must stay in Future Work.
- Manual UI verification of the key creation/upload/decrypt screens is still recommended with a running backend and seeded test accounts.