# StealthSync

Seamless file encryption app for cloud storage workflows.

## Project Layout

- `Back-end/` - Spring Boot backend using the Maven standard layout under `src/main/java` and `src/main/resources`.
- `Front-end/` - React/Vite frontend for customer and admin dashboards.
- `Code structure (MavenGradle standard).docx` - backend package structure reference used by the team.

## Encryption

The backend encrypts files with AES-256-GCM. New encrypted files use a versioned `STLH` header:

```text
STLH | version | salt | IV | ciphertext + auth tag
```

The backend also keeps compatibility with the earlier IV-only file format so previously uploaded demo files can still be decrypted.

## Vault

The backend exposes vault endpoints under `/vault`:

- `GET /vault/status`
- `POST /vault/create`
- `POST /vault/unlock`
- `POST /vault/lock`

The vault stores a random master key in `vault.dat`, encrypted with a key derived from the user's master password.

## Local Checks

From `Back-end/`:

```powershell
mvn test
```

From `Front-end/`:

```powershell
npm run build
```

## Local PostgreSQL Setup

Backend development uses PostgreSQL by default:

```properties
jdbc:postgresql://localhost:5432/stealthsync
```

Spring JPA `ddl-auto=update` creates and updates tables after the application
connects, but PostgreSQL must already have the `stealthsync` database. Create it
once before starting the backend:

```powershell
psql -U postgres -d postgres -f scripts/create_stealthsync_database.sql
```

The app seeds demo accounts automatically on startup. To reset the core test
accounts manually, run:

```powershell
psql -U postgres -d stealthsync -f scripts/init_data.sql
```

## Desktop App Packaging

`dist-desktop/` is a generated Windows desktop app image, so it is intentionally not committed to GitHub. It is large, platform-specific, and can be rebuilt from source.

To rebuild the desktop app image on Windows:

```powershell
.\scripts\build-desktop.ps1
```

The script:

- builds the React frontend
- copies the frontend build into `Back-end/src/main/resources/static`
- packages the Spring Boot backend JAR
- runs `jpackage` to create `dist-desktop/StealthSync/StealthSync.exe`

The packaged application opens the React interface inside its own JavaFX
desktop window. It does not open the system browser. Closing the window also
stops the local Spring Boot service, and launching the app again focuses the
existing window instead of starting another server process.

Desktop packages use a local H2 database stored under the current user's
`.stealthsync` directory. They do not require PostgreSQL or a `DB_PASSWORD`
environment variable. Normal backend development continues to use PostgreSQL.

To create a Windows `.exe` or `.msi` installer instead of an app image, install WiX Toolset first, then run:

```powershell
.\scripts\build-desktop.ps1 -PackageType exe
```

The EXE output is named `StealthSync-Setup-<version>.exe` to distinguish the
installer from the installed application. After installation, launch
StealthSync from its desktop or Start Menu shortcut. Reopening the setup file
only enters the Windows installer flow.

Use a standard Temurin/OpenJDK 21 installation for packaging. Full JDK builds
that enable both client and server JVMs are rejected because they can generate
a Windows launcher that reports `Failed to launch JVM`.

## Test Accounts

The backend checks and creates these accounts whenever it starts with a new or
existing database:

| Permission | Username | Email | Password |
| --- | --- | --- | --- |
| Administrator | `admin` | `admin@stealthsync.com` | `Admin@123` |
| Normal customer | `testuser` | `testuser@stealthsync.com` | `User@123` |
| Premium demo customer | `PremiumUser` | `user@stealthsync.com` | `User@1234` |

Desktop installations use the local H2 database and seed these accounts on
first launch automatically. For a PostgreSQL development database, automatic
seeding also runs when the backend starts. The same two required test accounts
can be created or reset manually with:

```powershell
psql -U postgres -d stealthsync -f scripts/init_data.sql
```

The SQL script is idempotent and stores BCrypt password hashes rather than
plain-text passwords.

## Development Prerequisites

Use these versions in the user manual:

| Component | Project version |
| --- | --- |
| Java | `21` (the current local and desktop build uses `21.0.2`) |
| Spring Boot | `3.2.5` |
| Apache Maven | `3.9.16` |
| PostgreSQL server | `16` recommended for backend development |
| PostgreSQL JDBC driver | `42.6.2` |

The PostgreSQL server version is not controlled by Maven; the project pins the
JDBC driver version. The packaged desktop application uses its bundled H2
database and does not require PostgreSQL or Maven on the end user's computer.

## Google Drive Integration

StealthSync uses Google OAuth 2.0 and the Google Drive API to link a user's
account. Files uploaded through the Google Drive section are encrypted with
AES-256-GCM before they leave the application. Downloads are retrieved as
ciphertext and decrypted locally before being saved by the user.

Google Drive setup:

Reference: [Google OAuth 2.0 web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
and [Google Drive API upload guide](https://developers.google.com/drive/api/guides/manage-uploads).

1. Create or select a project in Google Cloud Console.
2. Enable the Google Drive API.
3. Configure an OAuth consent screen and add the test users who will use the
   course-project build.
4. Create an OAuth client with application type `Web application`.
5. Add this authorized redirect URI exactly:

```text
http://localhost:8080/cloud-storage/oauth/google/callback
```

6. Set these environment variables before starting the backend or desktop app:

```powershell
[Environment]::SetEnvironmentVariable(
    "GOOGLE_DRIVE_CLIENT_ID",
    "your-client-id.apps.googleusercontent.com",
    "User"
)
[Environment]::SetEnvironmentVariable(
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "your-client-secret",
    "User"
)
```

Restart StealthSync after changing these user environment variables.

If a different server port is used, set `GOOGLE_DRIVE_REDIRECT_URI` to the
matching callback URL and add the same URI to the Google OAuth client.

The integration requests the least-privilege `drive.file` scope, so it lists
and manages files created by StealthSync instead of requesting access to every
file in the user's Drive. OAuth access and refresh tokens are encrypted before
being stored in the application database. Never commit the Google client secret
or export it into a public installer or GitHub Actions log.
