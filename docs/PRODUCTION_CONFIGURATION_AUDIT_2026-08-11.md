# Production Configuration Audit - 2026-08-11

## Containers And Builds

- The legacy root `Dockerfile` builds React into Spring Boot and remains for
  local/self-hosted compatibility.
- `Back-end/Dockerfile` builds a backend-only Java 21 non-root image and is used
  by the Oracle production Compose file.
- `deploy/production/frontend/Dockerfile` performs `npm ci` and a Vite production
  build, then publishes only the static `dist` files to Caddy.
- The production Compose file has four services and publishes only Caddy ports
  80/443. PostgreSQL and Spring Boot have no host port.
- PostgreSQL uses an isolated Docker network. Backend also joins the application
  network so it can make required outbound provider API calls.

## Frontend API Origin

`Front-end/src/lib/api.ts` already supports production same-origin requests:

- `VITE_API_BASE_URL` overrides the origin for split-host deployments.
- Vite development defaults to `http://localhost:8080`.
- A production build without the override uses `window.location.origin`.

Oracle production intentionally omits `VITE_API_BASE_URL`. Caddy proxies the
actual API routes on the same DuckDNS origin.

## API And CORS

The existing API is not uniformly prefixed with `/api`. It includes established
root routes such as `/login`, `/me`, `/files`, `/plans`, `/devices`, and grouped
routes such as `/cloud-storage/*` and `/admin/*`. The Caddyfile explicitly maps
those tested routes instead of changing the public API contract late in the FYP.

The strict `prod` profile requires `STEALTHSYNC_ALLOWED_ORIGINS`. Compose sets it
to exactly `https://${PUBLIC_DOMAIN}`; no wildcard production CORS is used.

## OAuth Callbacks

Production callbacks are derived from `PUBLIC_DOMAIN`:

```text
https://<DOMAIN>/cloud-storage/oauth/google/callback
https://<DOMAIN>/cloud-storage/dropbox/callback
https://<DOMAIN>/cloud-storage/onedrive/callback
```

The OAuth completion controller redirects to the configured
`STEALTHSYNC_FRONTEND_URL`, which is the same DuckDNS origin. Local callback
defaults remain in `application.properties` for development only.

## Backend Environment

The strict profile reads these categories only from environment variables:

- JDBC URL, username, and password.
- JWT, OAuth state, Vault wrapping, and OAuth-token encryption secrets.
- Google Drive, Dropbox, and OneDrive client settings and redirect URIs.
- Frontend/public origin and exact allowed origin.

`ddl-auto=validate` and Flyway are enabled. `DataSeeder` excludes both `prod`
and `production`, so public demo accounts are not created. `/actuator/health` is
the only exposed management endpoint and hides component details.

`server.forward-headers-strategy=framework` was added to the strict profile so
Spring correctly handles the original HTTPS scheme supplied by Caddy.

## Desktop Endpoint

The desktop client no longer has a Dev Tunnel production default. A final
installer must be built with the DuckDNS application URL, or receive the same
URL through its supported local configuration override. Localhost and the old
Dev Tunnel remain only in development/test scripts and historical evidence.

The desktop GitHub release workflow was updated from the obsolete 1.2.1 local
backend package to the current 1.3.0 shared-service client. It requires the
repository variable `PRODUCTION_URL` and publishes only the EXE installer and
its SHA-256 manifest.

## Secret Audit Boundary

No populated environment file, database dump, provider token, JWT, key
password, or SSH private key was added or modified. The production example uses
placeholders only, and `.gitignore` explicitly excludes the VM's populated file.
