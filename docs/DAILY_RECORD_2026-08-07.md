# StealthSync Daily Record - 2026-08-07

## Completed Today

- Added the independent `Desktop-client` Maven module and packaged StealthSync as a native JavaFX window that loads the shared HTTPS service.
- Removed the obsolete desktop profile that bundled Spring Boot, H2 and automatic browser launching. The normal backend remains the shared server only.
- Added strict desktop navigation controls, OAuth system-browser handoff, native Save File dialog support, offline/Retry controls and single-instance behavior.
- Kept the normal web client unchanged: browser OAuth still uses same-tab navigation and browser decrypt still uses a normal download.
- Reworked `scripts/build-desktop.ps1` for the shared-service client, OpenJDK 21.0.2, pinned WiX 3.14.1, a fixed upgrade UUID and SHA-256 output.
- Removed the installed `1.2.1` package, completed a clean install/uninstall/reinstall cycle for `1.3.0`, and verified the desktop and Start Menu shortcuts.
- Reinstalled `1.3.0` as the final local machine state.
- Reviewed the latest Google Drive User Manual and Technical Document without changing the cloud originals.
- Produced local commented revisions for the User Manual installation/hosting guidance and the Technical Document Project Schedule, Premium device limit and desktop NFR wording.
- Updated the Sprint 5 Gantt task to `Three-cloud Regression & Desktop Release` ending 2026-08-09.
- Restored the accidentally cancelled `PremiumUser` demo subscription after an online PostgreSQL backup, then verified `user@stealthsync.com / User@1234` login against the shared deployment.
- Made startup repair the seeded Premium demo subscription so a cancellation test cannot leave the team's fixed Premium credential permanently downgraded.
- Confirmed the deployed password-reset endpoint rejects an incorrect current password without changing the stored password, and clarified that demo subscription cancellation takes effect immediately.

## Desktop Artifacts

- App image: `dist-desktop/StealthSync/StealthSync.exe`
- Installer: `dist-desktop/StealthSync-Setup-1.3.0.exe`
- Checksums: `dist-desktop/SHA256SUMS.txt`
- Installer SHA-256: `ed57074cd1f1eb9ec8d6c9c7e6869b459c6bb59951614f33647c7d8373ed179a`
- App launcher SHA-256: `6c758aa3e3a80b2b38f0f5f8856805a623205e460aec7b937151a8ce9aeeaca1`

The installer is intentionally kept in ignored local output and is not part of the Git source commit. It is unsigned, so another Windows computer may show an Unknown Publisher or SmartScreen warning.

## Verification

- Backend: 144/144 tests passed.
- Frontend: 14/14 Node tests passed.
- TypeScript project build: passed.
- Vite production build: passed.
- Desktop client: 8/8 unit tests passed.
- App-image smoke test: native window, single instance, no local backend/H2 process and no desktop-owned port 8080 listener passed.
- Installed-package smoke test against the local shared service: passed.
- Clean install, uninstall and reinstall: passed with exit code 0; installed version is 1.3.0.
- Existing web-based three-provider and multi-device evidence remains valid because cloud encryption and provider APIs were not reimplemented in the desktop shell.

## Public HTTPS and Automatic Hosting Validation

- The installed desktop client now reaches the fixed public Dev Tunnel URL and loads the StealthSync login page successfully.
- The client recognizes the trusted Microsoft Dev Tunnel first-visit interstitial and continues automatically. A normal web browser may still show Microsoft's one-time confirmation page.
- The Windows scheduled task `StealthSync Shared Deployment` remains `Running` with no execution time limit. The supervisor continues to report healthy containers, local HTTP, tunnel process and public HTTPS.
- Both `http://localhost:8080` and `https://tj867zgk-8080.asse.devtunnels.ms` returned HTTP 200 during the final check.
- A real Windows reboot/re-login check is intentionally deferred until the teammate finishes recording, because rebooting the host would interrupt the shared service. The configured logon trigger, 60-second delay, continuous supervisor and heartbeat are in place.

## Evidence

- `outputs/desktop-validation/2026-08-07/DESKTOP-02-installed-login.png`: installed 1.3.0 client loading the shared frontend through the loopback validation endpoint.
- `outputs/desktop-validation/2026-08-07/installer-install.log`
- `outputs/desktop-validation/2026-08-07/installer-reinstall.log`

No password, JWT, OAuth token, client secret or database credential is included in these artifacts.

## Next Priority - 2026-08-08

1. Complete the teammate's desktop three-provider recording and retain the final screenshots plus SHA-256 evidence.
2. Perform the host reboot/re-login automatic-start check after recording is complete.
3. Review the local User Manual, Technical Document and revised Project Schedule generated on 2026-08-07, then merge the accepted changes into the Google Drive originals.
4. Update the final presentation and both video scripts with the validated desktop and shared-hosting status.
5. Do not upload a GitHub Release until the external desktop smoke test and reboot/re-login check are complete.
