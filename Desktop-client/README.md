# StealthSync Desktop Client

This module packages the hosted StealthSync web application in a native JavaFX window. It does not start Spring Boot, a database, or a local web server.

## Trust Boundary

- The application origin is fixed at build time with `stealthsync.desktop.url`.
- Remote application content must remain on that exact origin.
- OAuth can open only the allow-listed Google, Dropbox, and Microsoft HTTPS hosts.
- Decrypted bytes stay in the WebView until the restricted bridge opens a native Save File dialog.
- The bridge sanitizes the suggested filename and writes only to the path selected by the user.

## Build

From the repository root:

```powershell
.\scripts\build-desktop.ps1
```

The build is pinned to OpenJDK 21.0.2 and WiX 3.14.1. `STEALTHSYNC_DESKTOP_URL` can override the packaged service URL for a controlled build.

Generated artifacts are ignored by Git:

- `dist-desktop/StealthSync/StealthSync.exe`
- `dist-desktop/StealthSync-Setup-1.3.0.exe`
- `dist-desktop/SHA256SUMS.txt`

## Local Smoke Test

With the shared backend available on port 8080:

```powershell
.\scripts\test-desktop-app.ps1 -ServiceUrl http://localhost:8080
```

This verifies the native window, single-instance behavior, absence of a bundled backend/H2 process, and absence of a desktop-owned port 8080 listener.
