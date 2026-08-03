# StealthSync Final Evidence Index

Date: 2026-07-31

## Evidence Root

`C:/Users/Z/Desktop/Project (Last two semester)/测试截图证据/2026-07-31-final/`

## Current Verified State

| Area | Result | Evidence |
| --- | --- | --- |
| Shared deployment | PASS | Local and public HTTPS endpoints returned HTTP 200 |
| Automated verification | PASS | Backend 124/124; frontend 7/7; TypeScript and Vite production build passed |
| Premium subscription | PASS | S$7, active through 2026-08-29 |
| Device state | PASS | Two retained active devices; temporary automation devices removed |
| Device limit | PENDING | The old `device-a/MD-A-01-registered-devices.png` shows a superseded temporary 3/3 rule; capture the final `2/5 active devices` state |
| Final encryption key | PASS | `device-a/KEY-01-final-key-metadata.png` |
| Three-provider limit | PASS | `device-a/CLOUD-01-three-provider-links.png` |
| Google Drive encrypted list | PASS | `device-a/GD-A-01-active-file-list.png` |
| Dropbox encrypted list | PASS | `device-a/DBX-A-01-active-file-list.png` |
| OneDrive encrypted list | PASS | `device-a/OD-A-01-active-file-list.png` |
| Free second-device control | PASS | `free/FREE-01-second-device-rejected.png` |
| Explainable HIGH logs | PASS | `admin/ADMIN-01-high-flagged-logs.png` |
| Admin CSV export | PASS | `admin/ADMIN-02-system-logs.csv` |

## Provider Record Snapshot

At capture time, the shared database contained two Google Drive records, one Dropbox record and two OneDrive records for `PremiumUser`. Provider UI screenshots show randomized `.ssenc` cloud object names and AES-256-GCM. The original filenames are not exposed as object names.

## Pending Teammate Evidence

Place Device B files in `device-b-pending/` and rename them clearly:

- `GD-B-01-wrong-password.png`
- `GD-B-02-correct-decrypt.png`
- `GD-B-03-hash-match.png`
- `DBX-B-01-wrong-password.png`
- `DBX-B-02-correct-decrypt.png`
- `DBX-B-03-hash-match.png`
- `OD-B-01-wrong-password.png`
- `OD-B-02-correct-decrypt.png`
- `OD-B-03-hash-match.png`
- `MD-B-01-device-b-active.png`

Device B upload must then be listed/decrypted on Device A. Add the corresponding `*-A-reverse-decrypt.png` and `*-A-reverse-hash.png` files before marking the multi-device test complete.

## Interpretation Rules

- Same-account Device A/Device B access is Premium multi-device.
- Different-account access must remain denied; it is not the implemented sharing use case.
- The storage usage card is not accepted as cloud file-count evidence because it currently reads the legacy local record source.
- Do not publish a screenshot containing a password, recovery phrase, OAuth token/code, JWT, client secret or database credential.
