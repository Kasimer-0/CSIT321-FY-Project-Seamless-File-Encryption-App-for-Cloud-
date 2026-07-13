# Final Scope Guard - 2026-07-10

Use this document as the final boundary for StealthSync reports, manuals, slides, and video narration. It separates what is implemented from prototype-only areas and Future Work so the FYP submission does not over-promise.

## Implemented Core Features

- Real OAuth integration with Google Drive, Dropbox, and OneDrive.
- Encrypted upload, encrypted cloud file listing, download/decrypt, and delete paths for supported cloud providers.
- Password-protected encryption keys for file encryption/decryption workflows.
- Safe encryption-key retirement: archived metadata remains available for old-file decryption but cannot encrypt new files.
- AES tier enforcement:
  - free/non-subscribed customers use `AES-128`
  - premium/active-subscription customers can use `AES-256-GCM`
  - backend rejects unauthorized algorithm requests instead of trusting frontend input.
- JWT authentication, owner-scoped customer APIs, and admin role-based access control.
- Trusted-device package support for the multi-device demo flow.
- Rule-based privacy warning before upload using filename/text-sample pattern checks.
- Admin reports/logs with explainable rule-based suspicious flags.

## Prototype / Limited Scope

- Physical Token is a registration/status/encryption-key-association prototype only. It stores an owner-owned key ID, not a raw key, and is not real USB, FIDO2, WebAuthn, or hardware-backed authentication.
- Recovery Phrase uses a validated 2048-word list and lightweight in-memory login throttling, but supports account/login recovery only. It does not recover master keys, file keys, or encrypted file access by itself.
- AI behavior is limited to rule-based warning/log flags. There is no completed real ML model.
- Desktop app/installer startup remains a Known Issue. The web application is the current validation target.

## Future Work

- Real hardware-backed USB/FIDO2 token authentication.
- Full workspace sharing and encrypted key sharing.
- Full support ticket system.
- True ML privacy scanner, recommendation model, or anomaly-detection model.
- Factory reset with secure key destruction/recovery design.
- Encryption Key Search, which was removed from the final User Stories.
- Key password rotation with automatic re-encryption of existing files.
- Batch folder queue and automatic retry/resume after interruption.
- Production credential storage through Windows Credential Manager or macOS Keychain.
- macOS support.
- Production database migrations, secret rotation, deployment hardening, and operational monitoring.

## Final Demo Wording

- Say: "The web app validates the final encrypted cloud workflow."
- Say: "The privacy warning is rule-based and local/sample-based."
- Say: "Suspicious admin logs are rule-based flags for explainability."
- Say: "Physical token, full support tickets, full workspace sharing, and true ML are Future Work."
- Do not say: "The desktop installer is the final validated product."
- Do not say: "Physical token authentication is hardware-backed."
- Do not say: "Recovery phrase recovers encryption master keys."
- Do not say: "A machine-learning model has been completed."
- Do not say: "StealthSync provides absolute zero knowledge." The local demo stores necessary non-secret metadata, salts, and fingerprints.
- Do not say: "Deleting a key destroys its metadata." The current endpoint safely retires key metadata for old-file decryption.
