# Daily Record - 2026-08-04

## Objective

Stabilize the shared Windows-hosted deployment and move the Google OAuth client out of Testing before final evidence collection.

## Release Backup

- Created and verified a release backup at:
  `outputs/release-backups/2026-08-04/20260804-100836/`
- The PostgreSQL custom-format dump passed `pg_restore --list` validation with 125 entries.
- The Vault ZIP was readable and the SHA-256 manifest matched all payloads.
- The DPAPI environment backup decrypted to the same SHA-256 as the current private `.env.production` file.
- An earlier interrupted attempt is retained as `20260804-100744.incomplete` and must not be used for recovery.

## Shared Deployment Supervisor

The former scheduled task ran a one-shot launcher and did not remain available to monitor the deployment. The replacement task runs a persistent health supervisor under the current Windows user.

Implemented behavior:

- Checks Docker, PostgreSQL health, the app container, the tracked Dev Tunnel process, localhost HTTP, and public HTTPS every 60 seconds.
- Uses a named mutex to prevent duplicate supervisors.
- Reuses healthy containers and the existing tunnel host.
- Retries recovery through the non-interactive shared-deployment launcher.
- Writes a heartbeat every 15 minutes and rotates the operational log at 5 MB.
- A deliberate `-Stop` creates a disabled marker so the supervisor does not undo a user-requested shutdown.
- The scheduled task has no execution-time limit and retries an unexpected supervisor exit up to three times at two-minute intervals.

Observed recovery evidence:

- Manually stopped app container: local HTTP recovered to `200` in 34 seconds.
- Manually terminated Dev Tunnel host: a new single host process and public HTTPS `200` were restored in 39 seconds.
- Deliberate stop: app, database, and tunnel remained stopped for the full five-minute check.
- Normal recovery: task returned to `Running`; localhost and the fixed public URL returned `200`; exactly one tunnel host remained.

The public URL remains:

`https://tj867zgk-8080.asse.devtunnels.ms`

This topology still depends on this Windows user being logged in, the computer being powered and online, and Docker Desktop/Dev Tunnel remaining available.

## Google OAuth Production

Google Cloud project `StealthSync-Demo` is now an External Production application. It is not submitted for full brand verification because the project uses only the following minimum scopes:

- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/userinfo.email`

The registered production callback was verified as:

`https://tj867zgk-8080.asse.devtunnels.ms/cloud-storage/google-drive/callback`

`PremiumUser` was reauthorized after publication and now shows:

`Google Drive - kasimer.zero@gmail.com`

The account's existing encrypted Google Drive objects remained visible after reauthorization. Production removes the fixed seven-day refresh-token behavior associated with an External Testing app, but a token can still become invalid after user revocation, account security events, prolonged inactivity, or provider policy enforcement.

Pending manual action:

- `testuser -> nekohuii@gmail.com` must be reauthorized by the teammate from a familiar Google device/network. No credential was copied or manufactured for that user.

## Dropbox And OneDrive Validation

Callbacks were verified from the private production configuration without recording secrets:

- `https://tj867zgk-8080.asse.devtunnels.ms/cloud-storage/dropbox/callback`
- `https://tj867zgk-8080.asse.devtunnels.ms/cloud-storage/onedrive/callback`

For Google Drive, Dropbox, and OneDrive, a provider-neutral V2 smoke test completed all of the following with the final Premium AES-256-GCM key:

- provider status connected;
- encrypted upload;
- encrypted file list;
- ciphertext download;
- correct-password decryption;
- wrong-password rejection;
- remote delete and local index cleanup.

All temporary cloud objects were deleted and Google Drive was restored as the active provider.

Token lifecycle notes:

- Dropbox continues to request `token_access_type=offline`; its refresh token has no fixed expiry but can be revoked.
- OneDrive continues to request `offline_access` through an authorization-code confidential-client flow and stores rotated refresh tokens. Its normal lifecycle is provider-controlled and commonly around 90 days, not Google's Testing seven-day rule.

## Scope And Next Action

No business API, schema, encryption policy, provider limit, device limit, or frontend workflow changed today.

Next priorities:

1. Teammate reauthorizes `testuser -> nekohuii@gmail.com` and captures the final Google evidence.
2. Keep the shared PC online during evidence capture and monitor `.stealthsync-run/logs/autostart.log`.
3. Continue final documentation, video, and presentation closure before returning to the Windows installer.
