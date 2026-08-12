# StealthSync Hosted Deployment Runbook

## Primary Topology

The final zero-cost deployment target is:

- **Marketing Website:** GitHub Pages from `Website.html`.
- **Application host:** Azure for Students Ubuntu VM.
- **Public name:** DuckDNS hostname.
- **HTTPS and routing:** Caddy on ports 80/443.
- **Application services:** React static build and Spring Boot API.
- **Persistence:** PostgreSQL and legacy Vault Docker volumes.
- **Deployment:** Docker Compose, updated manually or by GitHub Actions over SSH.

This topology does not require a project member's Windows computer, Docker
Desktop, Dev Tunnel, or home network to remain online.

## Authoritative Instructions

- [Azure production README](../deploy/production/README.md)
- [Human setup and acceptance checklist](../deploy/production/HUMAN_SETUP_CHECKLIST.md)
- [VM-only environment template](../deploy/production/.env.production.example)
- [End-user installation wording](END_USER_HOSTED_INSTALLATION.md)

## Public Routing

Clients use one origin:

```text
https://<YOUR_DUCKDNS_DOMAIN>/
```

Caddy serves the React SPA and proxies the existing API routes to the backend.
OAuth callbacks use the same hostname:

```text
https://<DOMAIN>/cloud-storage/oauth/google/callback
https://<DOMAIN>/cloud-storage/dropbox/callback
https://<DOMAIN>/cloud-storage/onedrive/callback
```

The same-origin design avoids production wildcard CORS. Spring Boot trusts
forwarded HTTPS headers only in the strict `prod` profile.

## Database And Secrets

- Flyway initializes an empty production database before Hibernate validates it.
- `ddl-auto=validate` prevents production startup from silently changing schema.
- `DataSeeder` is disabled in `prod` and `production`; public demo credentials
  are not created.
- PostgreSQL and Vault data use named volumes and survive container recreation.
- JWT, OAuth state, Vault wrapping, OAuth-token encryption, provider clients,
  and database credentials are environment-only values.
- The populated `.env.production`, database dump, Vault archive, and OAuth
  tokens must never enter GitHub, Drive, screenshots, or the submission ZIP.

## Automated Update

`.github/workflows/deploy-oracle-production.yml` validates backend tests,
frontend tests/build, Compose expansion, and the Caddyfile. It then connects to
the VM using repository secrets and runs:

```bash
bash deploy/production/update-production.sh <validated-main-commit>
```

The VM script allows only a clean fast-forward of `main`, rebuilds changed
services, and verifies the public health URL. SSH private keys and known-host
data remain GitHub repository secrets.

`.github/workflows/deploy-marketing-pages.yml` independently publishes
`Website.html` as the GitHub Pages `index.html`.

## Optional Paid Fallback

The existing `render.yaml` and Render-specific support files remain as an
optional paid fallback. They are not the selected production architecture and
should not be presented as the deployed platform unless the team explicitly
switches and repeats acceptance.

## Readiness Boundary

Repository configuration alone means **deployment-ready**, not **deployed**.
The system becomes publicly operational independently from a personal PC only
after the real Azure VM, DuckDNS record, HTTPS certificate, production secrets,
three provider callbacks, external E2E tests, reboot/persistence test, and
powered-off-development-PC test pass with evidence.
