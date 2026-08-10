# Daily Record - 2026-08-09

## Automatic Hosting Recovery

- Reproduced the post-restart failure: the Windows task launched, found `.stealthsync-run/shared-deployment.disabled`, and exited without starting Docker or the Dev Tunnel.
- Confirmed the marker was left by the explicit `-Stop` action on 2026-08-07 and survived later Windows logons.
- Updated the health supervisor so a new scheduled-task session clears the previous hosting-session marker. `-Stop` still ends and disables the currently running supervisor, while the next explicit task start or Windows logon can recover automatically.
- Started the scheduled task and observed automatic recovery of Docker Desktop, PostgreSQL, the Spring Boot app and the persistent Dev Tunnel.
- Restarted the supervisor once after recovery to verify it reused the healthy containers and tunnel instead of duplicating them.

## Verified State

- Scheduled task `StealthSync Shared Deployment`: `Running`.
- Disabled marker: absent.
- PostgreSQL container: healthy.
- Application container: running.
- `http://localhost:8080`: HTTP 200 with the expected StealthSync page marker.
- `https://tj867zgk-8080.asse.devtunnels.ms`: HTTP 200 with the expected StealthSync page marker.
- PowerShell parser and targeted `git diff --check` for the supervisor script: passed.

A real second Windows reboot/re-login is still the final human acceptance check. After login, allow up to 90 seconds for Docker Desktop, the app and the tunnel to recover before opening the desktop client.

## Teammate Desktop Validation Package

Created the private ignored package:

`outputs/teammate-desktop-validation-2026-08-09/StealthSync-Desktop-Validation-Kit-2026-08-09.zip`

Package SHA-256:

`721ed8150f53d828c62954e573228b1155880dfebc0a796b611d7618a3911dd7`

It contains the 1.3.0 installer, checksum manifest, Device B provider-specific test files, a concise `START-HERE.md`, and a printable DOCX guide covering clean install, Premium login, Devices evidence, all three provider flows, wrong-password rejection, correct decrypt, SHA-256 comparison and delete evidence.

The DOCX was structurally checked. Automated visual rendering was unavailable because LibreOffice is not installed, and the hidden Microsoft Word export attempt did not complete; therefore the teammate should open the DOCX once before distribution and confirm its page breaks visually.

## Git Status

- No commit or push was performed.
- The automatic-hosting fix and the latest Premium/desktop fixes remain in the existing local dirty worktree and must be separated from generated output before the final main-branch push.
