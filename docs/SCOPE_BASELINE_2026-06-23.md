# StealthSync Scope Baseline - 2026-06-23

## Current FYP Scope
StealthSync is frozen around the Windows desktop demo, Google Drive integration, local encryption/decryption, JWT authentication, user data isolation, user vault/key flow, Google Drive metadata protection, AES tier enforcement, and repeatable security/integration test evidence.

## P0
- Windows desktop app flow.
- Google Drive link, encrypt-upload, list, decrypt-download, decrypt-save, and delete flow.
- Local encrypted file upload, list, decrypt-download, decrypt-save, and delete flow.
- JWT/Auth with `sub=userID`, `role`, and `exp` claims.
- User data isolation: customer-owned cloud links, files, keys, physical tokens, and account-security operations must resolve owner from the current JWT user.
- Vault/key flow: file encryption must use a per-user vault key instead of a shared demo passphrase.
- Google Drive metadata protection: new Drive object names are randomized and original file names are stored only inside encrypted metadata.
- AES tier enforcement: free/basic customers use AES-128; premium customers use AES-256-GCM according to their active plan.
- Integration/security test evidence for 401, 403, and cross-user access denial.

## P1
- Performance and financial reports.
- Static customer FAQ page.
- UI polish.
- Documentation screenshots and manual evidence.

## Future Work
- Dropbox integration.
- OneDrive integration.
- macOS packaging.
- Workspace/team sharing.
- True ML recommendation model.

## Ticket System Decision
The current codebase has removed Ticket frontend/backend code. Keep it fully removed for this sprint unless the team formally decides to restore it as Future Work. Do not leave a half-removed Ticket feature in frontend imports, backend controllers, UML, or test documents.

## Notes For Report Accuracy
- The current file-encryption path uses a server-managed per-user vault baseline. Do not claim full zero-knowledge storage until the tested local `VaultService` unlock flow is connected to file and Google Drive encryption.
- Existing files uploaded before the vault migration may need to be re-uploaded because they were encrypted with the old prototype passphrase.
- Drive metadata protection applies to new uploads. Legacy Drive objects are lazily migrated on list/download by randomizing the Drive object name, moving the original filename into encrypted metadata, and deleting the old plaintext `appProperties.originalName` key when Google accepts the patch.
- See `docs/vault-derived-key-design.md` for the target master-password-derived vault design.
