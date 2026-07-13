# Daily Record - 2026-07-09

## Focus

Close the evidence gap for the core FYP requirements before starting any AI/ML scope. The web frontend remains the validation target while the desktop application is recorded as a known packaging issue.

## Current progress

- Google Drive, Dropbox, and OneDrive have real OAuth-backed provider code paths for encrypted upload, list, download/decrypt, and delete.
- The UI treats all three providers as configurable real providers, not prototype-only links.
- Active cloud link behavior is implemented so one provider is active at a time.
- Trusted-device backend endpoints exist:
  - `POST /trusted-devices/export-key-package`
  - `POST /trusted-devices/import-key-package`
- Added a minimum Encryption Keys page UI for exporting and importing trusted-device packages.

## 2026-07-09 verification run

- Non-destructive source review completed for:
  - `CloudStorageController`
  - `GoogleDriveService`
  - `DropboxService`
  - `OneDriveService`
  - `TrustedDeviceController`
  - `CustomerEncryptFilePage`
  - `CustomerDecryptFilePage`
  - `CustomerManageCloudAccLinksPage`
  - `CustomerManageEncryptionKeysPage`
- Backend automated checks: `mvn test` passed with 69 tests, 0 failures, 0 errors.
- Frontend checks:
  - `tsc -b` passed.
  - Vite production build passed through the bundled Node/runtime path because global `npm` is not available in the local PATH.
- No desktop packaging repair was attempted today. Desktop remains deferred until web evidence is complete.

## Web E2E evidence status

| Provider | Required evidence | Current status |
| --- | --- | --- |
| Google Drive | connect, activate, encrypted upload, list, wrong-password failure, correct-password decrypt, ciphertext-at-rest, delete | Existing screenshots cover connect, active status, and encrypted file list. Wrong-password, correct decrypt, and delete evidence still need screenshots/log notes |
| Dropbox | connect, activate, encrypted upload, list, wrong-password failure, correct-password decrypt, ciphertext-at-rest, delete | Existing screenshots cover connect and active status. Upload/list/decrypt/delete evidence still needs screenshots/log notes |
| OneDrive | connect, activate, encrypted upload, list, wrong-password failure, correct-password decrypt, ciphertext-at-rest, delete | Existing screenshots cover connect and active status. Upload/list/decrypt/delete evidence still needs screenshots/log notes |

Screenshot evidence received from:

- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 2.png`

## Multi-device status

- Backend package export/import is implemented and owner scoped.
- Frontend now has a minimal trusted-device package import/export path.
- Cloud decrypt now supports imported trusted-device keys whose local database `keyID` differs from the original uploader's key by falling back to the stable key fingerprint.
- Verification passed: `mvn test -Dtest=EncryptionKeyServiceTest` ran 13 tests with 0 failures and 0 errors.
- Added `docs/MULTI_DEVICE_TRUSTED_PACKAGE_DEMO_STEPS_2026-07-09.md` as the manual runbook for the Profile A/Profile B trusted-device evidence capture.
- Demo evidence still needs a second browser profile, Windows user, VM, or second Windows device:
  1. Device/Profile A creates an encryption key.
  2. Device/Profile A uploads an encrypted file.
  3. Device/Profile A exports the trusted-device package.
  4. Device/Profile B imports the package.
  5. Device/Profile B decrypts with the same key password.
  6. Wrong password fails.

## Desktop status

Desktop app currently cannot open. This is a known issue and is deferred until web E2E and multi-device evidence are complete.

## AI/ML gate

Do not start a real ML model yet. The repository already contains a small explainable rule-based anomaly detector for admin logs, which can be described as an AI-inspired optional enhancement. Real ML recommendation/anomaly models should remain Future Work unless all core evidence is complete.

Decision for today: AI stays paused for implementation. The only acceptable near-term AI work is documentation of the existing rule-based suspicious-log flag or a design note after cloud and multi-device screenshots are complete.

## Next priority for 2026-07-10

Run the trusted-device web demo, capture screenshots/log notes, and verify the frontend trusted package UI with wrong-password and correct-password decrypt paths.
