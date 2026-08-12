# Production Environment Reference

The machine-readable placeholder file is:

[`deploy/production/.env.production.example`](../deploy/production/.env.production.example)

Copy it to `deploy/production/.env.production` **only on the Oracle VM**, fill
the real values there, and set mode `600`. The populated file is ignored by Git.

## Public And Database Values

| Variable | Purpose |
| --- | --- |
| `PUBLIC_DOMAIN` | DuckDNS hostname only, without protocol or path |
| `ACME_EMAIL` | Caddy ACME contact email |
| `POSTGRES_DB` | Production database name |
| `POSTGRES_USER` | Production database user |
| `POSTGRES_PASSWORD` | Independent random database password |

Compose derives the JDBC URL, public frontend URL, exact allowed origin, and
three callback URLs from this single hostname. The frontend is built without a
separate API origin and calls the same HTTPS origin.

## Required Independent Secrets

- `JWT_SECRET`
- `OAUTH_STATE_SECRET`
- `VAULT_SERVER_SECRET`
- `TOKEN_ENCRYPTION_SECRET`

Generate and back up four distinct random values. Reusing one value weakens
separation between authentication, OAuth state, Vault wrapping, and stored-token
encryption.

## Provider Values

- Google: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`.
- Dropbox: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`.
- OneDrive: `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET`, `ONEDRIVE_TENANT`.

Redirect URIs are assembled by Compose from `PUBLIC_DOMAIN`; enter those exact
values in each provider console. Optional Google folder ID and login hint remain
empty unless a controlled deployment requires them.

## DuckDNS Values

`DUCKDNS_SUBDOMAIN` and `DUCKDNS_TOKEN` are read only by the VM's
`update-duckdns.sh`. They are not passed to PostgreSQL, Spring Boot, React, or
Caddy.

## Secret Handling

- Never print the environment file in CI or paste it into a support message.
- Never store a populated file in GitHub, Google Drive, the source ZIP, a Docker
  image, or frontend build variables.
- Back up `VAULT_SERVER_SECRET` and `TOKEN_ENCRYPTION_SECRET` before accepting
  production data.
- Rotating `JWT_SECRET` logs users out.
- Rotating the token-encryption or Vault secret requires a planned migration or
  provider reauthorization.
