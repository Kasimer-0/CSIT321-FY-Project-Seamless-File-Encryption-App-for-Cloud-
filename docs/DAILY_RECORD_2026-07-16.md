# Daily Record - 2026-07-16

> Final-rule correction (2026-07-31): the Premium limit is five active devices, while the cloud-provider limit remains three. The shared HTTPS deployment replaces the earlier two-local-backend test topology.

## Supervisor Decision Applied

- Removed the Physical Token product path from backend source, frontend source, routes, entities, repositories, and tests.
- Removed the old Trusted Package export/import path because Premium multi-device now uses a shared database, shared server configuration, and device-bound access control.
- Replaced the previous scope material with a final implementation baseline that lists only functions kept for final validation.

## Premium Multi-device

- Added owner-scoped device persistence with only the SHA-256 identifier hash stored.
- Added automatic device identification to frontend API requests.
- Bound customer login JWTs to the registered device.
- Enforced one active device for Free accounts and up to five for active paid accounts.
- Kept only the primary device active after paid entitlement expiry or cancellation.
- Added list, rename, and revoke controls and tests for cross-owner access, revoked JWT use, and the five-device limit.

## Runtime Security Detection

- Added sanitized audit events to authentication, device, cloud file, OAuth, decryption, and key-management operations.
- Added persisted score, level, explanation, provider, detector version, and hashed device context.
- Added explainable time-window rules and administrator filters/CSV fields.
- Removed seeded abnormal logs so the administrator view depends on real runtime events.

## Cloud Reliability

- Retained one shared encryption/decryption path for Google Drive, Dropbox, and OneDrive.
- Updated provider refresh flows to save a rotated refresh token when a provider returns one.

## Database Cleanup

- Added `scripts/db/remove_physical_token_schema.sql` as a manual one-time cleanup script.
- The script was not executed against PostgreSQL.

## Verification Status

- Targeted multi-device service tests: passed.
- Targeted anomaly audit tests: passed.
- Targeted device-access security tests: passed.
- Full backend suite: 110 tests passed with zero failures, errors, or skips.
- Frontend TypeScript and Vite production build: passed.
- The generated frontend bundle was synchronized into Spring Boot static resources.
- Spring Boot static frontend smoke test after synchronization: passed.
- Final scope scans found no retired product references in current source or non-historical final documents.

## Human Validation Still Required

- Keep the shared HTTPS deployment online while Device A and Device B collect evidence.
- Use the same Premium account from two registered Windows browser/device profiles.
- Capture Free and Premium two-device behavior.
- Capture cross-device upload/decrypt results for all three providers.
- Capture runtime anomaly events and the administrator risk view.
