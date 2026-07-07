# Daily Record - 2026-07-01

## Today's Focus

The current P0 is to move Dropbox from a fake/prototype provider into a real OAuth-backed provider path while preserving the unified cloud adapter architecture and not breaking Google Drive.

## 6/30 Provider Abstraction Status

The provider abstraction is in place:

- `CloudStorageAdapter` defines provider-neutral OAuth, status, list, upload, download, delete, and disconnect operations.
- `CloudStorageController` routes provider-specific requests through the adapter instead of hard-coding separate controller branches.
- Google Drive is adapted to the unified interface.
- Dropbox and OneDrive have real configuration entry points instead of prototype links.

## Dropbox Status

- OAuth URL: implemented with the real Dropbox authorize endpoint.
- Callback: implemented with code/state validation and token exchange structure.
- Token storage: implemented through encrypted provider credential storage; tokens are not returned to the frontend.
- Token refresh: implemented through the refresh token flow.
- Upload: implemented through Dropbox content upload, receiving only already-encrypted bytes from the shared encryption flow.
- List: implemented through the StealthSync app folder and encrypted metadata package parsing.
- Download/decrypt: implemented through Dropbox content download followed by the shared local decrypt-save flow.
- Delete: implemented through Dropbox file delete for the selected provider file ID/path.

## Encryption Boundary

- Upload requires `keyID + keyPassword`.
- `EncryptionKeyService` derives request-scoped key material.
- `AesGcmService` encrypts locally.
- Dropbox receives ciphertext plus encrypted metadata only.
- `keyPassword` is not persisted.
- No raw key or derived key is returned to the frontend.

## Tests Added Today

- `DropboxServiceTest`
  - verifies real Dropbox OAuth URL generation
  - verifies missing config returns a clear Dropbox integration error
  - verifies Dropbox provider identity for the unified adapter
- `CloudFileMetadataCodecTest`
  - verifies encrypted metadata packaging does not leak original filename or key label
  - verifies metadata and ciphertext can be recovered locally

## Manual Work Still Required

- Create Dropbox Developer App.
- Set Dropbox redirect URI: `http://localhost:8080/cloud-storage/dropbox/callback`.
- Configure Dropbox scopes:
  - `files.metadata.read`
  - `files.content.write`
  - `files.content.read`
  - `offline_access`
- Store `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, and `DROPBOX_REDIRECT_URI` locally.
- Prepare a Dropbox test account.
- Do not commit secrets to GitHub.

## Next Priority - 2026-07-02

Run the real Dropbox E2E test with credentials. If Dropbox passes, begin OneDrive real Microsoft Graph E2E verification and fix provider-specific edge cases.
