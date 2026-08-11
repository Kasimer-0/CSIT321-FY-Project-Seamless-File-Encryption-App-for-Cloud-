# Production Deployment and Acceptance Checklist

## Manual Render Setup

- [ ] Create a long-lived Render team account with billing owned by the project team.
- [ ] Provision the Blueprint from `main`.
- [ ] Keep the API on a paid always-on Web Service plan.
- [ ] Keep PostgreSQL on at least a paid `basic-256mb` plan.
- [ ] Keep billing active until at least one month after the final presentation.
- [ ] Record the actual frontend URL: `https://________________`.
- [ ] Record the actual backend URL: `https://________________`.
- [ ] Set backend frontend URL and exact CORS origin to the actual frontend origin.
- [ ] Set frontend `VITE_API_BASE_URL` to the actual backend origin and redeploy.
- [ ] Confirm `https://<backend-host>/actuator/health` returns `200` and `{"status":"UP"}`.

## Manual Secret Entry

- [ ] Database variables are injected from Render PostgreSQL.
- [ ] `JWT_SECRET`, `OAUTH_STATE_SECRET`, `VAULT_SERVER_SECRET`, and `TOKEN_ENCRYPTION_SECRET` are independent generated values.
- [ ] Google client ID, secret, and exact callback are entered.
- [ ] Dropbox app key, secret, and exact callback are entered.
- [ ] OneDrive client ID, secret, tenant, and exact callback are entered.
- [ ] Secrets are backed up in an approved private password manager.
- [ ] No populated environment file or database dump is tracked by Git.

## OAuth Console Setup

- [ ] Google callback: `https://<backend-host>/cloud-storage/oauth/google/callback`.
- [ ] Google app is External Production, or every demonstration account is a test user and will be reauthorized before presentation.
- [ ] Dropbox callback: `https://<backend-host>/cloud-storage/dropbox/callback`.
- [ ] OneDrive Web callback: `https://<backend-host>/cloud-storage/onedrive/callback`.
- [ ] All three configured callbacks exactly match the corresponding Render variables.

## External Functional Acceptance

Run from a network that is not the development PC's local network.

- [ ] Registration and login succeed on the production frontend.
- [ ] Google: connect, callback, encrypted upload, list, wrong-password rejection, correct decrypt, SHA-256 match, delete.
- [ ] Dropbox: connect, callback, encrypted upload, list, wrong-password rejection, correct decrypt, SHA-256 match, delete.
- [ ] OneDrive: connect, callback, encrypted upload, list, wrong-password rejection, correct decrypt, SHA-256 match, delete.
- [ ] Cloud-side objects are `.ssenc` ciphertext and do not reveal the original filename.
- [ ] Device B logs in to the same Premium account and decrypts Device A's file.
- [ ] Device B uploads a new encrypted file and Device A can list/decrypt it.
- [ ] A different StealthSync customer cannot read another customer's links, keys, or files.
- [ ] Backend redeploy preserves accounts, links, key metadata, device records, and file indexes.
- [ ] With the development PC shut down, production frontend, backend health, login, and provider listing remain available.

## Desktop Release Gate

- [ ] Build with `-ServiceUrl https://<production-frontend-host>`.
- [ ] Verify the installed client contains no Dev Tunnel URL or client secret.
- [ ] Complete clean install, login, three-provider listing, upload, wrong-password rejection, correct decrypt/save, delete, logout, and uninstall on another Windows PC.
- [ ] Publish the installer and checksum only as a GitHub Release asset.

## Evidence

- [ ] Frontend and backend Render dashboards show healthy production deploys.
- [ ] Backend health response is captured without environment details.
- [ ] Three-provider screenshots exist for both Windows devices.
- [ ] Correct and wrong password results are captured.
- [ ] Matching SHA-256 output is captured.
- [ ] A post-redeploy persistence check is captured.
- [ ] An external check with the development PC powered off is captured.

The system meets the **publicly accessible for at least one month** requirement only after every hosting, OAuth, external acceptance, persistence, and billing item above is complete.
