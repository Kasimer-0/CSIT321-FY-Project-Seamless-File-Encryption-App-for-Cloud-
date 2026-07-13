# Team Release Handoff - 2026-07-13

## Purpose

This document is the handoff for the `fix/backend-auth-vault-baseline` branch.
It tells a second team member exactly what to pull, what is implemented, and how
to run the required multi-device evidence test without relying on stale claims
in the older PRD, preliminary user manual, or first-semester presentation.

## Requirement Priority

When two project documents disagree, use this order:

1. Supervisor-confirmed pass requirements: real Google Drive, Dropbox, and
   OneDrive upload/download, plus decryption on multiple trusted Windows
   devices/profiles.
2. Latest Week 19 User Stories and the corrected scope in
   `docs/WEEK19_REQUIREMENTS_GAP_2026-07-11.md`.
3. Current tested implementation and API contracts.
4. Older first-semester PRD, preliminary user manual, and presentation only as
   historical references. Their ticket, workspace, real hardware token, real
   ML, and verified desktop claims are not current implemented scope.

Encryption Key Search was removed from the latest User Stories and is therefore
not a release requirement.

## Current Conformance

Implemented and covered by code paths or automated tests:

- authenticated, owner-scoped account, encryption-key, file, and cloud APIs;
- server-enforced AES tier: free uses AES-128, active Premium may use
  AES-256-GCM;
- password-protected encryption keys with safe retirement instead of destructive
  deletion;
- real OAuth and encrypted upload/list/download/decrypt/delete paths for Google
  Drive, Dropbox, and OneDrive;
- trusted-device metadata package export/import with stable key-fingerprint
  fallback;
- Account Recovery Phrase for account login only, with a BIP-39 word list and
  temporary brute-force throttling;
- Physical Token registration/status/key-association prototype;
- rule-based privacy warning and rule-based suspicious-log flags.

Still requiring manual evidence:

- complete E2E screenshots for all three real providers;
- two-profile or two-device trusted-package import and decrypt proof;
- a controlled PostgreSQL startup after backup to observe the nullable
  `physical_tokens.encryption_key_id` schema update;
- final Word document, diagrams, slides, and video wording corrections.

Known limitation: the web app is the current validation target. Windows desktop
startup/packaging remains a Known Issue and must not be presented as verified.

Future Work / not implemented:

- workspace sharing and the full support-ticket lifecycle;
- real USB/FIDO2/WebAuthn authentication and sensitive-action enforcement;
- Recovery Phrase restoration of encryption keys or encrypted files;
- true ML privacy, recommendation, or anomaly models;
- macOS, production migrations/secret management, and final desktop packaging.

## Pull and Verify the Branch

From an existing clone:

```powershell
git status --short
git fetch origin
git switch fix/backend-auth-vault-baseline
git pull --ff-only origin fix/backend-auth-vault-baseline
```

Do not run the switch/pull over uncommitted teammate work. Commit it to a
separate branch or stash it first.

Verify the source before manual testing:

```powershell
cd Back-end
mvn test
cd ..\Front-end
npm install
npm run build
cd ..
```

Expected backend result for this handoff: `100` tests, `0` failures, `0` errors.

## Local Web Startup

Prerequisites: JDK 21, Maven, Node/npm, PostgreSQL, database `CSIT321-FYP`, and
the OAuth environment variables for each provider.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-web-demo.ps1 -CheckOnly
powershell -ExecutionPolicy Bypass -File scripts\start-web-demo.ps1
```

Open `http://localhost:5173`. Stop both processes with:

```powershell
scripts\stop-web-demo.cmd
```

If startup fails, inspect `.stealthsync-run\logs\backend.err.log` and
`.stealthsync-run\logs\frontend.err.log`. These local logs are ignored by Git.

## Required Multi-device Test

Use Chrome Profile A and Profile B first. This simulates two trusted clients
against the same local backend. Use the same demo customer account on both
profiles so owner-scoped APIs remain valid.

### Profile A

1. Sign in and open **Encryption Keys**.
2. Create a key and keep its key password outside the repository.
3. Connect and activate Google Drive.
4. Encrypt/upload a small uniquely named text file with that key.
5. Confirm the provider list displays the encrypted object.
6. Export the key's trusted-device JSON package.
7. Open the JSON and verify that it contains metadata only. It must not contain
   the key password, a raw key, a password verifier, or a Recovery Phrase.

### Profile B

1. Sign in to the same customer account in a separate Chrome profile or on a
   second Windows device.
2. Paste/import the JSON package on **Encryption Keys**.
3. Select Profile A's cloud file on **Decrypt and Download File**.
4. Enter a deliberately wrong key password and record the expected failure.
5. Enter the correct key password and verify the downloaded plaintext byte for
   byte against the original.

Use Google Drive for the first proof because its cloud metadata carries the
portable key fingerprint used by the imported-device fallback. After that proof
passes, repeat upload/list/wrong-password/correct-decrypt/delete evidence for
Dropbox and OneDrive.

Suggested evidence names:

- `Trusted A 01 key created.png`
- `Trusted A 02 encrypted upload.png`
- `Trusted A 03 package contains no secrets.png`
- `Trusted B 01 import success.png`
- `Trusted B 02 wrong password rejected.png`
- `Trusted B 03 correct decrypt verified.png`

## Three-cloud Acceptance Checklist

For each of Google Drive, Dropbox, and OneDrive, retain evidence for:

- OAuth connected;
- provider active (only one active provider at a time);
- encrypted upload success;
- encrypted file visible in the provider list;
- wrong key password rejected;
- correct key password decrypts the original file;
- provider-side object is ciphertext/randomized rather than plaintext;
- delete succeeds.

Do not mark missing screenshots as passed. Track them in
`docs/EVIDENCE_CHECKLIST_2026-07-10.md`.

## Safe Final-report Wording

- Say **three real cloud providers are implemented**, subject to the retained
  E2E evidence.
- Say **multi-device support is implemented through a trusted-device metadata
  package and same key password**, then show the two-profile/device evidence.
- Say **Physical Token registration prototype**, not hardware-backed MFA.
- Say **Account Recovery Phrase**, not encryption-key recovery.
- Say **rule-based detection**, not a trained AI/ML model.
- Say **web validation target; desktop Known Issue**.
- Avoid `absolute zero knowledge`: plaintext files and key passwords are not
  uploaded, while the local backend retains required non-secret operational
  metadata such as salts, fingerprints, and encrypted provider metadata.
