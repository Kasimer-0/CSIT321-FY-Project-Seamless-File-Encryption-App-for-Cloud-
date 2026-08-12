# StealthSync Daily Record - 2026-08-12

## Production Validation

- Confirmed `https://stealthsyncfyp26s211.duckdns.org` and
  `/actuator/health` return HTTP 200 through Caddy HTTPS.
- Confirmed PostgreSQL, backend, frontend, and Caddy are running on the Azure
  Ubuntu VM; the health-checked services report healthy.
- Confirmed migrated test accounts can log in and the project team completed
  live Google Drive, Dropbox, and OneDrive functional checks.
- Confirmed the production environment file remains VM-only with mode `600`.
  No secret value was added to Git, Drive documents, screenshots, or this
  record.

## Automated Checks

- Backend: 153/153 tests passed.
- Frontend: 14/14 tests, TypeScript, and Vite production build passed.
- Desktop client: 11/11 tests passed.
- Production Compose expansion and `git diff --check` passed.

## Windows Client

- Rebuilt `StealthSync 1.3.0` with
  `https://stealthsyncfyp26s211.duckdns.org` embedded as its hosted-service
  URL.
- Verified the packaged configuration no longer contains the Dev Tunnel URL.
- Verified native-window startup, hosted-service access, single-instance
  behavior, and absence of a bundled local Spring Boot/H2 service.
- Regenerated the installer and SHA-256 manifest.

## Submission Artifacts

- Downloaded backups of the current User Manual, Technical Document,
  Presentation Slides, and Peer Assessment Form from the final Drive folder.
- Prepared highlighted local review copies for the User Manual and Technical
  Document, plus a cyan-marked Presentation copy.
- Prepared a Word change index that identifies each changed location and the
  reason for the change.
- Reviewed the Peer Assessment Form without modifying it: two members are
  listed, their contribution indexes total 200, and contribution descriptions
  are present.

## Remaining Evidence

- Azure VM reboot and automatic container restoration.
- Availability while the development Windows PC is powered off.
- Off-VM backup restoration and continuous uptime through the required month.
- Clean installer and live three-provider smoke test on the teammate's Windows
  computer.
- Lecturer acceptance of the Peer Assessment Form's textual signatures.
