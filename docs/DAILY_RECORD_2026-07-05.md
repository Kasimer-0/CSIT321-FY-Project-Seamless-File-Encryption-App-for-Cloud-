# Daily Record - 2026-07-05

## Work completed today

- Audited Google Drive, Dropbox, OneDrive, CloudStorageLink active/deactivate, and frontend cloud pages.
- Removed stale frontend FAQ wording that described Dropbox and OneDrive as link records only.
- Updated the scope baseline so Dropbox and OneDrive are no longer listed as Future Work.
- Updated the weekly supervisor plan so Dropbox and OneDrive are documented as P0 real provider requirements, with live E2E blocked only by missing credentials.

## Three-provider progress table

| Provider | OAuth | Token Save / Refresh | Upload | List | Download / Decrypt | Delete | Current blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Drive | Implemented | Implemented | Implemented | Implemented | Implemented | Implemented | Confirm existing credentials and run regression E2E |
| Dropbox | Implemented | Implemented | Implemented | Implemented | Implemented | Implemented | Configure Dropbox developer app credentials and run E2E |
| OneDrive | Implemented | Implemented | Implemented | Implemented | Implemented | Implemented | Configure Azure app registration credentials and run E2E |

## Active cloud link status

- Users can link multiple providers within the plan limit.
- Only one cloud link can be active at a time.
- Activating one link deactivates other links owned by the same user.
- Deactivating a link does not remove the link and does not delete provider tokens.
- Upload requires the requested provider to be the active provider.

## Frontend status

- Cloud Storage Links shows provider, account email, status, active badge, Connect, Activate, and Deactivate.
- Missing provider credentials show Setup required / Not configured states.
- Encrypt and Upload shows the current upload destination and blocks upload if no active provider is selected.
- Decrypt and Download shows the provider badge for each cloud file.
- The FAQ now describes Google Drive, Dropbox, and OneDrive as supported configurable providers rather than prototype-only records.

## Security status

- Cloud operations resolve identity from JWT/current user, not frontend `ownerID`.
- New uploads require `keyID + keyPassword`.
- `keyPassword` is not stored.
- Raw keys and derived keys are not returned to the frontend.
- Provider tokens are not returned to the frontend.
- Client secrets are read from local environment-backed configuration.
- The legacy demo passphrase is only a compatibility fallback for old cloud files without key metadata.

## Blockers

- Dropbox E2E needs a Dropbox Developer App, client ID, client secret, redirect URI, scopes, and a test account.
- OneDrive E2E needs Azure App Registration, client ID, client secret, redirect URI, delegated Graph scopes, and a test account.
- Google Drive E2E needs existing credentials and redirect URI confirmation.
- Multi-device evidence still needs a second Windows profile/device/VM.

## Manual TODO

1. Configure Dropbox credentials:
   - `DROPBOX_CLIENT_ID`
   - `DROPBOX_CLIENT_SECRET`
   - `DROPBOX_REDIRECT_URI`
2. Configure OneDrive credentials:
   - `ONEDRIVE_CLIENT_ID`
   - `ONEDRIVE_CLIENT_SECRET`
   - `ONEDRIVE_REDIRECT_URI`
   - `ONEDRIVE_TENANT`
3. Confirm Google Drive credentials:
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REDIRECT_URI`
4. Keep all secrets out of Git.

## Plan for 2026-07-06

If credentials are available, run real E2E in this order: Dropbox, OneDrive, Google Drive regression. Capture evidence for connect, activate, encrypted upload, list, wrong-password rejection, correct-password decrypt-save, and delete. If credentials are still unavailable, continue final documentation and explicitly label E2E as blocked by manual credentials.
