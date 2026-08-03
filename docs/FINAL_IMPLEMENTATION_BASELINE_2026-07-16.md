# StealthSync Final Implementation Baseline

Date: 2026-07-16
Updated: 2026-07-31

This document is the source of truth for the functions included in the final implementation, validation, report, and demonstration. A capability belongs in final materials only when its code path and automated checks remain in the submitted repository.

## Product Target

- Windows-hosted React web client.
- One shared Spring Boot service exposed through the controlled HTTPS test URL.
- PostgreSQL as the shared persistence layer; the teammate does not install PostgreSQL or run a second backend.
- Google Drive, Dropbox, and OneDrive as real OAuth cloud providers.

## Authentication And Authorization

- Customer and administrator login returns a signed JWT.
- Protected requests send the JWT in the `Authorization` header.
- Customer resources are scoped to the user identity resolved from the JWT.
- Administrator APIs require the administrator role.
- Customer device access is bound to the device identifier hash carried by the login JWT.

## Plans And Subscriptions

- Customers can view active plans and change their demo subscription.
- Free accounts may use one active device and AES-128 keys.
- Accounts with an active paid subscription may use up to five active devices and AES-256-GCM keys.
- Expired or cancelled paid subscriptions retain device history but allow only the primary device to remain active.

## Encryption And Keys

- Local file content is encrypted and decrypted with AES-GCM.
- Customers can create, list, rename, and retire password-protected encryption keys.
- Key passwords derive key material and are not persisted.
- Stored key records contain salts, password verifiers, fingerprints, and policy metadata rather than raw keys or key passwords.
- The backend enforces the key algorithm allowed by the current subscription.

## Cloud Providers

Google Drive, Dropbox, and OneDrive each support:

- OAuth connection and connection status.
- Encrypted upload using a selected `keyID` and key password.
- Listing StealthSync encrypted objects and their protected metadata.
- Download followed by local decryption and save.
- Rejection of an incorrect key password.
- Deletion of an encrypted cloud object.

All three providers reuse the same key service, AES-GCM service, encrypted payload format, and owner-scoped controller flow. Provider access and refresh tokens are encrypted at rest. Refresh responses update a rotated refresh token when the provider supplies one.

## Premium Multi-device

- The React client creates a random device UUID and retains it in browser local storage.
- Requests send the UUID in `X-StealthSync-Device-ID`.
- The backend persists only a SHA-256 device identifier hash.
- The first customer device becomes the primary device.
- Repeated login from the same device is idempotent.
- Free accounts reject an unregistered second device with a specific entitlement error.
- Active paid accounts accept up to five active devices and reject a sixth.
- Device listing, rename, and revocation are owner-scoped.
- A revoked or inactive device cannot continue using a previously issued device-bound JWT.
- Two registered browser/device profiles using the shared service derive the same file key metadata when the user supplies the same key password.

## AI-assisted Security Anomaly Detection

- Real authentication, device, cloud file, OAuth, decryption, and key-management actions create sanitized security events.
- Explainable time-window rules assign a risk score, level, reason, and detector version.
- High-risk events are persisted as suspicious events.
- The detector does not store login passwords, key passwords, OAuth tokens, raw encryption keys, device UUIDs, or file plaintext.
- Administrator logs support all/flagged views, risk-level filtering, and CSV export with risk details.

## Account Recovery

- An active paid customer can generate or rotate a six-word account recovery phrase.
- The phrase supports account login recovery only.
- The stored value is a salted password hash, and the original phrase is returned only when it is generated.

## Admin Reports And Logs

- Administrator-only performance and financial report endpoints return persisted project data.
- CSV report downloads use authenticated requests.
- Activity logs show the event action, account, timestamp, IP address, provider, device hash, risk score, risk level, and explainable reason where available.

## Validation Boundary

The current evidence target is the Windows React web client connected to the shared Spring Boot/PostgreSQL deployment. Premium multi-device validation uses the same customer account in two registered Windows browser/device profiles. Cross-account file sharing is not part of the implemented scope.

After web E2E and cross-device evidence are complete, the same validated frontend and backend will be packaged as the Windows desktop application. The desktop package becomes a final deliverable only after clean-launch and core-flow smoke tests pass.

The explainable rule-based anomaly detector is the final default AI-assisted scope. A trained ML model is optional only after all required evidence, documents, videos, and packaging checks are complete; it is not a prerequisite for the stable final product.
