# Week 19 Requirements Gap - 2026-07-11

This record compares the current StealthSync implementation with the Week 19 Technical Document baseline (`FYP-26-S2-32_TechnicalDocument.docx`, last modified 2026-07-10). It defines the claims that may be used in the final report and identifies document sections that still need manual correction.

## Implemented

- Account authentication and account management with JWT-protected APIs.
- Admin account, plan, subscription, report, and log features.
- Backend-enforced AES tiers: free users use AES-128 and active premium users use AES-256-GCM.
- Owner-scoped encryption key lifecycle: create, list, rename, and safe retirement. New keys are active; the removed deactivate action is retained only as a legacy-data compatibility concern.
- Google Drive, Dropbox, and OneDrive OAuth and file-operation code paths.
- Encrypted cloud upload, encrypted listing metadata, download/decrypt, and delete.
- Cloud storage usage reporting.
- Rule-based privacy warning before upload.
- Trusted-device key metadata package for the multi-device demo.
- Static customer FAQ and support guidance.

## Prototype / Limited

- Physical Token is a registration, status, and encryption-key-association prototype. It does not verify a real USB/FIDO2 device and does not contain raw encryption key material.
- Account Recovery Phrase supports account/login recovery only. It does not restore an encryption key, key password, master key, or encrypted file access.
- The privacy scanner uses deterministic rules and a local text sample; it is not a trained ML model.
- Suspicious admin logs are explainable rule-based flags; they are not ML anomaly detection.
- Windows desktop startup/packaging remains a Known Issue. The web application is the current validation target.

## Future Work / Removed From Final Implemented Scope

- Encryption Key Search. The latest User Stories removed this requirement, so the frontend search control and backend search parameter were removed.
- Real USB/FIDO2/WebAuthn physical authentication.
- Physical-token enforcement for file download, account update, password reset, or other sensitive actions.
- Recovery Phrase restoration of master keys or file keys.
- Key password rotation with automatic re-encryption of existing files.
- Secure workspace sharing and encrypted key sharing.
- Full support ticket lifecycle.
- Real ML privacy, recommendation, or anomaly-detection models.
- Batch folder queue processing.
- Automatic retry/resume after interrupted transfers.
- Production secret storage through Windows Credential Manager or macOS Keychain.
- macOS support.
- Production database migrations, secret rotation, deployment hardening, and observability.

## Week 19 Technical Document Inconsistencies

1. `FR4.3` describes a Ticket System, but the final User Stories do not include tickets while the Sequence Diagram still contains ticket behavior. Remove the ticket claim/diagram or label the entire lifecycle as Future Work.
2. `FR2.3` describes Workspace Sharing, but there is no corresponding current UI or backend implementation. Move it to Future Work.
3. `FR3.1` and the Expected Outcome claim a real AI model. The current implementation is rule-based sensitive-data scanning and rule-based suspicious log flags only.
4. Project Scope and Conclusion overstate Physical Token protection of sensitive operations. The current feature records registration, status, and an optional owner-owned encryption key association only.
5. Recovery Phrase is described as local key restoration. The implemented feature recovers account login only and cannot recover file/master keys.
6. Expected Outcome lists only Google Drive and Dropbox. Add OneDrive because the supervisor requires all three providers.
7. Replace `absolute zero knowledge` with an accurate local-demo statement: plaintext files and key passwords are not uploaded, but the local backend stores required non-secret operational metadata such as encrypted metadata, salts, and key fingerprints.

## Week 19 Functional Fixes Completed

- Recovery Phrase generation and login now share one canonical six-word normalization format: `word1-word2-word3-word4-word5-word6`.
- Recovery login accepts spaces, hyphens, and repeated whitespace.
- Recovery Phrase status can be checked without returning the phrase or hash, and rotation requires explicit confirmation.
- Encryption Key Search was removed from the customer page, controller, and service.
- Encryption key rename now accepts a real user-entered non-empty name.
- Existing key algorithms are immutable; users must create a new key to use a different algorithm.
- Physical Token records can optionally reference an encryption key owned by the same current user.
- The customer Physical Token page supports register, list, activate, deactivate, and remove operations with clear prototype wording.

## Pre-commit Security Close-out - 2026-07-11

- Removed the non-empty database password fallback. Local PostgreSQL startup now obtains `DB_PASSWORD` from the Windows user environment or the local startup script without printing it.
- Secret scan found environment-variable placeholders, documented variable names, and encrypted OAuth token persistence fields. No repository value should be treated as a production secret. JWT and vault fallbacks remain clearly marked development placeholders.
- Added ignore rules for `.codex/`, `.stealthsync-run/`, and `*.pid`; existing rules already exclude frontend/backend build output, desktop artifacts, logs, and local vault data.
- Recovered the accidentally deleted `Code structure (MavenGradle standard).docx` from the current HEAD without touching source changes.
- Replaced physical encryption-key deletion with safe retirement. Retired records retain salt, fingerprint, algorithm, and key scheme, cannot encrypt new files, and can still decrypt existing files with the correct key password.
- Recovery Phrase now uses the validated 2048-word BIP-39 English word list while remaining account-login recovery only.
- Added lightweight in-memory recovery-login throttling: five consecutive failures for the same identity and remote address cause a temporary block, and successful login clears the counter.
- Cleaned Physical Token UI wording so it describes registration/status/key-ID metadata only.
- Synchronized the current frontend production build into Spring Boot static resources. Desktop packaging remains a Known Issue and the web app remains the validation target.

## Manual Follow-up

- Correct the seven inconsistent statements in the Word technical document, diagrams, slides, and video script.
- Run manual OAuth, physical UI, multi-device, and screenshot evidence steps separately. These are intentionally not performed by this code close-out.
