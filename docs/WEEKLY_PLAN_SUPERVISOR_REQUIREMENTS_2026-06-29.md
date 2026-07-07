# StealthSync Weekly Recovery Plan for Supervisor Requirements

Date: 2026-06-29
Scope window: 2026-06-29 to 2026-07-05
Team capacity: 2 people, with limited time because of other coursework

## 2026-06-30 Scope Override

The supervisor has now confirmed that Dropbox and OneDrive must support real OAuth plus encrypted upload/download. Any earlier wording in this file that describes Dropbox or OneDrive as prototype-only should be treated as historical risk analysis, not the current target scope.

## 2026-07-05 Status Update

Dropbox and OneDrive are P0 real provider requirements, not Future Work and not link-only demo items. The current backend contains real OAuth, token storage/refresh, encrypted upload, list, download/decrypt, and delete code paths for both providers. Live end-to-end proof still requires manually configured Dropbox and Azure credentials.

## 1. Supervisor requirements now treated as P0

The supervisor clarified two requirements that must be demonstrated to receive a suitable mark:

1. Windows version must support linking at least three cloud providers:
   - Google Drive
   - Dropbox
   - OneDrive
2. Encrypted files must be decryptable on more than one trusted device. The system cannot only work on the original encryption device.

These requirements override the earlier plan that listed Dropbox, OneDrive, and multi-device use as Future Work.

## 2. Current code reality after scan

### Already strong

- JWT/current-user ownership isolation is mostly implemented.
- Password-protected encryption key flow exists:
  - user creates encryption key with `keyPassword`
  - encryption uses `keyID + keyPassword`
  - decryption can use stored `keyID` metadata and user-entered key password
- Google Drive has the strongest implementation:
  - OAuth flow
  - encrypted upload/download
  - randomized object names
  - encrypted metadata containing original name and key details
- Security tests and daily records already exist for 2026-06-27 and 2026-06-28.

### Remaining gaps

- Dropbox and OneDrive real remote I/O code paths exist, but live E2E evidence still needs developer app credentials and test accounts.
- The UI now treats Google Drive, Dropbox, and OneDrive as real configurable providers and shows Setup required when credentials are missing.
- Multi-device decryption has no dedicated `TrustedDevice` entity or import/export workflow yet.
- Google Drive encrypted metadata is protected by `UserVaultService.metadataPassphraseFor(ownerID)`, which may not naturally work on another machine unless the same vault data is available.
- The current safest short-term multi-device route is to make encryption-key metadata portable and let trusted devices decrypt using the same `keyPassword`.

## 3. Recommended strategy for this week

### Cloud provider requirement

Target a defensible minimum:

- Keep Google Drive, Dropbox, and OneDrive as real provider targets.
- All three providers must use the shared `keyID + keyPassword` encryption/decryption path.
- Missing credentials must show clear Setup required / Not configured errors, not fake success.
- Live proof requires at least one successful remote operation per provider after credentials are configured.

Live evidence should include at least one successful remote operation per provider once credentials are available.

### Multi-device requirement

Implement 鈥渢rusted device key package鈥?rather than real device sync infrastructure.

Minimum demo:

1. Device A creates encryption key and encrypts file.
2. Device A exports a trusted-device package containing non-secret key metadata:
   - keyID
   - keyName
   - algorithm
   - fingerprint
   - salt
   - keyScheme
3. User transfers this package manually to Device B.
4. Device B imports the key metadata after login.
5. User enters the same key password on Device B.
6. Device B derives the same passphrase and decrypts the encrypted file.

This is acceptable as a controlled FYP prototype if documented as manual trusted-device onboarding.

Important: do not export key passwords, raw derived bytes, or plaintext file keys.

## 4. Human-required tasks

These cannot be fully solved by code alone:

1. Create or verify cloud developer apps:
   - Google Cloud OAuth credentials
   - Dropbox app credentials
   - Azure app registration for OneDrive
2. Provide redirect URI values for each provider.
3. Prepare at least two Windows environments:
   - two physical machines, or
   - one machine plus Windows VM, or
   - two clean Windows user profiles if hardware is limited
4. Manually authorize cloud accounts in browser.
5. Manually transfer the trusted-device package from Device A to Device B.
6. Capture evidence:
   - screenshots of three linked providers
   - encrypted upload/download evidence
   - Device A encrypts, Device B decrypts
   - test logs
7. Run real Dropbox and OneDrive remote upload/download tests after credentials are configured.

## 5. One-week plan

### 2026-06-29 Monday

Focus: confirm feasibility and create baseline plan.

- Audit current Dropbox/OneDrive code.
- Confirm Google Drive remains the full provider.
- Design trusted-device export/import package.
- Create route/API design for:
  - export encryption key package
  - import encryption key package
  - list trusted/imported keys
- Confirm Dropbox/OneDrive credential availability and redirect URI values.
- Run current tests and document baseline failures.

Exit standard:

- Written plan exists.
- Code gaps are known.
- Today鈥檚 task instruction is ready.

### 2026-06-30 Tuesday

Focus: trusted device metadata portability.

- Add export endpoint for selected encryption key metadata.
- Add import endpoint for trusted-device package.
- Add tests:
  - export does not include password/verifier/raw material
  - imported key + same password derives matching file passphrase
  - wrong password fails
- Add frontend export/import controls.

Exit standard:

- Device B can import metadata and pass backend derivation tests.

### 2026-07-01 Wednesday

Focus: two-device demo path.

- Simulate second device using a clean DB/profile or temp test profile.
- Export key from profile A.
- Import key into profile B.
- Prove decryption with same key password.
- Fix Google Drive metadata issues if Device B cannot read enough key information.

Exit standard:

- Manual or automated two-device evidence exists.

### 2026-07-02 Thursday

Focus: Dropbox and OneDrive real provider paths.

- Implement OAuth start/callback + owner-scoped credential records.
- Implement provider status through the unified cloud provider API.
- Add tests proving real authorization URLs, clear missing-config errors, and one active link per account.

Exit standard:

- UI can show Google Drive, Dropbox, and OneDrive linked under one account.

### 2026-07-03 Friday

Focus: provider hardening.

- If Dropbox/OneDrive OAuth credentials are available, attempt real connect.
- If not, keep code ready and show clear Setup required / Not configured states.
- Ensure frontend cloud pages do not use prototype wording for Dropbox or OneDrive.
- Ensure provider limit rules do not block the three-provider premium demo.

Exit standard:

- A premium test user can link all three providers in Windows demo.

### 2026-07-04 Saturday

Focus: integration and evidence.

- Run:
  - `mvn test`
  - `npm run build`
- Manual walkthrough:
  - login
  - create encryption key
  - link three providers
  - upload encrypted file to Google Drive
  - export trusted-device package
  - import package on second device/profile
  - decrypt with same key password
- Capture screenshots and test logs.

Exit standard:

- Evidence folder or daily record contains enough proof for report/supervisor.

### 2026-07-05 Sunday

Focus: polish and decision gate.

- Fix only demo-blocking bugs.
- Update scope baseline:
  - Google Drive: full encrypted I/O
  - Dropbox/OneDrive: real encrypted I/O code paths; live E2E pending credentials if credentials are unavailable
  - Multi-device: trusted-device key package
- Write short supervisor update.

Exit standard:

- Demo script can be followed without improvising.

## 6. Next two-week compression plan

Because coursework continues, keep the next two weeks strict:

- Week of 2026-07-06:
  - stabilize Google Drive, key/password flow, trusted-device package, and three-provider link evidence
  - finish tests and RTM mapping
- Week of 2026-07-13:
  - regression testing, docs, screenshots, user manual, final report alignment
  - no new major scope unless supervisor requires it

## 7. Recommended wording for final report

Use accurate claims:

- Google Drive, Dropbox, and OneDrive have real OAuth-backed encrypted upload/download code paths. Live E2E proof for Dropbox and OneDrive depends on configured developer credentials.
- Multi-device decryption is supported through a trusted-device key package. The package contains non-secret key metadata; the user must still know the key password.
- Physical token integration remains prototype-level unless real hardware verification is implemented.
## 8. Highest risks

1. Supervisor may expect real Dropbox and OneDrive remote upload/download, not only link records.
2. Multi-device may fail if metadata decryption relies on local-only vault material.
3. OAuth setup for Dropbox/OneDrive may take longer than coding.
4. Two-person team may not have enough time to fully implement three real cloud APIs plus trusted devices plus tests.

Mitigation:

- Keep Dropbox/OneDrive real provider code paths in P0 and clearly separate code readiness from credential-backed E2E proof.
- Implement trusted-device key package first because it is fully under team control.
- Prepare credential checklists so Dropbox/OneDrive E2E can run as soon as developer apps are configured.
