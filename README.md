# StealthSync

StealthSync is a client-side file encryption application for Google Drive, Dropbox, and OneDrive. Files are encrypted in the browser before upload and decrypted in the browser after download, so cloud providers and the StealthSync backend handle ciphertext rather than plaintext file contents.

## Current FYP Baseline

- Real OAuth connections for Google Drive, Dropbox, and OneDrive.
- Browser-side AES-GCM encryption and decryption.
- AES-128 for Free customers; active Premium customers can choose AES-128 or AES-256-GCM.
- Password-protected `.sskey` backup and recovery for V2 encryption keys. Backup encryption and
  password verification run locally; raw keys, Key Passwords, and password verifiers are not exported.
- Password-derived encryption keys using PBKDF2-HMAC-SHA256 with 310,000 iterations and a per-key 16-byte salt.
- Versioned, provider-neutral `SSENCV2` encrypted envelopes with encrypted file metadata and random `.ssenc` cloud object names.
- Premium multi-device access for up to five active devices; Free accounts are limited to one active device.
- Account recovery phrases for account login recovery only. They do not recover an encryption-key password or decrypt files.
- A browser-local rule-based privacy warning and explainable rule-based anomaly scoring for administrator security logs.

The hosted web application is the primary validation target. The optional Windows desktop client loads the same hosted application in a dedicated window; it does not run a local backend or database.

## Architecture

```mermaid
flowchart LR
    A["Windows Device A\nBrowser Web Crypto"]
    B["Windows Device B\nBrowser Web Crypto"]
    API["Hosted Spring Boot API\nJWT, device policy, ciphertext routing"]
    DB["Hosted PostgreSQL\naccounts, key metadata, device and file records"]
    G["Google Drive"]
    D["Dropbox"]
    O["OneDrive"]

    A -->|"ciphertext and non-secret metadata"| API
    B -->|"ciphertext and non-secret metadata"| API
    API --> DB
    API --> G
    API --> D
    API --> O
```

The Key Password, derived raw key, plaintext file, original filename, and decrypted result remain on the active browser device during the V2 workflow. The backend stores synchronized non-secret key metadata, including the salt, algorithm, KDF version, fingerprint, and password verifier. OAuth access and refresh tokens are encrypted before database storage.

## Multi-device Workflow

1. Device A opens the hosted StealthSync URL and signs in to a Premium account.
2. Device A connects a cloud provider through its official OAuth page, creates an encryption key, and uploads an encrypted file.
3. Device B signs in to the same StealthSync account.
4. Device B sees the synchronized cloud link, encryption-key metadata, and encrypted file list.
5. Device B enters the same Key Password to derive the key locally and decrypt the downloaded ciphertext.

Device B does not need Java, Node.js, PostgreSQL, OAuth application credentials, environment variables, or an exported key package. OAuth application registration and server secrets are deployment responsibilities, not end-user setup.

## Project Layout

- `Back-end/` - Spring Boot 3.2.5 API, provider adapters, authentication, subscriptions, device enforcement, persistence, and security logs.
- `Front-end/` - React 19 and Vite 8 web client, Web Crypto V2, customer pages, and administrator pages.
- `Desktop-client/` - optional JavaFX client for the hosted web application.
- `scripts/` - local startup, database initialization, and packaging helpers.
- `deploy/production/` - primary Azure Ubuntu VM, PostgreSQL, Spring Boot, React, Caddy, and DuckDNS production deployment.
- `render.yaml` - optional paid Render fallback; it is not the zero-cost primary topology.
- `Dockerfile`, `docker-compose.production.yml`, `.env.production.example` - legacy self-hosted/local deployment template without real secrets.

## Development Prerequisites

| Component | Project version |
| --- | --- |
| Java | 21 |
| Spring Boot | 3.2.5 |
| Maven | 3.9.x |
| PostgreSQL | 16 recommended |
| Node.js | 24.x recommended |

## Local Development

Create the PostgreSQL database once:

```powershell
psql -U postgres -d postgres -f scripts/create_stealthsync_database.sql
```

Start the backend and Vite frontend from the repository root:

```powershell
.\scripts\start-web-demo.ps1
```

The script securely prompts for the local PostgreSQL password when `DB_PASSWORD` is not already set. It also imports existing Google Drive, Dropbox, and OneDrive OAuth settings from Windows User environment variables without printing secret values.

Open `http://localhost:5173/`. Stop the local services with:

```powershell
.\scripts\start-web-demo.ps1 -Stop
```

## One-time OAuth Developer Configuration

Register these local callback URLs in the corresponding provider developer consoles:

```text
http://localhost:8080/cloud-storage/google-drive/callback
http://localhost:8080/cloud-storage/dropbox/callback
http://localhost:8080/cloud-storage/onedrive/callback
```

Configure the matching environment variables on the backend host:

```text
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REDIRECT_URI
DROPBOX_CLIENT_ID
DROPBOX_CLIENT_SECRET
DROPBOX_REDIRECT_URI
ONEDRIVE_CLIENT_ID
ONEDRIVE_CLIENT_SECRET
ONEDRIVE_REDIRECT_URI
ONEDRIVE_TENANT
```

Never commit OAuth secrets, database passwords, JWT secrets, OAuth state secrets, access tokens, refresh tokens, Key Passwords, or a real `.env.production` file.

## Hosted Production Deployment

The production topology uses an Azure Ubuntu VM, Docker Compose, PostgreSQL, Spring Boot, the React production build, Caddy automatic HTTPS, and the DuckDNS hostname `stealthsyncfyp26s211.duckdns.org`. The Marketing Website is deployed separately with GitHub Pages. The application uses one HTTPS origin and does not depend on a personal Windows computer, Docker Desktop, or Dev Tunnel.

- [Azure production runbook](deploy/production/README.md)
- [Human Azure, DuckDNS, OAuth, and acceptance checklist](deploy/production/HUMAN_SETUP_CHECKLIST.md)
- [Deployment overview](docs/DEPLOYMENT_RUNBOOK.md)
- [End-user hosted installation guide](docs/END_USER_HOSTED_INSTALLATION.md)

The `prod` profile uses environment-only secrets, Flyway migrations, `ddl-auto=validate`, exact same-origin configuration, forwarded HTTPS headers, a minimal health endpoint, and no demo-account seeding. The checked-in environment file is an example only. Real values stay in a mode-600 file on the VM.

An optional paid Render Blueprint remains available as a fallback. It is not required by, or used in, the primary deployment.

## Self-hosted Development Deployment

The existing Docker Compose deployment remains available for local development and rollback testing. Copy `.env.production.example` to `.env.production`, replace every placeholder, register the matching HTTPS callback URLs with all three providers, and start it with:

```powershell
docker compose -f docker-compose.production.yml up --build -d
```

The deployment must use HTTPS and strong independent values for `DB_PASSWORD`, `JWT_SECRET`, `OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_SECRET`, and `VAULT_SERVER_SECRET`. The `.env.production` file is ignored by Git.

## Test Accounts

These accounts are seeded for local course-project testing only:

| Role | Username | Email | Password |
| --- | --- | --- | --- |
| Administrator | `admin` | `admin@stealthsync.com` | `Admin@123` |
| Free customer | `testuser` | `testuser@stealthsync.com` | `User@123` |
| Premium customer | `PremiumUser` | `user@stealthsync.com` | `User@1234` |

Hosted production does not seed these accounts. Do not reuse these credentials in a public deployment.

## Automated Verification

Run the backend tests:

```powershell
cd Back-end
mvn test
```

Run the frontend tests and production build:

```powershell
cd Front-end
npm test
npm run build
```

Run the desktop-client tests:

```powershell
cd Desktop-client
mvn test
```

Real external OAuth and three-provider end-to-end verification must be repeated after the final hosted URLs are assigned.

## Security Terminology

- Describe the main workflow as **client-side encryption** or a **zero-knowledge-style architecture**, not as formally proven absolute zero knowledge.
- Describe the Privacy Scanner and administrator anomaly detector as **explainable rule-based detection**, not as a trained machine-learning model.
- Describe Recovery Phrase as **account login recovery only**.
- Describe Premium multi-device as synchronized non-secret key metadata plus local key derivation from the same Key Password; no key-package export/import is used.
