# StealthSync Hosted Deployment Runbook

## Target Architecture

- **Frontend:** Render Static Site serving `Front-end/dist` over HTTPS.
- **Backend:** paid Render Docker Web Service running Spring Boot 3.2.5 and Java 21.
- **Database:** paid Render PostgreSQL 16 on the same Singapore private network.
- **Legacy vault compatibility:** 1 GB persistent disk mounted at `/var/data/stealthsync-vault`.
- **Marketing website:** GitHub Pages, independent from the authenticated application.
- **Desktop client:** optional JavaFX shell loading the hosted frontend URL.

The hosted application does not depend on a team member's Windows login, Docker Desktop, Dev Tunnel, or home internet connection.

## Deploy From the Blueprint

1. Sign in to Render using the project team's long-lived owner account.
2. Open **New > Blueprint** and select this GitHub repository and the `main` branch.
3. Render reads the root [`render.yaml`](../render.yaml) and proposes:
   - `stealthsync-postgres`
   - `stealthsync-api-fyp-26-s2-32`
   - `stealthsync-web-fyp-26-s2-32`
4. Keep the backend on a paid `starter` instance and PostgreSQL on at least `basic-256mb`. Keep billing active until at least one month after the final presentation.
5. Enter every `sync: false` value when prompted. Use the actual Render URLs, not the examples in the environment template.
6. Wait for the resources to be created, then copy the exact assigned URLs from each service dashboard.
7. Recheck these cross-service values and redeploy after any correction:
   - Backend `STEALTHSYNC_FRONTEND_URL=https://<actual-frontend-host>`
   - Backend `STEALTHSYNC_ALLOWED_ORIGINS=https://<actual-frontend-host>`
   - Frontend `VITE_API_BASE_URL=https://<actual-backend-host>`

Render does not interpolate one service URL into another Blueprint variable. The three values above must be confirmed manually.

## Provider Console Configuration

Register exact HTTPS callback URLs before attempting OAuth:

```text
Google:  https://<backend-host>/cloud-storage/oauth/google/callback
Dropbox: https://<backend-host>/cloud-storage/dropbox/callback
OneDrive: https://<backend-host>/cloud-storage/onedrive/callback
```

### Google Cloud

1. Use the existing web OAuth client or create a dedicated production web client.
2. Add the exact Google callback URI.
3. Keep scopes limited to `drive.file`, `userinfo.email`, and `openid`.
4. Use the GitHub Pages marketing site as the application homepage if required by the consent screen.
5. If the app remains in Testing, add every demonstration account as a test user and reauthorize shortly before the presentation. Prefer External Production for month-long availability.

### Dropbox

1. Add the exact Dropbox callback URI under OAuth 2 redirect URIs.
2. Confirm the app has the file-content and metadata scopes required by upload, list, download, and delete.
3. Keep offline token access enabled in the StealthSync authorization flow.

### Microsoft Entra / OneDrive

1. Open **Authentication > Add a platform > Web**.
2. Add the exact OneDrive callback URI.
3. Confirm the supported account type matches the intended personal/work accounts.
4. Create a non-expired client secret and place only its **value** in Render.

## Database Initialization

Hosted profiles run Flyway before Hibernate validation:

- Empty database: `V1__initial_schema.sql` creates the current tables and the Free/Premium plan reference rows.
- Existing non-empty database without Flyway history: Flyway baselines it at version 1, then Hibernate validates the current schema.
- Demo users, mock links, OAuth credentials, files, logs, and subscriptions are never seeded in `prod` or `production`.

For a new production database, users should register normally and reconnect each provider through OAuth. To provision an administrator without a default password:

1. Register a dedicated account through the public frontend.
2. Open a private Render PostgreSQL session.
3. Promote only the intended account:

```sql
UPDATE user_accounts
SET role = 'admin'
WHERE email = '<operator-email>';
```

Verify exactly one row changed, then log out and in again to receive a new admin JWT.

### Optional Existing-Data Migration

Prefer a clean production database for final delivery. If the team must retain current users, cloud links, key metadata, and file indexes:

1. Stop writes to the local deployment.
2. Create a PostgreSQL custom-format dump outside the repository.
3. Transfer it through an encrypted private channel and restore it to Render.
4. Reuse the corresponding provider client secrets and `VAULT_SERVER_SECRET`; otherwise existing encrypted credentials or wrapped vault keys cannot be read.
5. Do not commit or upload the dump to a public Drive/GitHub location. It contains password hashes, encrypted OAuth tokens, and personal metadata.
6. Reauthorize all three providers after migration and verify one file before deleting the private dump.

## Health and Operations

- Public health URL: `https://<backend-host>/actuator/health`
- Expected body: `{"status":"UP"}` without component details.
- Render uses the same endpoint for deployment health checks.
- A successful health response confirms the API process and database connectivity, not provider OAuth validity.

Operational checks:

1. Keep Render billing and renewal active.
2. Enable deployment notifications for failed builds and unhealthy services.
3. Review PostgreSQL backups and retention in the paid database dashboard.
4. Check provider client-secret expiry dates weekly until submission.
5. Do not rotate vault or token encryption secrets without a tested migration.
6. After every backend redeploy, verify health, login, and one provider list request.

## Local Development Still Works

The hosted configuration does not replace local development:

```powershell
.\scripts\start-web-demo.ps1
```

The existing combined Docker deployment also remains available:

```powershell
docker compose -f docker-compose.production.yml up --build -d
```

Local development uses `application.properties`; the combined Docker setup uses `production`; Render uses the strict `prod` profile.

## Rollback

1. Roll back the backend to the previous successful Render deploy.
2. Keep the database; never replace it with an empty instance during an application rollback.
3. Roll back the frontend to the matching build if the API contract changed.
4. Run `/actuator/health`, login, cloud-link list, and one decrypt test.
5. Record the deploy IDs, timestamp, symptom, and recovery result.

## References

- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render Docker deployments](https://render.com/docs/docker)
- [Render health checks](https://render.com/docs/health-checks)
- [Render PostgreSQL](https://render.com/docs/postgresql)
