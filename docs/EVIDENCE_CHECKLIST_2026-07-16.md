# Final Evidence Checklist

Originally created: 2026-07-16
Updated: 2026-08-06

`PASS` means the evidence file exists and was visually checked. `SUPPORTING` is valid supporting evidence but does not complete the two-device test. `FUNCTIONAL PASS / EVIDENCE FILE PENDING` means the workflow was manually confirmed but its teammate screenshot has not yet been copied locally. `PENDING` still requires manual action.

## Automated And Runtime Checks

- PASS - Shared Docker database and application are running.
- PASS - Local and public HTTPS application endpoints returned HTTP 200.
- PASS - Premium price is S$7; limits are three providers and five active devices.
- PASS - PremiumUser has two retained active devices after temporary evidence devices were removed.
- PASS - Google Drive, Dropbox and OneDrive are connected; Google Drive was restored as active.
- PASS - Final AES-256-GCM key metadata exists with the expected active fingerprint.
- PASS - Runtime database contains explainable HIGH suspicious events.
- PASS - Free second-device login returns the explicit Premium entitlement error.
- PASS - 2026-08-06 complete backend suite: 147 tests, zero failures, errors or skipped tests.
- PASS - 2026-08-06 frontend suite: 12 tests passed; TypeScript and Vite production build passed.
- PASS - Shared deployment was restored after the deliberate stop; the scheduled supervisor is running and both local and public endpoints return HTTP 200.

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
- PASS - Admin Overview with five real recent system logs: `admin/ADMIN-03-recent-activity.png`.
- PASS - Local rule-based sensitive-data warning: `device-a/PRIVACY-01-sensitive-data-warning.png`; Cancel was selected and no upload occurred.
- SUPPORTING - Earlier single-device screenshots are retained under `legacy-2026-07-07/`.

All paths above are relative to:

`C:/Users/Z/Desktop/Project (Last two semester)/测试截图证据/2026-07-31-final/`

## Cross-device Functional Result And Pending Evidence

- PENDING - Final Devices screenshot showing only the retained Device A and Device B entries (`2/5 active devices`).
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Device A ciphertext listed and decrypted on Device B for Google Drive.
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Device A ciphertext listed and decrypted on Device B for Dropbox.
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Device A ciphertext listed and decrypted on Device B for OneDrive.
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Device B upload listed and decrypted on Device A for all three providers.
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Intentional wrong-password rejection on the other device.
- FUNCTIONAL PASS / EVIDENCE FILE PENDING - Correct-password SHA-256 match in both directions.
- PENDING - Delete result after the evidence is saved.
- PENDING - Teammate screenshots copied into `device-b-pending/` and referenced by final path.

## Documentation And Recording

- PASS - The latest Week 19 User Manual source was backed up and audited locally on 2026-08-05 without overwriting the cloud original.
- PENDING - Resolve the four English review comments, replace the remaining incomplete screenshots and upload the approved final User Manual.
- PENDING - Final video records the required two-device/provider coverage.
- PASS - Final slide, Project Video and Marketing Video evidence mapping was created on 2026-08-06.
- PENDING - Windows desktop package is built after web E2E evidence is complete.
- PENDING - Desktop clean-launch and core-flow smoke tests pass before the package is called final.

## 2026-08-05 Non-human And Local Evidence Checks

- PASS - Admin Overview Recent Activity uses the existing admin-only `/admin/logs` endpoint and does not add a public API or database table.
- PASS - `View all logs` opens the System Logs view with the existing risk/flag filters and CSV action.
- PASS - A customer cannot use the admin-only log endpoint because existing ADMIN RBAC remains unchanged.
- PASS - The privacy scanner is documented and demonstrated as a local rule-based warning, not a trained ML model.
- PASS - Sprint 5 end date was extended to 2026/8/9 in the local reviewed Gantt workbook; the original workbook backup was retained.

## 2026-08-06 Device And Deliverable Checks

- PASS - Restore Device is owner-scoped and Premium-only.
- PASS - Restore clears the revoked block but leaves the device inactive until a fresh successful login claims an available slot.
- PASS - Restore-specific service and security tests passed (20/20).
- PENDING - Capture the final Revoke/Restore UI sequence without credentials or tokens.
- PASS - Preliminary slides and scripts were audited against the frozen scope.
- PASS - Final presentation and both video evidence routes are mapped in `docs/FINAL_PRESENTATION_VIDEO_EVIDENCE_MAP_2026-08-06.md`.
- PENDING - Copy and visually verify the teammate's Device B evidence before using it in slides or videos.

## Known Evidence Caveat

The Cloud Storage Usage card currently reads legacy local encrypted-file records and may show `0` while the real provider `.ssenc` list is populated. Do not use the usage number as evidence of cloud file count; use the provider-specific encrypted-file rows.
