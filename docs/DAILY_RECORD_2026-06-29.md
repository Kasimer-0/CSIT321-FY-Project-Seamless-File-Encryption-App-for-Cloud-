# Daily Record - 2026-06-29

## Supervisor Scope Change

The supervisor confirmed that Google Drive, Dropbox, and OneDrive must all support real encrypted upload and download. Dropbox and OneDrive are no longer Future Work or prototype-only links.

## Current Three-Provider Status

- Google Drive: already supports real OAuth, token refresh, encrypted upload, list, download/decrypt-save, delete, randomized object names, and encrypted metadata.
- Dropbox: was a stub using `UnsupportedOperationException`; today it was converted into a real OAuth and encrypted file adapter skeleton with upload/list/download/delete logic.
- OneDrive: was a stub using `UnsupportedOperationException`; today it was converted into a Microsoft Graph adapter skeleton with upload/list/download/delete logic.
- Frontend: upload now targets the active linked provider; decrypt now lists files from all connected providers.

## Architecture Decision

- Use a provider-neutral `CloudStorageAdapter` contract for OAuth, status, list, encrypted upload, download, and delete.
- Keep all encryption/decryption in the backend controller/service flow with:
  - `EncryptionKeyService`
  - `EncryptionPolicyService`
  - `AesGcmService`
  - `keyID + keyPassword`
- Provider services only move ciphertext bytes and encrypted metadata.
- Dropbox and OneDrive use a portable encrypted metadata package because they do not expose Google-style `appProperties` in the current implementation.

## Credentials Needed From Humans

- Dropbox app credentials:
  - `DROPBOX_CLIENT_ID`
  - `DROPBOX_CLIENT_SECRET`
  - `DROPBOX_REDIRECT_URI`
- Azure / OneDrive app credentials:
  - `ONEDRIVE_CLIENT_ID`
  - `ONEDRIVE_CLIENT_SECRET`
  - `ONEDRIVE_REDIRECT_URI`
  - optional `ONEDRIVE_TENANT`, default `common`
- Test accounts for Google Drive, Dropbox, and OneDrive.
- Redirect URIs must point to the local desktop backend callback routes:
  - `http://localhost:8080/cloud-storage/oauth/google/callback`
  - `http://localhost:8080/cloud-storage/oauth/dropbox/callback`
  - `http://localhost:8080/cloud-storage/oauth/onedrive/callback`

## Completed Today

- Scanned current Google Drive, Dropbox, OneDrive, cloud controller, crypto services, and cloud frontend pages.
- Confirmed Dropbox and OneDrive were previously non-real stubs.
- Added provider-neutral cloud DTO and OAuth credential table.
- Expanded `CloudStorageAdapter` to support OAuth/status/list/upload/download/delete.
- Kept Google Drive working through the new adapter interface.
- Implemented Dropbox OAuth/token storage/upload/list/download/delete path.
- Implemented OneDrive OAuth/token storage/upload/list/download/delete path.
- Added encrypted metadata packaging for providers without app properties.
- Updated cloud controller to expose provider-neutral endpoints.
- Updated frontend upload/decrypt flows to use connected providers instead of hard-coded Google Drive.
- Added trusted-device key package plan.

## Tomorrow First Task

Run a real manual credentials test in this order:

1. Configure Dropbox credentials and connect Dropbox.
2. Upload a file through active-provider upload.
3. Confirm Dropbox receives only ciphertext.
4. Decrypt-save the Dropbox file.
5. Repeat the same test for OneDrive.
6. Fix any provider-specific API response edge cases found during manual OAuth testing.
