# StealthSync Daily Record - 2026-08-07

## Completed Today

- Added the independent `Desktop-client` Maven module and packaged StealthSync as a native JavaFX window that loads the shared HTTPS service.
- Removed the obsolete desktop profile that bundled Spring Boot, H2 and automatic browser launching. The normal backend remains the shared server only.
- Added strict desktop navigation controls, OAuth system-browser handoff, native Save File dialog support, offline/Retry controls and single-instance behavior.
- Kept the normal web client unchanged: browser OAuth still uses same-tab navigation and browser decrypt still uses a normal download.
- Reworked `scripts/build-desktop.ps1` for the shared-service client, OpenJDK 21.0.2, pinned WiX 3.14.1, a fixed upgrade UUID and SHA-256 output.
- Removed the installed `1.2.1` package, completed a clean install/uninstall/reinstall cycle for `1.3.0`, and verified the desktop and Start Menu shortcuts.
- Reinstalled `1.3.0` as the final local machine state.

## Desktop Artifacts

- App image: `dist-desktop/StealthSync/StealthSync.exe`
- Installer: `dist-desktop/StealthSync-Setup-1.3.0.exe`
- Checksums: `dist-desktop/SHA256SUMS.txt`
- Installer SHA-256: `63cfd7b94c73926271ef69543956840688d7fdc0124f76c1b8b5cb708bcfae0e`
- App launcher SHA-256: `8e6afe7f4da5be1745bc3320faea7d32bee34689c253284a0e274a827969dc01`

The installer is intentionally kept in ignored local output and is not part of the Git source commit. It is unsigned, so another Windows computer may show an Unknown Publisher or SmartScreen warning.

## Verification

- Backend: 143/143 tests passed.
- Frontend: 14/14 Node tests passed.
- TypeScript project build: passed.
- Vite production build: passed.
- Desktop client: 4/4 unit tests passed.
- App-image smoke test: native window, single instance, no local backend/H2 process and no desktop-owned port 8080 listener passed.
- Installed-package smoke test against the local shared service: passed.
- Clean install, uninstall and reinstall: passed with exit code 0; installed version is 1.3.0.
- Existing web-based three-provider and multi-device evidence remains valid because cloud encryption and provider APIs were not reimplemented in the desktop shell.

## Public HTTPS Validation Note

The fixed Dev Tunnel is online, but this computer's current network replaces the `devtunnels.ms` TLS certificate with an untrusted Fortinet certificate and returns a Fortinet block page to non-browser clients. The desktop client correctly refuses to bypass TLS verification and shows its offline page. Local hosted-client behavior is verified; a public-service desktop login and the three live provider flows must be repeated on the teammate's normal network before the installer is called the final Release Candidate.

This is an environment-specific validation blocker, not a failure of Google Drive, Dropbox, OneDrive, encryption, JWT or owner isolation. Do not add a permissive certificate bypass to the product.

## Evidence

- `outputs/desktop-validation/2026-08-07/DESKTOP-02-installed-login.png`: installed 1.3.0 client loading the shared frontend through the loopback validation endpoint.
- `outputs/desktop-validation/2026-08-07/installer-install.log`
- `outputs/desktop-validation/2026-08-07/installer-reinstall.log`

No password, JWT, OAuth token, client secret or database credential is included in these artifacts.

## Next Priority - 2026-08-08

1. Install `1.3.0` on the teammate's Windows computer and verify the public HTTPS login without the local Fortinet interception.
2. Run the desktop Google Drive, Dropbox and OneDrive upload/list/wrong-password/correct-decrypt-save/delete smoke sequence and retain screenshots plus SHA-256 results.
3. Copy the teammate's existing Device B evidence into the final evidence root and verify every path.
4. Update the Technical Document, User Manual, final presentation and both video scripts with the validated desktop status.
5. Do not upload a GitHub Release until the external desktop smoke test is complete.
