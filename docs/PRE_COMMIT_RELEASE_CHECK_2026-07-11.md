# Pre-commit Release Check - 2026-07-11

## Commit Readiness

**NOT READY for a broad commit.** The implementation and automated verification are ready, but the working tree contains mixed changes from several completed tasks plus untracked documentation/startup files. A later commit must use selective staging and must not use `git add .`.

No commit or push was performed during this check.

## Git Status

- Branch: `fix/backend-auth-vault-baseline`
- Tracking: `origin/fix/backend-auth-vault-baseline`
- Working tree: modified and untracked files remain.
- The accidentally deleted `Code structure (MavenGradle standard).docx` was restored from the current HEAD and is no longer reported as deleted.

## Modified Files

Submission-close-out changes include:

- `.gitignore`
- Authentication/recovery, encryption-key, cloud/local decrypt, physical-token, and crypto service classes under `Back-end/src/main/java`.
- `Back-end/src/main/resources/application.properties`
- Spring Boot static `index.html` and hashed JS replacement under `Back-end/src/main/resources/static`.
- Security, key-policy, account-recovery, physical-token, schema-contract, and static smoke tests under `Back-end/src/test/java`.
- `Front-end/index.html`, frontend API types, customer key/recovery/token pages, login, dashboard, and FAQ files.
- Scope, risk, trusted-device, evidence, README, and local database/startup documentation/scripts from the current combined worktree.

The old tracked static JS bundle is deleted and replaced by the current hashed JS bundle. `Front-end/dist` remains ignored.

## Untracked Files

Implementation/release files that require selective review and staging:

- `Back-end/src/main/java/com/stealthsync/service/security/`
- `Back-end/src/main/resources/recovery-words.txt`
- Current Spring Boot static hashed JS bundle.
- New account-security, physical-token, schema compatibility, and static frontend tests.
- Daily records, evidence records, scope/risk/wording documents, thread index, and this release check under `docs/`.
- Local web-demo startup/stop scripts under `scripts/`.

Intentionally excluded from a submission commit unless separately requested:

- `scripts/update_presentation_demo.py`
- Local runtime output or personal Codex data.
- Any artifact listed in the ignore verification section below.

## Secret Scan

- Database password property: empty `DB_PASSWORD` environment fallback; no concrete fallback remains.
- Google Drive, Dropbox, and OneDrive client-secret properties: empty environment fallbacks.
- JWT and vault server-secret fallbacks: development placeholders only; replace through environment configuration for deployment.
- README and startup scripts reference environment-variable names or placeholders; no reviewed literal database/OAuth secret assignment was found.
- OAuth `access_token` and `refresh_token` names occur in entity/service code because tokens are persisted as encrypted text and decrypted only for provider calls. No token value was printed or copied into this report.
- Secret values were not printed during the scan.

## Ignore Verification

Verified ignored:

- `.codex/`
- `.stealthsync-run/`
- `*.pid`
- `Front-end/dist/`
- `Back-end/target/`
- `dist-desktop/`
- logs and temporary files
- local vault files and `.stealthsync/` OAuth/runtime data

## Encryption Key Retirement

- `DELETE /encryption-keys/{id}` performs owner-scoped logical retirement instead of repository deletion.
- Retired records preserve salt, fingerprint, algorithm, key scheme, and timestamps.
- Active keys can encrypt and decrypt.
- Inactive keys cannot encrypt or decrypt until reactivated.
- Retired keys cannot encrypt new files but can decrypt existing files with the correct key password.
- Trusted-device fingerprint fallback remains supported.
- Existing physical-token records retain their optional key ID when that key is retired; new token associations require an active owner-owned key.

## Recovery Phrase

- Resource: `Back-end/src/main/resources/recovery-words.txt`.
- Validated count: 2048 unique lowercase alphabetic words.
- Generation: six SecureRandom selections from the full word list.
- Canonical format remains `word1-word2-word3-word4-word5-word6`.
- Login accepts hyphens, spaces, and repeated whitespace.
- In-memory throttling blocks an identity + remote-IP pair temporarily after five consecutive failures; successful login clears the counter.
- Recovery Phrase remains account/login recovery only and does not restore master keys, file keys, key passwords, or encrypted files.

## Physical Token Prototype

- UI wording now consistently describes registration records, status, removal, and optional key-ID metadata.
- No secure-enclave, hardware-backed authentication, or sensitive-action protection claim remains.
- Unused `KeyManagementService.verifyPhysicalToken()` placeholder was removed after confirming there were no call sites.
- Association stores only a key ID and never raw key material.

## Static Frontend Sync

- Bundled Node TypeScript check: passed.
- Vite production build: passed.
- `Front-end/dist/index.html` and Spring Boot static `index.html`: matching hashes.
- Current hashed JS exists in both locations with matching hashes.
- Old JS hash is no longer referenced.
- Spring Boot MockMvc smoke test returns `200` for `/`, `/index.html`, and current hashed JS/CSS assets.
- Smoke test confirms Recovery Phrase rotate, key rename/retirement, Physical Token prototype, and remove strings are present in the served bundle.

## Tests

- Backend: `mvn test` passed, `100` tests, `0` failures, `0` errors.
- Frontend standard `npm run build`: unavailable because global `npm` is not in PATH.
- Bundled Node `tsc -b`: passed.
- Bundled Node Vite production build: passed.
- `git diff --check`: passed; only line-ending conversion warnings remain.

## PostgreSQL Compatibility

- `PhysicalTokenRecord.encryptionKeyID` maps to nullable `encryption_key_id`.
- Development configuration remains `spring.jpa.hibernate.ddl-auto=update`.
- A non-destructive schema contract test verifies the nullable mapping and update configuration.
- The real PostgreSQL database was not deleted, rebuilt, migrated, or modified during this check. Back up the database before the first manual startup that applies schema update.

## Remaining Human-required Items

- Final Google Drive, Dropbox, and OneDrive OAuth/E2E screenshots and result notes.
- Two-profile/device trusted-package export/import, wrong-password, and correct-decrypt evidence.
- Manual review of the Week 19 Word technical document, diagrams, slides, and video wording.
- Real PostgreSQL backup and a controlled first startup to observe the nullable column update.
- Desktop startup/packaging investigation after web evidence is complete.
- Selective Git staging and diff review before commit.

## Future Work

- Real USB/FIDO2/WebAuthn physical authentication and sensitive-operation enforcement.
- Recovery of master/file keys and key-password rotation with automatic re-encryption.
- Workspace sharing and full support-ticket lifecycle.
- True ML privacy/anomaly models.
- Batch queue/retry/resume, production secret management, migrations, deployment hardening, macOS, and final desktop packaging.
