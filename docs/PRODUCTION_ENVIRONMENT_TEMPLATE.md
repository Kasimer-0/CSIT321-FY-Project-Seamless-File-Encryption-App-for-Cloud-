# Production Environment Template

This file lists configuration names only. Store production values in the Render Dashboard. Never commit a populated `.env` file, database URL, OAuth token, JWT, Key Password, or provider secret.

## Render Backend

| Variable | Required | Purpose | Placeholder example |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Yes | Enables the strict hosted profile | `prod` |
| `DATABASE_URL` | Yes on Render | Render private PostgreSQL connection string; injected by Blueprint | `postgresql://<user>:<password>@<private-host>:5432/<database>` |
| `DB_URL` | Alternative | JDBC URL for non-Render hosts; takes precedence over `DATABASE_URL` | `jdbc:postgresql://<host>:5432/<database>` |
| `DB_USERNAME` | Yes | PostgreSQL user; injected by Blueprint | `<database-user>` |
| `DB_PASSWORD` | Yes | PostgreSQL password; injected by Blueprint | `<database-password>` |
| `STEALTHSYNC_FRONTEND_URL` | Yes | Exact public React origin used after OAuth callback | `https://<frontend-host>` |
| `STEALTHSYNC_ALLOWED_ORIGINS` | Yes | Comma-separated exact browser origins; wildcard is rejected | `https://<frontend-host>` |
| `JWT_SECRET` | Yes | Independent JWT HMAC secret, at least 32 random bytes | `<generated-secret>` |
| `OAUTH_STATE_SECRET` | Yes | Independent OAuth state-signing secret | `<generated-secret>` |
| `VAULT_SERVER_SECRET` | Yes | Wraps per-user vault material; loss prevents recovery of wrapped keys | `<generated-secret>` |
| `TOKEN_ENCRYPTION_SECRET` | Yes | Encrypts OAuth access and refresh tokens before database storage | `<generated-secret>` |
| `STEALTHSYNC_VAULT_DIR` | Yes | Persistent-disk path for legacy vault compatibility | `/var/data/stealthsync-vault` |
| `JWT_EXPIRATION_SECONDS` | No | JWT lifetime in seconds | `3600` |
| `OAUTH_STATE_LIFETIME_SECONDS` | No | OAuth callback state lifetime in seconds | `600` |

Render supplies `PORT` automatically. The application listens on `${PORT}` and defaults to `8080` outside Render.

## Google Drive

| Variable | Required | Placeholder example |
| --- | --- | --- |
| `GOOGLE_DRIVE_CLIENT_ID` | Yes | `<google-web-client-id>` |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Yes | `<google-web-client-secret>` |
| `GOOGLE_DRIVE_REDIRECT_URI` | Yes | `https://<backend-host>/cloud-storage/oauth/google/callback` |
| `GOOGLE_DRIVE_FOLDER_ID` | No | `<app-folder-id>` |
| `GOOGLE_DRIVE_LOGIN_HINT` | No | Leave empty in production unless a controlled demo requires it |

Required Google scopes:

- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/userinfo.email`
- `openid`

Do not request full Drive access.

## Dropbox

| Variable | Required | Placeholder example |
| --- | --- | --- |
| `DROPBOX_CLIENT_ID` | Yes | `<dropbox-app-key>` |
| `DROPBOX_CLIENT_SECRET` | Yes | `<dropbox-app-secret>` |
| `DROPBOX_REDIRECT_URI` | Yes | `https://<backend-host>/cloud-storage/dropbox/callback` |

The implementation requests offline access so the server can refresh short-lived access tokens.

## OneDrive

| Variable | Required | Placeholder example |
| --- | --- | --- |
| `ONEDRIVE_CLIENT_ID` | Yes | `<entra-application-client-id>` |
| `ONEDRIVE_CLIENT_SECRET` | Yes | `<entra-client-secret-value>` |
| `ONEDRIVE_REDIRECT_URI` | Yes | `https://<backend-host>/cloud-storage/onedrive/callback` |
| `ONEDRIVE_TENANT` | Yes | `common` or the intended tenant ID |

The Entra application must allow the configured account type and include `offline_access` with the delegated Graph permissions used by the application.

## Render Static Frontend

| Variable | Required | Purpose | Placeholder example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Public backend origin compiled into the static assets | `https://<backend-host>` |
| `NODE_VERSION` | Yes in Blueprint | Reproducible Vite build runtime | `24.12.0` |

No OAuth client secret, database value, JWT secret, vault secret, or token encryption secret belongs in the frontend environment.

## Desktop Client

The desktop package loads the hosted **frontend** URL, not the API URL. Provide it at build time:

```powershell
.\scripts\build-desktop.ps1 -ServiceUrl https://<frontend-host>
```

An installed client can be redirected by the operator with `%LOCALAPPDATA%\StealthSync\desktop.properties`:

```properties
service.url=https://<frontend-host>
```

## Secret Handling

- Use independent generated values for JWT, OAuth state, vault wrapping, and OAuth token encryption.
- Back up `VAULT_SERVER_SECRET` and `TOKEN_ENCRYPTION_SECRET` in an approved password manager before accepting production files.
- Rotating `JWT_SECRET` logs everyone out.
- Rotating `OAUTH_STATE_SECRET` invalidates only in-progress OAuth attempts.
- Rotating `TOKEN_ENCRYPTION_SECRET` requires a credential migration or provider reauthorization.
- Rotating `VAULT_SERVER_SECRET` without rewrapping each user vault makes existing wrapped keys unusable.
