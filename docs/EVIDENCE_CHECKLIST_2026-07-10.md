# StealthSync Evidence Checklist - 2026-07-10

This checklist is the current final-report/video evidence tracker. Do not mark an item as done unless a screenshot, short result note, or reproducible demo step exists.

## Current Evidence Folder

- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Google success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Dropbox success 2.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 1.png`
- `C:\Users\Z\Desktop\Project (Last two semester)\Onedrive success 2.png`

These files are reference evidence from prior manual runs. The checklist below keeps final manual capture items as `MISSING` until the final report/video set chooses the exact screenshots or short result notes.

## Three-cloud Web E2E Evidence

| Provider | OAuth connected | Active provider | Encrypted upload | Provider list | Wrong password fails | Correct password decrypts | Cloud file is ciphertext | Delete works |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Google Drive | MISSING: final screenshot/result note | MISSING: final screenshot/result note | MISSING: final screenshot/result note | MISSING: final screenshot/result note | MISSING: failed decrypt toast/log | MISSING: successful decrypt/save result | MISSING: cloud-side ciphertext evidence | MISSING: delete success |
| Dropbox | MISSING: final screenshot/result note | MISSING: final screenshot/result note | MISSING: upload success | MISSING: encrypted file list | MISSING: failed decrypt toast/log | MISSING: successful decrypt/save result | MISSING: cloud-side ciphertext evidence | MISSING: delete success |
| OneDrive | MISSING: final screenshot/result note | MISSING: final screenshot/result note | MISSING: upload success | MISSING: encrypted file list | MISSING: failed decrypt toast/log | MISSING: successful decrypt/save result | MISSING: cloud-side ciphertext evidence | MISSING: delete success |

## Multi-device / Trusted-device Evidence

Manual runbook: `docs/MULTI_DEVICE_TRUSTED_PACKAGE_DEMO_STEPS_2026-07-09.md`.

If the demo uses two browser profiles on the same local backend, describe it as:

> Multi-device demo is simulated with two browser profiles on the same local backend. The key package supports imported-device key lookup through stable key fingerprint fallback.

Required evidence:

- MISSING: Profile A creates an encryption key.
- MISSING: Profile A uploads an encrypted file with `keyID + keyPassword`.
- MISSING: Profile A exports a trusted-device package.
- MISSING: Open exported JSON and show it contains no key password, raw key, or password verifier.
- MISSING: Profile B imports the trusted-device package.
- MISSING: Profile B decrypts the cloud file with the same key password.
- MISSING: Profile B wrong-password attempt fails.

## UX / Policy Evidence

- DONE in code: backend rejects free-user `AES-256-GCM` key creation with `AES-256-GCM requires an active premium subscription.`
- DONE in code: Encryption Keys UI defaults to `AES-128` and disables `AES-256-GCM` unless an active premium subscription exposes an `AES-256-GCM` plan.
- MISSING: screenshot showing free-user key creation UI with `AES-256-GCM (Premium only)` disabled.
- MISSING: screenshot or short note showing premium user can select/create `AES-256-GCM`.

## Known Issues and Future Work Evidence

- DONE in docs: final scope guard records desktop startup/packaging as a known issue and the web app as the validation target.
- DONE in docs: final scope guard records Physical Token as a prototype, not hardware-backed USB authentication.
- DONE in docs: final scope guard records Recovery Phrase as account/login recovery only.
- DONE in docs: final scope guard records real ML/recommendation/advanced anomaly detection as Future Work.

## Non-human Implementation Checks

- DONE: backend tests passed with `mvn test` (`100` tests, `0` failures/errors on 2026-07-11).
- DONE: frontend build passed through bundled Node with `tsc -b` and `vite build`.
- DONE: scope guard document created: `docs/FINAL_SCOPE_GUARD_2026-07-10.md`.
- DONE: wording checklist created: `docs/FINAL_DOC_WORDING_CHECKLIST_2026-07-10.md`.
- DONE: support fallback checked/updated in the static customer FAQ page.
- DONE: privacy scanner documented as a rule-based sensitive-data warning, not a real ML model.
- DONE: desktop startup/packaging is documented as a Known Issue; no desktop packaging fix was attempted.
- DONE: database password fallback removed; repository secret references reviewed without printing values.
- DONE: encryption-key DELETE replaced with owner-scoped safe retirement; retired encryption/decryption behavior covered by automated tests.
- DONE: Recovery Phrase uses a validated 2048-word resource and in-memory consecutive-failure throttling.
- DONE: Physical Token wording describes optional key-ID metadata only; unused placeholder verification function removed.
- DONE: frontend production build synchronized to Spring Boot static resources; current index asset references and feature strings verified.
- DONE: nullable `physical_tokens.encryption_key_id` schema contract and development `ddl-auto=update` configuration checked without modifying the real PostgreSQL database.
- DONE: Spring Boot static smoke test returns `200` for `/`, `/index.html`, and the current hashed JS/CSS assets, and verifies the latest feature strings.

## Human-required Capture List

- Complete OAuth login/consent screenshots if tokens expire before recording.
- Capture upload/list/wrong-password/correct-decrypt/delete/ciphertext evidence for Google Drive, Dropbox, and OneDrive.
- Run the two-profile trusted-device package demo and capture export/import/decrypt evidence.
- Open the exported package JSON during recording or screenshots to prove no raw key/password/verifier is exported.
