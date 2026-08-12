# StealthSync Daily Record - 2026-08-11

## Objective

Prepare a zero-cost, month-long public deployment that remains available when
the development Windows PC, Docker Desktop, and Dev Tunnel are offline.

## Final Topology Decision

The selected primary topology is an Azure for Students Ubuntu VM with
Docker Compose, PostgreSQL, Spring Boot, a React production build, Caddy HTTPS,
and DuckDNS. GitHub Pages hosts the Marketing Website separately.

The paid Render topology prepared earlier remains a technically valid fallback,
but it is no longer the selected zero-cost production path.

## Completed Source Preparation

- Added a four-service production Compose definition: PostgreSQL, backend,
  frontend asset publisher, and Caddy.
- Added persistent PostgreSQL, Vault, Caddy, and frontend asset volumes.
- Added same-origin Caddy routing for the project's established API paths and
  React SPA fallback.
- Added automatic HTTPS configuration and security response headers.
- Added a VM-only environment template with no real secret values.
- Kept strict `prod` behavior: Flyway, `ddl-auto=validate`, no demo seeding,
  environment-only credentials, non-detailed health, and exact origin.
- Added forwarded-header handling for HTTPS behind Caddy.
- Added repeatable VM update and DuckDNS refresh scripts.
- Added a GitHub Actions validation and Azure SSH deployment workflow.
- Added a separate GitHub Pages workflow for `Website.html`.
- Added Azure NSG, UFW, DuckDNS, Caddy, OAuth, secrets, backup, GitHub, and external
  acceptance instructions.
- Separated final-user installation wording from deployment-operator tasks.

## Security Boundaries

- No real database password, JWT secret, OAuth client secret, refresh token,
  DuckDNS token, SSH key, database dump, or Vault archive is stored in Git.
- The populated production environment file exists only on the Azure VM with
  mode `600`.
- PostgreSQL and Spring Boot are not published directly to the internet; Caddy
  is the only external entry point.
- Caddy access logging is not enabled, preventing OAuth callback query codes
  from being written to a default access log.
- GitHub Actions requires a pre-verified SSH known-hosts value and never runs
  `ssh-keyscan` inside deployment CI.

## Automated Verification

- Backend: 153 tests passed with no failures, errors, or skipped tests.
- Frontend: 14 tests, TypeScript, and Vite 8.2.1 production build passed from a
  fresh `npm ci`; `npm audit` reported 0 vulnerabilities.
- Desktop client: 11 tests passed.
- Caddyfile validation and production Compose expansion passed.
- Backend and frontend production images built successfully.
- Isolated production smoke test passed with:
  - backend health `UP`
  - 1 successful Flyway migration
  - 0 demo users
  - 2 formal plan rows
  - published React `index.html`
- The isolated smoke containers, networks, PostgreSQL volume, Vault volume, and
  frontend asset volume were removed after verification.

## Azure Deployment Update - 2026-08-12

The prepared topology is now live on an Azure Ubuntu VM and no longer depends
on the development Windows PC, Docker Desktop, or Dev Tunnel:

- Public URL: `https://stealthsyncfyp26s211.duckdns.org`
- DuckDNS resolves to the Azure VM and refreshes every six hours through cron.
- Caddy serves a trusted HTTPS endpoint; the login page and
  `/actuator/health` return HTTP 200.
- PostgreSQL, backend, frontend, and Caddy containers are running; backend,
  frontend, and PostgreSQL health checks pass.
- The migrated database contains the established users, subscriptions,
  encryption-key metadata, cloud links, cloud-file indexes, and Vault records.
- Google Drive, Dropbox, and OneDrive callbacks use the final DuckDNS origin.
- Existing test accounts can log in, provider status/file-list calls return
  successfully, and the project team completed live functional checks.
- The VM-only `.env.production` has mode `600`; no secret value was copied into
  Git, Drive, this record, or screenshots.

Remaining operational evidence is deliberately not marked complete until it is
observed: Azure VM reboot recovery, access while the development PC is powered
off, off-VM backup restoration, and continuous uptime through the required
month.

## Local Development

Local PowerShell, Docker Desktop, and Dev Tunnel workflows remain unchanged for
development and fallback testing. They are not production dependencies.
