# StealthSync Daily Record - 2026-08-11

## Objective

Prepare StealthSync for a long-lived public deployment that does not depend on the development Windows PC or Dev Tunnel. The selected topology is a Render Static Site, an always-on Render Docker Web Service, and persistent Render PostgreSQL in Singapore.

## Completed Implementation

- Added a Render Blueprint in `render.yaml` for the frontend, backend, PostgreSQL, backend health check, and persistent Vault disk.
- Added a strict `prod` Spring profile with environment-only database, JWT, OAuth, CORS, Vault, and token-encryption configuration.
- Added Flyway schema migration `V1__initial_schema.sql` and disabled demo account seeding in `prod` and `production` profiles.
- Added `/actuator/health` as the only anonymously accessible actuator endpoint.
- Added safe conversion of Render `DATABASE_URL` values to JDBC settings without logging credentials.
- Added independent encryption for stored OAuth access and refresh tokens, with a compatibility fallback for existing local rows.
- Added a non-root Java 21 backend Docker image.
- Kept the frontend API origin configurable through `VITE_API_BASE_URL`.
- Removed the hard-coded Dev Tunnel URL from the desktop client and desktop build/test scripts. A production desktop build now requires an explicit HTTPS frontend URL.
- Added production environment, deployment, end-user, acceptance, and rollback documentation.
- Added an isolated production-profile smoke-test script that creates and removes its own temporary database and container.

## Automated Verification

- Backend: 153 tests passed; zero failures, errors, or skipped tests.
- Frontend: 14 Node tests passed.
- Frontend TypeScript check and Vite production build passed with an injected non-local API origin.
- Desktop client: 11 tests passed.
- Hosted-profile Docker smoke test passed:
  - health status `UP`
  - 1 successful Flyway migration
  - 13 public-schema tables
  - 0 demo users
  - 2 formal plan reference rows
- The temporary validation container and database were removed after the smoke test.

## Manual Production Gates

The implementation is deployment-ready, but the system does **not yet** satisfy the one-month public-hosting requirement. The following work requires the project owner's Render and provider-console access:

1. Create the paid Render resources from `render.yaml` and keep billing active for the required period.
2. Record the final frontend and backend URLs and set the exact frontend, CORS, and API-origin variables.
3. Enter the three providers' credentials and register the final backend callback URLs in Google, Dropbox, and Microsoft consoles.
4. Run three-provider OAuth and encrypted file E2E checks from an external network.
5. Verify data persistence after a backend redeploy and availability while the development PC is powered off.
6. Rebuild and test the Windows installer against the final Render frontend URL.

No production URL, OAuth result, persistence result, or one-month availability claim should be marked as passed before the corresponding manual evidence exists.

## Local Development

The existing local Docker, PowerShell, and Dev Tunnel workflows remain available for development and fallback testing. They are not the proposed final public-hosting topology.
