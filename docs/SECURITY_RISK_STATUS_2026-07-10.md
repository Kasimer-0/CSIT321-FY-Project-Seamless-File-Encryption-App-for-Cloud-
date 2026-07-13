# Security Risk Status - 2026-07-10

This record summarizes the current StealthSync security baseline after the AES tier enforcement fix. The web app remains the validation target. Desktop packaging and real ML/AI model work are intentionally out of scope for this pass.

## Current Status

| Risk Area | Status | Notes |
| --- | --- | --- |
| JWT / RBAC / ownerID isolation | Mostly resolved | JWT auth, role-based admin protection, and owner-scoped customer APIs are in place. Existing ownership/security tests cover unauthenticated access, customer-to-admin access, and cross-owner access attempts. |
| Google Drive metadata plaintext leak | Resolved for new files | New Google Drive files use randomized object names and encrypted metadata. Old files are handled through compatibility/migration behavior so existing demo uploads remain readable. |
| Fixed demo passphrase | Resolved for main flow | Main upload/decrypt flows use user-owned password-protected keys or user vault passphrases. A legacy fallback remains only for old Google Drive/local demo files created before the key flow existed. |
| AES tier enforcement | Resolved in this pass | Backend now enforces the user's subscription encryption policy when creating, importing, or changing keys. Upload/encryption paths also reject keys that no longer match the user's current tier. |
| Encryption key deletion | Resolved through retirement | DELETE now marks owner-scoped key metadata as `retired`. Salt/fingerprint/algorithm/key scheme remain available for old-file decryption; retired keys cannot encrypt new files. |
| Physical Token | Prototype | Registration, lifecycle status, removal, and an optional owner-validated encryption-key ID association are implemented. No raw key is stored and no real USB/FIDO2 presence is verified. |
| Recovery Phrase | Account recovery only | Generation uses a validated 2048-word list; login uses canonical six-word normalization and in-memory failure throttling. Status is non-secret and rotation requires confirmation. It does not restore master keys or file keys. |
| Repository secrets | Resolved for checked configuration | Database and OAuth client-secret properties use empty environment fallbacks. JWT/vault fallbacks are development placeholders only and must be replaced for deployment. OAuth token database fields contain encrypted token text, not hardcoded repository tokens. |
| `ddl-auto=update` / local DB defaults | Dev-only | Acceptable for local development and demo setup. Final report should mark this configuration as development-only, not a production deployment baseline. |

## AES Tier Enforcement Detail

- Free/non-subscribed customers are allowed to create and use `AES-128` keys only.
- Premium customers with an active subscription plan using `AES-256-GCM` are allowed to create and use `AES-256-GCM` keys.
- The backend rejects a free user's `AES-256-GCM` request with a clear error: `AES-256-GCM requires an active premium subscription.`
- The frontend `algorithm` value is treated as a request only. The backend validates it against the user's current subscription policy.
- Upload/encryption uses a dedicated key-material path that re-checks the key algorithm against the user's current tier, so downgraded users cannot keep using old premium keys for new encryption.
- Decryption does not enforce the current tier so users can still recover files encrypted before a downgrade.

## Validation Targets

- Free user creates `AES-128`: expected success.
- Free user creates `AES-256-GCM`: expected failure.
- Premium active subscription user creates `AES-256-GCM`: expected success.
- Local and cloud upload paths use keyID + keyPassword and enforce the current tier.
- Trusted-device package export/import still excludes raw key material, key password, and password verifier.

## Remaining Reporting Constraints

- Do not claim real ML model, true anomaly-learning model, or recommendation model. Keep any AI mention to documented rule-based suspicious activity flags unless a later design document is approved.
- Do not claim physical-token hardware authentication.
- Do not claim recovery phrase recovers encrypted file master keys.
- Do not claim Physical Token blocks sensitive actions or proves that a USB device is present.
- Do not claim absolute zero knowledge; required local non-secret metadata, salts, and fingerprints are stored for the demo workflow.
- Do not treat the desktop app as the primary validation target until desktop startup/packaging is fixed.

## Final Report / Presentation Claim Boundaries

Use these boundaries when writing final documentation, slides, or video narration:

- Implemented core claim: StealthSync supports real Google Drive, Dropbox, and OneDrive OAuth flows with encrypted upload, file listing, download/decrypt, and delete paths in the web app.
- Implemented security claim: New encryption uses password-protected user encryption keys, owner-scoped APIs, JWT authorization, encrypted/randomized cloud metadata, and backend-enforced AES tier policy.
- Implemented multi-device claim: Trusted-device key packages are supported for demo/validation, but final evidence must show export/import and password-based decrypt across two browser profiles or devices.
- Prototype-only claim: Physical Token is a registration/status prototype only; hardware-backed USB authentication is Future Work.
- Account-recovery-only claim: Recovery Phrase restores account access only; it does not recover or re-wrap file master keys.
- Known issue claim: Desktop startup/packaging is not the current validation target. The web app is the evidence target until desktop packaging is fixed.
- Future Work claim: Real ML models, recommendation models, advanced anomaly detection, DB migrations, secret rotation, deployment hardening, and production observability remain Future Work.
- Removed-scope claim: Encryption Key Search is not part of the latest User Stories and is not an implemented final feature.
- Key lifecycle claim: `active` supports encryption/decryption, `inactive` requires reactivation, and `retired` supports old-file decryption only.
