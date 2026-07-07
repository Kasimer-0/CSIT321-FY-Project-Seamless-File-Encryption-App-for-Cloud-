# Daily Record - 2026-06-30

## Supervisor Requirement Confirmed

The final Windows scope must support three real cloud providers:

- Google Drive
- Dropbox
- OneDrive

Each provider must support real OAuth login, encrypted ciphertext upload, ciphertext download, local decryption, and delete/list operations. Dropbox and OneDrive must not be described as prototype-only providers.

## Current Code Status

- Google Drive remains the mature provider with OAuth, token refresh, encrypted upload/list/download/delete, randomized object names, and encrypted metadata.
- Dropbox has a real OAuth and file-transfer adapter path, but still requires a Dropbox developer app and local credentials before manual E2E testing.
- OneDrive has a real Microsoft Graph adapter path, but still requires Azure app registration and local credentials before manual E2E testing.
- Upload and decrypt flows use `keyID + keyPassword`; the provider layer only moves ciphertext bytes.
- The legacy demo passphrase is retained only as a fallback for old Google Drive demo files with no key metadata. New uploads do not use it.

## Architecture Work Completed Today

- Added compatibility for the provider-style API shape:
  - `GET /cloud-storage/{provider}/auth`
  - `GET /cloud-storage/{provider}/callback`
- Kept old callback compatibility:
  - `GET /cloud-storage/oauth/{provider}/callback`
- Updated default redirect URI configuration to the provider-style callbacks.
- Updated the frontend Cloud Storage page to start OAuth through the provider-style auth endpoint.
- Confirmed frontend upload sends `keyID` and `keyPassword` to the provider-neutral backend upload endpoint.
- Confirmed frontend decrypt sends `keyPassword` to the provider-neutral decrypt-save endpoint.

## Manual Setup Required

- Dropbox:
  - create a Dropbox Developer Console app
  - set `DROPBOX_CLIENT_ID`
  - set `DROPBOX_CLIENT_SECRET`
  - set `DROPBOX_REDIRECT_URI`
  - configure redirect URI: `http://localhost:8080/cloud-storage/dropbox/callback`
  - grant at least `files.metadata.read`, `files.content.write`, and `files.content.read`
- OneDrive:
  - create an Azure app registration
  - set `ONEDRIVE_CLIENT_ID`
  - set `ONEDRIVE_CLIENT_SECRET`
  - set `ONEDRIVE_REDIRECT_URI`
  - optionally set `ONEDRIVE_TENANT`, default `common`
  - configure redirect URI: `http://localhost:8080/cloud-storage/onedrive/callback`
  - grant delegated `Files.ReadWrite`, `offline_access`, and `User.Read`
- Do not commit any client secrets to GitHub.

## Next Priority - 2026-07-01

Use real Dropbox credentials first and verify the full flow:

1. Connect Dropbox OAuth.
2. Upload a file through the active-provider upload page.
3. Confirm Dropbox stores ciphertext only.
4. List the encrypted Dropbox object.
5. Decrypt-save it locally with the correct key password.
6. Confirm wrong key password fails.

After Dropbox passes, repeat the same flow with OneDrive.
