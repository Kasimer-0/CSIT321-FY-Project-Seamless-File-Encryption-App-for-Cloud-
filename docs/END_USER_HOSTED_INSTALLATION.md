# End-User Hosted Installation Text

Use this section as the source text for the final User Manual after the production URL and installer are confirmed.

## Web Application

### Requirements

- Windows 11, macOS, or a current mobile/desktop operating system with a supported browser.
- Current Microsoft Edge or Google Chrome.
- Internet connection.
- A StealthSync account.
- A Google Drive, Dropbox, or OneDrive account for the provider being linked.

Java, Maven, Node.js, PostgreSQL, Docker Desktop, PowerShell, and OAuth application credentials are **not** end-user requirements.

### Open StealthSync

1. Open `https://stealthsyncfyp26s211.duckdns.org`.
2. Confirm the browser shows HTTPS and the expected StealthSync hostname.
3. Register a new account or log in.
4. Open **Cloud Storage Links** and select **Link Account**.
5. Complete authorization on the provider's official page and return to StealthSync.
6. Create a password-protected encryption key, select a file, and upload the encrypted result.
7. To recover a file, open **Decrypt File**, enter the same Key Password, and save the decrypted output.

The project team operates the hosted API and database. End users do not start a server or keep a particular team computer online.

## Optional Windows Client

Only publish this section after rebuilding the installer with the final production frontend URL and completing an external clean-install smoke test.

1. Download the current StealthSync Windows installer from the official GitHub Release.
2. Verify its SHA-256 value against `SHA256SUMS.txt`.
3. Run the installer and follow the Windows setup wizard.
4. Open StealthSync from the Start menu or desktop shortcut.
5. Log in and use the same hosted account and cloud links as the web application.

The Windows Client is a desktop window for the same hosted StealthSync service. It does not install or start a private backend or database.

## Account and Encryption Notes

- Free accounts use AES-128, one linked provider, and one active device.
- Active Premium accounts can choose AES-128 or AES-256-GCM, link up to three providers, and use up to five active devices.
- The Key Password is required to derive the encryption key locally. StealthSync does not store or recover it.
- Recovery Phrase supports StealthSync account/login recovery only. It does not recover Key Passwords, file keys, or encrypted files.
- Deactivate stops new uploads to a provider but still permits listing and download. Remove disconnects the provider account.

### Back up or restore an encryption key

1. Open **Encryption Keys**.
2. Select **Export Backup** beside a V2 key and enter that key's Key Password.
3. Save the encrypted `.sskey` file in a protected offline location. Keep the Key Password separately.
4. To restore it, choose the `.sskey` file under **Restore Encrypted Key Backup**, enter the same
   Key Password, and select **Restore Key**.

The browser encrypts and decrypts the backup locally. The package does not export the raw key, Key
Password, or password verifier. Losing both the backup and its Key Password cannot be bypassed by
StealthSync. Importing a key whose fingerprint already exists is safely rejected.

### Subscription demonstration boundary

The current course-project purchase control changes the demo subscription immediately. It is not a
real payment transaction and does not collect card or banking details. Integrating an external payment
provider requires separate merchant credentials, hosted checkout configuration, verified webhooks,
refund/cancellation handling, and provider-specific production testing, so it remains outside this
release rather than being represented as completed payment processing.
