# Final Presentation And Video Evidence Map

Prepared: 2026-08-06

## Purpose

This file is the working source of truth for the Final Presentation Slides, Project Video and Marketing Video. A feature may be presented as implemented only when it matches the frozen scope and has code, test or screenshot evidence.

## Source Material Audited

- Preliminary deck: `C:/Users/Z/Desktop/Project (Last two semester)/First semester/FYP-26-S2-32_PreliminaryPresentationSlides.pptx`
- Preliminary scripts: `Presentation Script.docx` and `Presentation Script - Demo Updated.docx`
- Final UI evidence root: `C:/Users/Z/Desktop/Project (Last two semester)/测试截图证据/2026-07-31-final/`
- Local reviewed User Manual: `outputs/document-review/2026-08-05/user-manual/FYP-26-S2-32_UserManual_CodexReview_2026-08-05.docx`

The preliminary deck provides a visual starting point only. Its Week 11 schedule, Google-only prototype demo, H2 final-database claim, Physical Token, Factory Reset and planned local-ML wording are obsolete.

## Final Presentation Map

| Slide | Purpose | Evidence or source | Status |
| --- | --- | --- | --- |
| 1 | StealthSync title, FYP ID and team | Existing title slide; verify names and IDs | READY TO EDIT |
| 2 | Problem: cloud plaintext privacy and difficult encryption workflows | Project description and final Technical Document | READY |
| 3 | Final objectives and frozen scope | Three real providers, local/browser encryption, key management, JWT and multi-device | READY |
| 4 | Architecture and trust boundary | Final architecture diagram; browser encrypts before provider upload; shared backend stores owner-scoped metadata, not plaintext files | SOURCE CHECK REQUIRED |
| 5 | Real three-cloud integration | `device-a/CLOUD-01-three-provider-links.png` plus the three provider list screenshots | READY |
| 6 | Encryption and key policy | `device-a/KEY-01-final-key-metadata.png`; Free is limited to AES-128, while active Premium can choose AES-128 or AES-256-GCM | READY |
| 7 | Premium multi-device | Same StealthSync account, up to five active devices; final `2/5` Devices screenshot and Device B evidence | EVIDENCE PENDING |
| 8 | Security controls | JWT, ADMIN RBAC, owner isolation, password-protected keys, wrong-password rejection | CODE/TEST READY; SCREENSHOT PENDING |
| 9 | Privacy warning and admin monitoring | `device-a/PRIVACY-01-sensitive-data-warning.png`, `admin/ADMIN-01-high-flagged-logs.png`, `admin/ADMIN-03-recent-activity.png` | READY |
| 10 | Verification results | Backend 147/147; frontend 12/12; TypeScript/Vite pass; three-cloud functional result | READY, UPDATE ON FINAL RUN |
| 11 | Project schedule and completion status | Reviewed Gantt copy with Sprint 5 ending 2026/8/9; submission deadline 2026/8/15 | READY |
| 12 | Live demo route | Login, key, provider, upload, randomized ciphertext, wrong password, correct decrypt, hash result | DEVICE B FILES PENDING |
| 13 | Delivered scope and honest limitations | Web is validated target; final Windows package only after clean-launch smoke test; rule-based detection is not trained ML | READY |
| 14 | Conclusion and questions | Restate encrypted-before-cloud result and three-provider support | READY |

## Required Corrections To The Preliminary Deck

- Replace the old Selling Point slide. Do not claim a trained AI model, hardware-backed Physical Token, Factory Reset or trusted-package import/export.
- Replace the Week 11 schedule with the reviewed final schedule and Sprint 5 end date `2026/8/9`.
- Replace the Google-only Prototype Demo with Google Drive, Dropbox and OneDrive coverage.
- Remove the claim that the final product uses H2 and needs no shared service. The validated web deployment uses PostgreSQL and a shared Spring Boot backend.
- Do not describe the current JavaFX/WiX installer as final until a new package from the frozen code passes clean-launch and core-flow smoke tests.
- Describe Recovery Phrase only as account/login recovery. It cannot recover a file key or key password.
- Describe the current privacy and suspicious-log features as explainable rule-based detection, not ML.
- Use the final limits consistently: Free one provider/one active device; Premium three providers/five active devices; Premium S$7/month.

## Project Video Shot List

Record the real workflow in this order. Use cuts only where OAuth waiting or file transfer would otherwise waste time.

1. Open the shared HTTPS URL and log in as `PremiumUser`.
2. Show the active Premium subscription and the final limits.
3. Show the password-protected AES-256-GCM key metadata without revealing the key password.
4. Show all three linked providers and explain that only one is the active upload target at a time.
5. Upload a harmless sample through Google Drive and show the randomized `.ssenc` object.
6. Enter an intentional wrong key password and show that no plaintext output is produced.
7. Enter the correct password, save the file and show the matching SHA-256 result.
8. Repeat the list/decrypt result for Dropbox and OneDrive; a concise evidence montage is acceptable if live repetition is too long.
9. Show Device A and Device B using the same Premium account, including the final `2/5 active devices` page.
10. Demonstrate Revoke and Restore: revoked device cannot log in; Restore allows a fresh login and available-slot claim.
11. Show the rule-based Privacy Warning and choose Cancel so no sample is uploaded.
12. Log in as admin, show Recent Activity, risk reasons, filters and CSV export.
13. Close with the automated test totals and the final scope statement.

## Marketing Video Shot List

Keep the marketing video concise and benefit-led. Do not show credentials, setup commands or implementation internals.

1. Problem: cloud files should not leave the user in readable form.
2. Select a file and a protected key.
3. Show encrypted upload to Google Drive, Dropbox and OneDrive.
4. Show the randomized ciphertext object and local decryption.
5. Show Premium multi-device continuity using the same StealthSync account.
6. End with: password-protected AES-GCM, three real cloud providers and explainable privacy warnings.

## Evidence Ownership And Remaining Files

### Available locally

- Three-provider link view and all three Device A encrypted-file lists.
- Final key metadata.
- Free second-device rejection.
- Admin HIGH/Flagged logs, CSV and Recent Activity.
- Rule-based Privacy Warning.

### Teammate must provide

- Device B registered and active screenshot.
- Google Drive, Dropbox and OneDrive wrong-password screenshots on Device B.
- Correct-decrypt and SHA-256 screenshots on Device B.
- Device B upload listed/decrypted on Device A, including reverse SHA-256 results.

### Owner must capture after teammate files arrive

- Final clean `2/5 active devices` screenshot.
- One concise Revoke/Restore sequence for the Project Video.
- Final desktop clean-launch and core-flow evidence, but only after the installer is rebuilt from frozen source.

## Recording Safety

- Never display passwords, recovery phrases, JWTs, OAuth codes/tokens, client secrets or database credentials.
- Use fictional or harmless files only.
- Do not show personal cloud content outside the StealthSync test objects.
- Do not call a verbal result evidence-complete until the corresponding file is stored and checked.
