# Daily Record - 2026-06-28

## Goal

Build security regression evidence for cross-user access control, owner isolation, and the password-protected encryption key flow. No new scope was added for Dropbox, OneDrive, macOS, workspace sharing, ML, or real hardware-token authentication.

## Completed Tests

- Expanded `OwnershipSecurityTest` to cover cross-user delete/update/read attempts for cloud links, encryption keys, physical tokens, and local file encryption with another user's keyID.
- Confirmed protected APIs return 401 without a token and customer access to admin reports returns 403.
- Expanded `EncryptionKeyServiceTest` to verify correct password derivation, wrong-password rejection, different derived materials, inactive-key rejection, stable fingerprints, and JSON serialization without salt/password verifier.
- Kept Google Drive metadata evidence for randomized object names, encrypted metadata recovery, and keyID/keyName/keyFingerprint recovery.

## Fixes

- Added a 400 Bad Request handler for missing request parameters so missing multipart fields such as `keyID` or `keyPassword` are reported as client input errors instead of 500 server errors.

## Test Results

- `mvn test "-Dtest=OwnershipSecurityTest"`: passed, 16 tests.
- `mvn test "-Dtest=EncryptionKeyServiceTest"`: passed, 9 tests.
- `mvn test "-Dtest=GoogleDriveServiceTest"`: passed, 5 tests.
- `mvn test`: passed, 48 tests.
- Frontend Vite build with bundled Node: passed.

## Remaining Risks

- Physical tokens remain prototype registration records only; no USB/FIDO2/WebAuthn or hardware-backed unlock is implemented.
- Legacy direct-passphrase `/api/file/encrypt` and `/api/file/decrypt` endpoints remain for manual local demo testing and should not be described as the main cloud encryption flow.
- Manual UI verification is still recommended for the final demo path: login, create key, upload to Google Drive, list file key details, and decrypt with correct/wrong key password.

## Tomorrow First Priority

Run the full end-to-end desktop demo manually with seeded customer/admin accounts and capture screenshots or notes for the final report: key creation, Google Drive upload, encrypted Drive metadata behavior, and decrypt/save outcomes.