# Final Submission Checklist

Prepared: 2026-07-31
Deadline: **15 August 2026, 9:00 pm Singapore time**

## Submission 1 - Group Package

The ZIP filename must include the FYP Group ID. Use a final name such as:

`FYP-26-S2-32_FinalPdt-AllDocs.zip`

Required contents:

- [ ] Final Technical Documentation
- [ ] Final User Manual
- [ ] Final Presentation Slides
- [ ] Source Code
- [ ] Project Video
- [ ] Marketing Video
- [ ] Peer Assessment Form

If the package exceeds the upload limit, submit the shared Drive link as permitted by the LMS instructions. Verify sharing from a private browser before submission.

## Submission 2 - Individual Reflective Diary

- [ ] Final Reflective Diary exported to PDF
- [ ] Filename contains the FYP Group ID and student name
- [ ] Suggested pattern: `FYP-26-S2-32_<StudentID>_<Name>_Diary.pdf`
- [ ] Submitted separately by each student before the same deadline

## Product Closure Order

1. [x] Google Drive Device A to Device B and Device B to Device A functions passed; copy the teammate screenshots into the final evidence folder.
2. [x] Dropbox Device A to Device B and Device B to Device A functions passed; copy the teammate screenshots into the final evidence folder.
3. [x] OneDrive Device A to Device B and Device B to Device A functions passed; copy the teammate screenshots into the final evidence folder.
4. [x] Wrong-password rejection and correct-password SHA-256 matching were manually confirmed; evidence files remain pending.
5. [ ] Capture the final Devices page with the two retained test devices and the `2/5` limit.
6. [ ] Remove temporary test cloud objects only after evidence paths are recorded.
7. [x] Re-ran backend 145/145, frontend 12/12, TypeScript/Vite production build, and runtime HTTP smoke tests on 2026-08-05.
8. [ ] Resolve or accurately document any remaining user-visible runtime discrepancy.
9. [ ] Build the Windows desktop application/package from the validated source.
10. [ ] Smoke-test desktop login, device registration, cloud listing, upload, wrong-password rejection, correct decrypt/save, and logout.

Do not call the desktop package final until step 10 passes on a clean launch.

## OAuth And Shared Hosting Readiness - 2026-08-04

- [x] Google OAuth project is External Production rather than Testing.
- [x] Google scopes are limited to `drive.file` and `userinfo.email`.
- [x] Google, Dropbox, and OneDrive production callbacks match the fixed public URL.
- [x] `PremiumUser -> kasimer.zero@gmail.com` was reauthorized after Google publication.
- [ ] Teammate reauthorizes `testuser -> nekohuii@gmail.com` from a familiar Google device/network.
- [x] Google Drive, Dropbox, and OneDrive passed encrypted upload/list/download/decrypt/delete smoke tests.
- [x] Dropbox offline refresh and OneDrive rotated refresh-token paths passed live provider access.
- [x] Shared deployment task remains running as a health supervisor with no execution-time limit.
- [x] App-container and Dev-Tunnel failure recovery were demonstrated in under one minute.
- [x] Deliberate `-Stop` remained stopped for five minutes and normal startup restored both URLs to `200`.
- [x] Verified PostgreSQL, Vault, DPAPI environment, and checksum backup retained under ignored release outputs.

## Documentation Closure

- [ ] Replace the July 8 User Manual in Drive with the teammate's updated version.
- [ ] Update all screenshots and limits to S$7, three providers, and five devices.
- [ ] Describe Premium multi-device as the same account using the shared service on up to five registered devices.
- [ ] Describe Recovery Phrase as account/login recovery only.
- [ ] Describe anomaly detection as explainable rule-based detection, not a trained ML model.
- [ ] Remove claims that trusted-device package import/export, cross-account sharing, or hardware-backed token authentication are implemented.
- [ ] Ensure Technical Document, User Manual, slides, videos, diagrams, and code use the same final scope.
- [ ] Include evidence paths for wrong-password rejection, successful decryption, ciphertext objects, and matching SHA-256.

## Admin, Privacy And Schedule Closure - 2026-08-05

- [x] Admin Overview shows the five newest real system logs instead of placeholder content.
- [x] `View all logs` opens the full System Logs view; existing filters and CSV remain available there.
- [x] Captured `admin/ADMIN-03-recent-activity.png` without credentials or secrets.
- [x] Captured `device-a/PRIVACY-01-sensitive-data-warning.png` using fictional data, then cancelled before upload.
- [x] Updated the local reviewed Gantt workbook so Sprint 5 ends on 2026/8/9; retained the original backup.
- [x] Restored the shared deployment and confirmed the scheduled supervisor is running with local and public HTTP 200.

## AI Decision Gate

The implemented rule-based anomaly detector is the final default scope. Consider a trained ML experiment only if all of the following are already complete:

- [ ] Three-cloud cross-device evidence is complete.
- [ ] Final Technical Document and User Manual are synchronized.
- [ ] Presentation slides, Project Video, Marketing Video, and Peer Assessment Form are ready.
- [ ] Desktop package passes its final smoke test.
- [ ] At least several days remain for implementation, testing, evidence, and documentation updates.

If any condition is not met, do not add a trained ML model. Stability and truthful documentation have priority.

## Final Package Audit

- [ ] Group ID appears in every required submission filename.
- [ ] No OAuth tokens, JWTs, client secrets, database passwords, key passwords, or personal test files are included.
- [ ] Source archive excludes generated build caches and private evidence credentials.
- [ ] All links open from a private browser.
- [ ] Videos play with audio and readable UI text.
- [ ] ZIP extracts successfully and contains every required item exactly once.
- [ ] Submission receipt or confirmation screenshot is retained.
