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

Desktop packages use a local H2 database stored under the current user's
`.stealthsync` directory. They do not require PostgreSQL or a `DB_PASSWORD`
environment variable. Normal backend development continues to use PostgreSQL.

To create a Windows `.exe` or `.msi` installer instead of an app image, install WiX Toolset first, then run:

```powershell
.\scripts\build-desktop.ps1 -PackageType exe
```

Use a standard Temurin/OpenJDK 21 installation for packaging. Full JDK builds
that enable both client and server JVMs are rejected because they can generate
a Windows launcher that reports `Failed to launch JVM`.
