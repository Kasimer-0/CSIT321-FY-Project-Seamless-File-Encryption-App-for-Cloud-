# Trusted Device Key Package Plan

## Goal

Allow a second trusted Windows device/profile to decrypt files that were encrypted on the first device, without exporting the raw key, the key password, or stored password verifier material.

## Package Flow

1. Device A creates a password-protected encryption key.
2. Device A exports a trusted-device key package for that key.
3. The package contains only metadata needed to derive and identify the same key:
   - package version
   - key name
   - algorithm
   - fingerprint
   - salt
   - key scheme
4. Device B imports the package into its own account/profile.
5. Device B enters the same key password when decrypting a cloud file.
6. The same password plus salt derives the same file passphrase, so the ciphertext can be decrypted.

## Security Rules

- The package must not include the raw AES key.
- The package must not include the key password.
- The package must not include the password verifier.
- Wrong passwords must still be rejected.
- Imported keys are owner-scoped to the importing user/profile.

## Current Implementation

- Backend DTOs and service logic are implemented.
- Backend endpoints are available:
  - `POST /trusted-devices/export-key-package`
  - `POST /trusted-devices/import-key-package`
- Tests verify that exported packages do not expose verifier/password material and that imported packages derive the same passphrase with the same password.
- A minimum frontend workflow is available on the Encryption Keys page:
  - export a selected key as a trusted-device JSON package
  - paste/import a trusted-device JSON package into another profile/device

## Remaining Work

- Capture demo evidence:
  - Device/Profile A encrypts a file.
  - Device/Profile B imports the key package.
  - Device/Profile B decrypts with the same password.
  - Wrong password fails.
