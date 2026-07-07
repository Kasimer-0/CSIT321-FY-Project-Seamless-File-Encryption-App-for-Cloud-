# Daily Record - 2026-07-04

## Scope checked today

The current P0 scope remains three real cloud providers: Google Drive, Dropbox, and OneDrive. Each provider must support real OAuth, encrypted upload, encrypted list, encrypted download/decrypt-save, and delete. Prototype-only links are not acceptable.

## Active cloud link status

- `GET /cloud-storage/links` is present.
- `GET /cloud-storage/links/active` is present.
- `POST /cloud-storage/links/{linkID}/activate` is present.
- `POST /cloud-storage/links/{linkID}/deactivate` is present.
- Activation is owner-scoped through the current JWT user.
- Activating one link deactivates the same user's other links.
- Deactivation does not unlink the provider and does not delete provider tokens.
- New OAuth links become active automatically after callback completion.

## Frontend status

- Cloud Storage Links shows linked providers, account email, status, active badge, connect, activate, and deactivate actions.
- Encrypt and Upload shows the current upload destination.
- Encrypt and Upload blocks cloud upload when no active provider is selected.
- Decrypt and Download shows provider badges for cloud files.

## Provider status

### Google Drive

- Still integrated through the unified cloud provider API.
- Existing Google Drive provider tests pass.

### Dropbox

- Real Dropbox OAuth URL is implemented.
- Callback exchanges code for tokens.
- Access token and refresh token are stored server-side.
- Tokens are not returned to the frontend.
- Upload/list/download/delete code paths are present.
- Missing configuration returns a clear Dropbox setup error.
- Real E2E is still blocked until credentials are supplied.

### OneDrive

- Real Microsoft OAuth URL is implemented.
- Microsoft Graph token exchange, refresh, upload, list, download, and delete code paths are present.
- Missing configuration returns a clear OneDrive setup error.
- Real E2E is still blocked until Azure app credentials are supplied.

## Encryption and security status

- New cloud uploads require `keyID + keyPassword`.
- `keyPassword` is request-scoped and is not stored.
- Raw keys and derived keys are not returned to the frontend.
- Cloud provider operations use the current JWT user, not frontend-supplied `ownerID`.
- Provider client secrets are read from local configuration/environment variables.
- The legacy demo passphrase remains only for old cloud files without key metadata.

## Tests run today

- Backend `mvn test`: passed, 68 tests.
- Frontend TypeScript/Vite build through bundled Node and pnpm: passed.
- `git diff --check`: pending final clean check after this record file.

## Blockers

Real cloud E2E testing still needs manual credentials and test accounts:

- Dropbox Developer App, app key/client ID, client secret, redirect URI, scopes, and test account.
- Azure App Registration, Microsoft Graph client ID, client secret, redirect URI, delegated scopes, and OneDrive test account.
- Existing Google Drive OAuth credentials and redirect URI confirmation.

## Next priority for 2026-07-05

If credentials are available, run and capture real E2E evidence for Dropbox, then OneDrive, then Google Drive regression. Each provider should show link, activate, encrypted upload, file list, wrong-password rejection, correct-password decrypt-save, and delete.
