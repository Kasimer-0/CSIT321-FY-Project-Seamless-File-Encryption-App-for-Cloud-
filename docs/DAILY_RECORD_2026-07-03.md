# Daily Record - 2026-07-03

## Supervisor and teammate scope

The final cloud scope remains Google Drive, Dropbox, and OneDrive as real OAuth-backed providers. The teammate also clarified that a user may link multiple cloud accounts, but only one cloud link should be active at a time.

## Active cloud link decisions

- New OAuth connections are automatically marked active after the callback completes.
- Activating one link automatically deactivates the same user's other cloud links.
- Deactivation does not remove the link, does not disconnect the provider, and does not delete stored provider credentials.
- Cloud upload now requires the requested provider to be the current active provider.
- `GET /cloud-storage/links/active` returns a clear inactive response when no active provider exists instead of failing.

## Frontend behavior

- Cloud Storage Links uses `POST /cloud-storage/links/{linkID}/activate`.
- Cloud Storage Links uses `POST /cloud-storage/links/{linkID}/deactivate`.
- The page explains that only one account can be active at a time.
- The add/connect dialog tells users that a newly connected provider becomes active automatically.
- Encrypt and Upload displays the current upload destination with provider and account email.
- Encrypt and Upload no longer falls back to the first connected provider when no provider is active.
- Decrypt and Download already shows the provider badge for each cloud file.

## Provider status

- Google Drive remains integrated through the unified provider API.
- Dropbox has real OAuth, callback, token save/refresh, upload, list, download/decrypt, and delete code paths.
- OneDrive has Microsoft Graph OAuth, callback, token save/refresh, upload, list, download/decrypt, and delete code paths.
- Real credential-backed E2E testing is still blocked until local provider credentials and test accounts are supplied.

## Security notes

- Active/deactivate operations are owner-scoped through the current JWT user.
- Upload/download operations do not trust frontend-supplied `ownerID`.
- New uploads still require `keyID + keyPassword`.
- `keyPassword` is not stored.
- Provider tokens are not returned to the frontend.
- Provider client secrets are read from local configuration/environment variables.
- The legacy demo passphrase is only a compatibility fallback for old cloud files without key metadata.

## Tests

- Targeted backend provider/link tests passed.
- Full backend `mvn test` passed.
- Frontend TypeScript/Vite build passed through bundled Node and pnpm.

## Next priority for 2026-07-04

Use real provider credentials to run E2E evidence capture for Dropbox first, then OneDrive, then Google Drive regression. Each provider should show link, activate, encrypt upload, list, wrong-password rejection, correct-password decrypt-save, and delete.
