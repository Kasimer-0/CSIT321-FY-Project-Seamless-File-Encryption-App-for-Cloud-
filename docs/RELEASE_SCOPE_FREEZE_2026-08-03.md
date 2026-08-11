# StealthSync Release Scope Freeze

Date: 2026-08-03
Internal release-candidate deadline: 2026-08-09 21:00 Singapore time

## Final Implemented Scope

- Real OAuth integration with Google Drive, Dropbox, and OneDrive.
- Browser-side AES-GCM encryption before ciphertext upload and browser-side decryption after download.
- Password-protected encryption keys with subscription policy enforcement: Free uses AES-128; an active paid account may use AES-256-GCM.
- JWT authentication, administrator RBAC, owner-scoped APIs, and device-bound customer sessions.
- One active device for Free accounts and up to five active devices for paid accounts.
- One cloud provider for Free accounts and up to three providers for paid accounts.
- Multi-device use through the same paid StealthSync account and shared backend/database.
- Account/login recovery phrase for paid accounts.
- Explainable rule-based privacy warnings and security anomaly flags, including administrator logs and CSV reports.

## Cloud Account Semantics

- **Active** means the provider is the current default upload destination.
- **Deactivate** removes that upload-destination status but keeps the OAuth connection, file listing, and download access.
- **Remove** deletes the StealthSync OAuth connection. Existing provider objects remain in the user's cloud account and require reconnection before StealthSync can access them again.
- **Delete file** removes the selected ciphertext object and its owner-scoped StealthSync index record.
- Cloud file ciphertext is stored by the selected provider. PostgreSQL stores owner-scoped IDs and encrypted metadata, not a second copy of the cloud ciphertext.

## Frozen Claims And Deferred Work

- The anomaly detector is rule-based and explainable; it is not a trained ML model.
- Recovery Phrase is for account/login recovery, not raw key or master-key recovery.
- Physical Token remains a registration/status prototype and is not hardware-backed authentication.
- Cross-account workspace sharing, a full ticket lifecycle, trusted-package import/export, and true hardware token authentication are not part of the final implementation.
- No new business feature enters the release after this freeze. Only blocking defects, deployment work, evidence, documentation, video, and installer tasks remain.

## Remaining Delivery Work

1. Keep the shared Windows-hosted Docker/PostgreSQL deployment available through the persistent HTTPS Dev Tunnel.
2. Publish and revalidate final OAuth callback settings for all three providers.
3. Complete final three-cloud and multi-device regression evidence.
4. Package and smoke-test the Windows desktop client/installer against the validated shared service.
5. Synchronize the Technical Document, User Manual, presentation, videos, source archive, peer assessment, and reflective diaries.

## Freeze Baseline

- Backend automated tests: 145 passed.
- Frontend automated tests: 11 passed.
- TypeScript and Vite production build: passed.
- Local application endpoint: HTTP 200.
- Shared public HTTPS endpoint: HTTP 200.

## Hosted Production Amendment - 2026-08-11

The feature scope above remains frozen. The delivery topology is upgraded from the Windows-hosted Dev Tunnel to a Render Static Site, paid Render Web Service, and paid Render PostgreSQL. The former Docker/Dev Tunnel deployment remains a local development and rollback option only.

Final production acceptance now requires the manual hosting, OAuth, persistence, external-network, and billing gates in [`PRODUCTION_DEPLOYMENT_CHECKLIST.md`](PRODUCTION_DEPLOYMENT_CHECKLIST.md). The Windows installer must be rebuilt with the assigned production frontend URL before release.
