# AI-assisted Security Anomaly Detection

Date: 2026-07-16

StealthSync uses explainable runtime anomaly rules. It is not a trained neural network or ML model. The term AI-assisted describes automated, contextual risk scoring whose inputs, thresholds, and reasons can be inspected in code and in the administrator log.

## Runtime Events

The audit service records these application events when their real code paths run:

- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `DEVICE_REGISTERED`
- `DEVICE_ACCESS_DENIED`
- `DEVICE_REVOKED`
- `OAUTH_CONNECTED`
- `OAUTH_FAILED`
- `FILE_UPLOAD_SUCCESS`
- `FILE_UPLOAD_FAILED`
- `FILE_DOWNLOAD_SUCCESS`
- `DECRYPTION_FAILED`
- `WRONG_KEY_PASSWORD`
- `FILE_DELETE`
- `KEY_CREATED`
- `KEY_RETIRED`

Audit persistence uses an independent transaction and is best effort. A logging failure is reported to the server log but does not replace the result of the user operation.

## Sanitized Fields

Each persisted event may contain:

- authenticated `userID` and canonical username
- action
- server-observed remote IP address
- timestamp
- provider
- SHA-256 device identifier hash
- risk score, level, explanation, and detector version

The event API does not accept user ownership from a request parameter. Audit records never contain a login password, key password, recovery phrase, OAuth token, raw encryption key, raw device UUID, or file plaintext.

## Explainable Rules

Detector version: `explainable-rules-v1`.

| Behavior | Window | Result |
| --- | --- | --- |
| A single failed login | Below five failures in ten minutes | Score 10, LOW |
| Repeated failed login | Fifth and later failure in ten minutes | Score 60, HIGH |
| A single wrong key password | Below three failures in ten minutes | Score 15, LOW |
| Repeated wrong key password | Third and later failure in ten minutes | Score 60, HIGH |
| Rapid file download | Tenth and later download in five minutes | Add 35 |
| Rapid download after device registration | Device registered during the preceding ten minutes | Add 25; combined rapid-download score is 60, HIGH |
| A denied device request | Below three denials in ten minutes | Score 20, LOW |
| Repeated denied device requests | Third and later denial in ten minutes | Score 60, HIGH |
| Rapid file deletion | Tenth and later deletion in five minutes | Score 60, HIGH |
| Other failed/decryption events | No higher rule matched | Score 10, LOW |

The score is clamped to the range 0 to 100. Levels are:

- `LOW`: 0-29
- `MEDIUM`: 30-59
- `HIGH`: 60-100

`HIGH` sets `isSuspicious=true`. Event windows are scoped by user so activity from different users is never combined. Unknown failed-login identities use a normalized submitted identifier only for their own failure window.

## Administrator View

The administrator activity-log page supports:

- All events or flagged events only.
- Risk-level filtering.
- Score, level, reason, detector version, provider, and hashed device context.
- Authenticated CSV download with the same security fields.

Administrator routes require the administrator role. A customer request receives 403.

## Automated Evidence

Backend tests cover a normal LOW login, five failed logins, three wrong key passwords, rapid downloads after new-device registration, repeated denied-device requests, per-user window isolation, and the absence of secret-bearing fields. Security tests also exercise runtime HTTP login events and administrator route access control.
