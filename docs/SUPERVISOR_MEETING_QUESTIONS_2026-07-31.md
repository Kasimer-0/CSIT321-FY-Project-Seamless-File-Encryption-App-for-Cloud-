# Supervisor Meeting Questions

Date: 2026-07-31

## Current Status To Report First

- Google Drive, Dropbox, and OneDrive support real OAuth, browser-side encryption, encrypted object listing, local decrypt/download, and delete.
- The shared HTTPS deployment is working, and the teammate can test without installing PostgreSQL or running a separate backend.
- Backend tests, frontend tests, and the production frontend build pass.
- Single-device evidence exists. The remaining core manual evidence is same-account Device A/Device B cross-device decryption and reverse upload for all three providers.
- The final commercial rules are fixed internally at S$7/month, three linked providers, and five active devices.

## Questions To Ask Verbatim

1. **Premium multi-device definition**
   "Is it acceptable that Premium multi-device means the same customer account using up to five registered devices through one shared backend and database, without cross-account file sharing or trusted-package import/export?"

2. **Seamless key use**
   "The current flow asks for the encryption-key password for each upload or decrypt operation. Is that acceptable as a security trade-off, or do you expect a session-unlocked vault so the user only selects a file and clicks upload/download?"

3. **Three-cloud evidence**
   "Are screenshots, randomized ciphertext object names, wrong-password rejection, and matching SHA-256 results sufficient, or must Google Drive, Dropbox, and OneDrive all be demonstrated live in the final presentation or video?"

## Decisions Already Made Internally

- **Final packaging:** finish web E2E, cross-device evidence, and runtime checks first; then build and smoke-test the Windows desktop package before final submission.
- **AI scope:** retain the implemented explainable rule-based detector. Do not start a trained ML model unless every submission-critical item is complete and sufficient time remains.
- **Commercial limits:** S$7/month, three linked cloud providers, and five active devices.
- **Scope control:** do not reintroduce incomplete high-risk features merely to create a longer feature list. Final materials will claim only tested implementation.
- **Submission deadline:** 15 August 2026, 9:00 pm Singapore time.

## Decisions To Record During The Meeting

| Decision | Supervisor answer |
| --- | --- |
| Same-account shared-service multi-device accepted | |
| Per-operation key-password prompt accepted | |
| Required live provider coverage | |

## Meeting Outcome Rule

After the meeting, update the Technical Document, User Manual, slides, and video script with the three answers above. Do not broaden scope based on informal wording; record any requested change as a specific acceptance criterion first.
