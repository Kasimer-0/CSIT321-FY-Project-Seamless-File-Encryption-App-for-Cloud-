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
