# Final Evidence Checklist

Originally created: 2026-07-16
Updated: 2026-07-31

`PASS` means the evidence file exists and was visually checked. `SUPPORTING` is valid supporting evidence but does not complete the two-device test. `PENDING` requires Device A or Device B manual action.

## Automated And Runtime Checks

- PASS - Shared Docker database and application are running.
- PASS - Local and public HTTPS application endpoints returned HTTP 200.
- PASS - Premium price is S$7; limits are three providers and five active devices.
- PASS - PremiumUser has two retained active devices after temporary evidence devices were removed.
- PASS - Google Drive, Dropbox and OneDrive are connected; Google Drive was restored as active.
- PASS - Final AES-256-GCM key metadata exists with the expected active fingerprint.
- PASS - Runtime database contains eight HIGH suspicious events.
- PASS - Free second-device login returns the explicit Premium entitlement error.
- PASS - 2026-07-31 complete backend suite: 124 tests, zero failures or errors.
- PASS - 2026-07-31 frontend suite: 7 tests passed; TypeScript and Vite production build passed.

## Captured UI Evidence

- SUPERSEDED - The old `device-a/MD-A-01-registered-devices.png` shows the temporary three-device limit and must not be used as final limit evidence.
- PASS - Final encryption-key metadata: `device-a/KEY-01-final-key-metadata.png`.
- PASS - Three connected providers and 3/3 limit: `device-a/CLOUD-01-three-provider-links.png`.
- PASS - Google Drive active `.ssenc` list: `device-a/GD-A-01-active-file-list.png`.
- PASS - Dropbox active `.ssenc` list: `device-a/DBX-A-01-active-file-list.png`.
- PASS - OneDrive active `.ssenc` list: `device-a/OD-A-01-active-file-list.png`.
- PASS - Free second-device rejection: `free/FREE-01-second-device-rejected.png`.
- PASS - Admin HIGH/Flagged view with explainable reason: `admin/ADMIN-01-high-flagged-logs.png`.
- PASS - Authenticated admin CSV: `admin/ADMIN-02-system-logs.csv`.
- SUPPORTING - Earlier single-device screenshots are retained under `legacy-2026-07-07/`.

All paths above are relative to:

`C:/Users/Z/Desktop/Project (Last two semester)/测试截图证据/2026-07-31-final/`

## Cross-device Evidence Still Pending

- PENDING - Final Devices screenshot showing only the retained Device A and Device B entries (`2/5 active devices`).
- PENDING - Device A ciphertext listed and decrypted on Device B for Google Drive.
- PENDING - Device A ciphertext listed and decrypted on Device B for Dropbox.
- PENDING - Device A ciphertext listed and decrypted on Device B for OneDrive.
- PENDING - Device B upload listed and decrypted on Device A for all three providers.
- PENDING - Intentional wrong-password rejection on the other device.
- PENDING - Correct-password SHA-256 match in both directions.
- PENDING - Delete result after the evidence is saved.
- PENDING - Teammate screenshots copied into `device-b-pending/` and referenced by final path.

## Documentation And Recording

- PENDING - Teammate uploads the updated User Manual to the Week 19 Google Drive folder.
- PENDING - User Manual screenshots are checked against this evidence index.
- PENDING - Final video records the required two-device/provider coverage.
- PENDING - The three Supervisor answers from 2026-07-31 are written back into the scope wording.
- PENDING - Windows desktop package is built after web E2E evidence is complete.
- PENDING - Desktop clean-launch and core-flow smoke tests pass before the package is called final.

## Known Evidence Caveat

The Cloud Storage Usage card currently reads legacy local encrypted-file records and may show `0` while the real provider `.ssenc` list is populated. Do not use the usage number as evidence of cloud file count; use the provider-specific encrypted-file rows.
