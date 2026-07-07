# Daily Record - 2026-07-02

## Supervisor scope

Google Drive, Dropbox, and OneDrive must all be real cloud providers for the final demo. Each provider must support OAuth, encrypted upload, encrypted file listing, encrypted download, local decrypt-save, and delete. Prototype-only cloud links are no longer acceptable.

## Current code assessment

- Provider abstraction is present through `CloudStorageAdapter`.
- `CloudStorageController` routes provider-neutral endpoints under `/cloud-storage/{provider}/...`.
- Google Drive is already wired into the unified provider structure and still supports `google-drive` and `google_drive` naming.
- Dropbox has a real OAuth and encrypted object-transfer implementation, not a fake/prototype URL.
- OneDrive has a Microsoft Graph based implementation for OAuth, token refresh, upload, list, download, and delete. It still requires real Azure credentials before end-to-end validation can be claimed.

## Dropbox status

- OAuth URL uses `https://www.dropbox.com/oauth2/authorize`.
- Missing credentials return a clear configuration error.
- Callback exchanges authorization code for access/refresh tokens.
- Tokens are stored in owner-scoped provider credentials and are not returned to the frontend.
- Upload packages encrypted bytes with encrypted metadata before sending data to Dropbox.
- List reads StealthSync files from the Dropbox app folder and parses encrypted metadata.
- Download retrieves ciphertext and passes it back into the shared decrypt-save flow.
- Delete removes the selected owner-scoped Dropbox encrypted object.

## OneDrive status

- OAuth URL uses Microsoft identity platform under `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`.
- Required scopes are `offline_access User.Read Files.ReadWrite`.
- Missing credentials return a clear configuration error.
- Callback exchanges authorization code for tokens and stores them in owner-scoped provider credentials.
- Refresh-token logic is implemented for expired access tokens.
- Upload uses Microsoft Graph `PUT /me/drive/root:/StealthSync/{name}:/content` for small encrypted files.
- List uses Microsoft Graph folder children and parses encrypted metadata from the packaged encrypted object.
- Download uses Microsoft Graph `/me/drive/items/{id}/content`.
- Delete uses Microsoft Graph `/me/drive/items/{id}`.
- Real E2E testing is blocked until Azure app credentials are configured locally.

## Encryption boundary

- New cloud uploads go through `keyID + keyPassword`.
- `keyPassword` is request-scoped and is not stored.
- Raw keys and derived keys are not returned to the frontend.
- Provider client secrets are read from environment-backed configuration, not hard-coded.
- The legacy demo passphrase remains only as a fallback for old cloud files without key metadata.

## Manual setup still required

### Dropbox

1. Create a Dropbox Developer App.
2. Configure the redirect URI, for example `http://localhost:8080/cloud-storage/dropbox/callback`.
3. Add scopes: `files.metadata.read`, `files.content.write`, `files.content.read`, `offline_access`.
4. Set local credentials through environment variables or a local-only properties file:
   - `DROPBOX_CLIENT_ID`
   - `DROPBOX_CLIENT_SECRET`
   - `DROPBOX_REDIRECT_URI`
5. Confirm secrets are not committed.

### OneDrive

1. Create an Azure App Registration.
2. Configure the redirect URI, for example `http://localhost:8080/cloud-storage/onedrive/callback`.
3. Add delegated Microsoft Graph permissions:
   - `Files.ReadWrite`
   - `offline_access`
   - `User.Read`
4. Set local credentials through environment variables or a local-only properties file:
   - `ONEDRIVE_CLIENT_ID`
   - `ONEDRIVE_CLIENT_SECRET`
   - `ONEDRIVE_REDIRECT_URI`
   - `ONEDRIVE_TENANT`
5. Confirm secrets are not committed.

### Google Drive

1. Confirm existing Google Drive OAuth credentials are still valid.
2. Confirm the redirect URI matches `/cloud-storage/google-drive/callback`.
3. Prepare a Google Drive test account for final evidence.

## Next priority for 2026-07-03

Run real credential-backed E2E tests in this order: Dropbox, OneDrive, then Google Drive regression. Capture upload/list/wrong-password/correct-password/delete evidence for each provider.
