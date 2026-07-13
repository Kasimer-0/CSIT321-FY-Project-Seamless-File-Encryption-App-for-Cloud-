# StealthSync Evidence Checklist - 2026-07-09

Use this checklist for final report screenshots, project video, and supervisor demonstration. Store screenshots or short notes beside each item before final packaging.

Status note on 2026-07-09: automated backend/frontend checks passed, and the first web screenshots were added under `C:\Users\Z\Desktop\Project (Last two semester)`. The current screenshot set covers OAuth/active-provider evidence well, but the final report/video still needs explicit upload/decrypt/delete screenshots for Dropbox and OneDrive. The desktop application remains out of scope for today's evidence pass because it currently cannot open reliably.

Evidence folder:

- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 2.png`

## Three-cloud web E2E

| Provider | OAuth connected | Active provider | Encrypted upload | Provider list | Wrong password fails | Correct password decrypts | Cloud file is ciphertext | Delete works |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Google Drive | DONE: `Google success 1.png` | DONE: `Google success 2.png` | PARTIAL: `Google success 2.png` shows encrypted Drive entries after upload | DONE: `Google success 2.png` | MISSING: capture failed decrypt toast/log | MISSING: capture successful decrypt/save result | PARTIAL: `Google success 2.png` shows randomized `stlh-...` encrypted object name; capture Drive-side file details if possible | MISSING: capture delete success |
| Dropbox | DONE: `Dropbox success 1.png` | DONE: `Dropbox success 2.png` | MISSING: capture Dropbox upload success | MISSING: capture Dropbox encrypted file list | MISSING: capture failed decrypt toast/log | MISSING: capture successful decrypt/save result | MISSING: capture Dropbox-side ciphertext object | MISSING: capture delete success |
| OneDrive | DONE: `Onedrive success 1.png` | DONE: `Onedrive success 2.png` | MISSING: capture OneDrive upload success | MISSING: capture OneDrive encrypted file list | MISSING: capture failed decrypt toast/log | MISSING: capture successful decrypt/save result | MISSING: capture OneDrive-side ciphertext object | MISSING: capture delete success |

## Active-provider rule

- DONE: Activate Google Drive screenshot: `Google success 2.png`.
- DONE: Activate Dropbox screenshot: `Dropbox success 2.png`.
- DONE: Activate OneDrive screenshot: `Onedrive success 2.png`.
- PARTIAL: Current screenshots show the selected active provider, but do not show all three linked providers inactive/active in one view. Capture one screenshot after linking all providers if the final report needs stronger proof.
- TODO: Attempt upload to a non-active provider and show the clear error, if the UI allows selecting a provider.

## Trusted-device / multi-device evidence

Manual runbook: `docs/MULTI_DEVICE_TRUSTED_PACKAGE_DEMO_STEPS_2026-07-09.md`.

- TODO: Device/Profile A creates an encryption key.
- TODO: Device/Profile A uploads an encrypted file using `keyID + keyPassword`.
- TODO: Device/Profile A exports a trusted-device package.
- TODO: Confirm exported JSON has no key password, raw key, or password verifier.
- TODO: Device/Profile B imports the package.
- TODO: Device/Profile B decrypts the cloud file with the same key password.
- TODO: Device/Profile B wrong-password attempt fails.

Implementation check:
- Backend endpoints exist: `POST /trusted-devices/export-key-package` and `POST /trusted-devices/import-key-package`.
- Frontend entry exists on the Encryption Keys page.
- Package must be inspected during evidence capture to confirm it excludes key password, raw key, and password verifier material.
- Backend test passed on 2026-07-09: `mvn test -Dtest=EncryptionKeyServiceTest`.
- The cloud decrypt flow now supports imported trusted-device keys whose database `keyID` differs by resolving the key through the stable key fingerprint stored with the cloud file metadata.

## Desktop known issue

- TODO: Record that desktop app currently cannot open.
- TODO: State that web frontend is the evidence target until desktop packaging is fixed.

## AI / Future Work evidence

- TODO: Record that real ML model is not part of P0.
- TODO: If used in presentation, show admin suspicious-log flags as explainable rule-based anomaly detection only.
- TODO: List true ML recommendation/anomaly model as Future Work.
