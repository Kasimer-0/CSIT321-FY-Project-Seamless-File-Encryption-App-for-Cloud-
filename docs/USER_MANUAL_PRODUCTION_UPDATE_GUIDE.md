# User Manual Production Update Guide

Use these edits only after the Azure deployment passes the external acceptance
checklist. Do not replace the final User Manual with unverified placeholders.

## Final User Section

State that users may either:

1. Open `https://<YOUR_DUCKDNS_DOMAIN>/` in a current Edge or Chrome browser; or
2. Install the Windows client built against that same production URL.

Users require an Internet connection, a StealthSync account, and the relevant
Google Drive, Dropbox, or OneDrive account. They do **not** install or start
Java, Maven, Node.js, PostgreSQL, Docker, Caddy, PowerShell, or Dev Tunnel.

The Windows client is a desktop window for the hosted web system. It is not a
local server and the end user does not keep the Azure VM running.

## Deployment Administrator Appendix

Do not mix operator commands into normal installation steps. Add a short link
or appendix pointing maintainers to `deploy/production/README.md`. That runbook
contains Azure, Docker Compose, DuckDNS, Caddy, OAuth, backup, and update tasks.

## Wording Checks

- Replace any Dev Tunnel URL with the verified DuckDNS URL.
- Describe the workflow as client-side encryption, not proven absolute zero
  knowledge.
- Describe privacy warnings and suspicious logs as explainable rule-based
  detection, not a trained ML model.
- Describe Recovery Phrase as account/login recovery only.
- Keep Premium limits at S$7, three cloud providers, and five active devices.
- Do not include demo passwords, provider secrets, JWTs, OAuth codes, database
  credentials, or the VM private key.

## Evidence To Add

- Production login page with the final HTTPS hostname visible.
- Phone/mobile-network access while the development PC is off.
- Google Drive, Dropbox, and OneDrive callbacks and encrypted-file flows.
- Correct and wrong Key Password results with matching plaintext SHA-256.
- PostgreSQL persistence after container restart and successful VM reboot.
- Optional Windows client clean install loading the same final hostname.
