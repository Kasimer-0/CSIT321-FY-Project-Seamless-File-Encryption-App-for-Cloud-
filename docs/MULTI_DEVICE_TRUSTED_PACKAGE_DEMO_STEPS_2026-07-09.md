# Multi-Device Trusted Package Demo Steps - 2026-07-09

Use this runbook to capture the final trusted-device evidence. For the first stable evidence pass, use Google Drive because its cloud metadata carries the portable key fingerprint needed after a trusted package import.

Recommended screenshot folder:

`C:\Users\Z\Desktop\Project (Last two semester)`

## Startup

1. Run `scripts\start-web-demo.cmd`.
2. If startup fails, run `powershell -ExecutionPolicy Bypass -File scripts\start-web-demo.ps1 -CheckOnly` and fix the reported missing prerequisite.
3. Open `http://localhost:5173` in Chrome Profile A.
4. Log in with the seeded customer account.

## Profile A - Create, Upload, Export

1. Open `Encryption Keys`.
2. Create a password-protected key with a known demo password.
3. Screenshot: `Trusted Profile A 01 key created.png`.
4. Open `Cloud Storage Link`, activate Google Drive, and confirm the account is connected.
5. Open `Encrypt and Upload File`.
6. Select the active key, enter the key password, and upload a small `.txt` file.
7. Screenshot: `Trusted Profile A 02 upload success.png`.
8. Open `Cloud Storage Link` and confirm the file appears in the Google Drive encrypted files list.
9. Screenshot: `Trusted Profile A 03 cloud list.png`.
10. Return to `Encryption Keys`.
11. Export the trusted-device package for the same key.
12. Save the downloaded package for Profile B import.
13. Open the JSON package in a text editor and confirm it does not contain the key password, raw key, password verifier, or recovery phrase.
14. Screenshot: `Trusted Profile A 04 package no secrets.png`.

## Profile B - Import, Wrong Password, Correct Password

1. Open a second Chrome profile, Incognito window, second Windows profile, VM, or second Windows device.
2. Open `http://localhost:5173`.
3. Log in with the same demo customer account for the first evidence pass.
4. Open `Encryption Keys`.
5. Import the trusted-device package exported by Profile A.
6. Screenshot: `Trusted Profile B 01 import success.png`.
7. Open `Decrypt and Download File`.
8. Select the Google Drive file uploaded by Profile A.
9. Enter an intentionally wrong key password.
10. Confirm decrypt fails.
11. Screenshot: `Trusted Profile B 02 wrong password fails.png`.
12. Enter the correct key password.
13. Confirm the decrypted file saves successfully.
14. Screenshot: `Trusted Profile B 03 correct password decrypts.png`.

## Evidence Notes

- The trusted package must export metadata only. It must not export the key password, raw key, password verifier, or recovery phrase.
- The backend now resolves imported trusted-device keys by key fingerprint when the imported database `keyID` differs from the original upload metadata.
- If a stricter second-device demo is required later, repeat the same steps on a second Windows machine or clean local database and reconnect the same Google Drive account before importing the package.
- Dropbox and OneDrive can use the same upload/decrypt evidence flow, but Google Drive is the safest provider for the first multi-device trusted-package proof because of its portable key fingerprint metadata.
