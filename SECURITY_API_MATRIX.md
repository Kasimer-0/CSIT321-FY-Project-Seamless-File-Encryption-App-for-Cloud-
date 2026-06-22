# StealthSync API Security Matrix

## JWT contract

Authenticated requests use Authorization: Bearer TOKEN. Tokens are signed with HS256 and contain:

- sub: authenticated userID
- role: admin or customer
- exp: expiry time as a Unix timestamp
- iat: issue time as a Unix timestamp

The default lifetime is 3,600 seconds. Set JWT_SECRET outside local development.

## Public routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /, /index.html, /assets/**, /static/**, icons | Desktop/web static application |
| POST | /login | Password login and token issue |
| POST | /signup | Customer registration |
| POST | /account/recovery-phrase/login | Recovery phrase login and token issue |
| GET | /cloud-storage/oauth/google/callback | Google OAuth callback validated by pending OAuth state |

## Authenticated routes

| Access | Routes |
| --- | --- |
| Any signed-in account | /me, /me/**, /logout, GET /plans, /desktop/** |
| Customer only | /account/** except recovery login, /cloud-storage/** except OAuth callback, /encryption-keys/**, /physical-tokens/**, /vault/**, /privacy/**, /files/**, /api/file/**, POST /subscriptions/purchase |
| Admin only | /admin/**, /users/**, /enc-methods, plan create/update/status routes, subscription list/detail/update/cancel routes |

AdminInsightsController also uses @PreAuthorize("hasRole('ADMIN')") so reports, CSV downloads, and logs remain admin-only even if URL rules are changed later.

## Ownership rule

Customer-owned controllers resolve the account from the JWT subject through CurrentUserService. Cloud link, Google Drive, local encrypted file, encryption key, physical token, account-security, and plan-purchase operations do not accept an authoritative ownerID or userID from the client.