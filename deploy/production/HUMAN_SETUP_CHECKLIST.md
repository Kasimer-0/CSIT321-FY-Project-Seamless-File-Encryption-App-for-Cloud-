# Human Setup Checklist - Oracle Always Free Production

No item in this file is automatically marked complete. Record evidence only
after the real Oracle VM, public hostname, and provider consoles have been
tested.

## 1. Oracle Cloud VM

- [ ] Create the VM in the tenancy home region using Ubuntu.
- [ ] Prefer an Ampere A1 Flex shape. Target the current Always Free allowance
      of 2 OCPUs and 12 GB RAM in total across A1 instances.
- [ ] If A1 capacity is unavailable, try another availability domain or try
      later. Use an Always Free AMD micro instance only as a lower-memory
      fallback and expect slower Docker builds.
- [ ] Save the SSH private key in a protected location. Do not upload it to the
      repository, Drive, screenshots, or the source-code ZIP.
- [ ] Restrict SSH to project maintainers where practical.
- [ ] Add OCI Security List or Network Security Group ingress for TCP 22, 80,
      and 443.
- [ ] Apply UFW rules for 22, 80, and 443 inside Ubuntu.
- [ ] Install Docker Engine and the Docker Compose plugin from Docker's Ubuntu
      repository.
- [ ] Clone `main` to an absolute path such as `/home/ubuntu/stealthsync`.
- [ ] Confirm the VM has enough free disk space for images, PostgreSQL, Vault,
      logs, and at least two backups.
- [ ] Add an external uptime check and review Oracle inactivity/reclamation
      notices throughout the required month.

## 2. DuckDNS

- [ ] Create a unique subdomain, for example
      `stealthsync-fyp.duckdns.org` if available.
- [ ] Set `PUBLIC_DOMAIN` to the hostname only, without `https://` or a path.
- [ ] Put the DuckDNS token only in the VM's mode-600
      `deploy/production/.env.production`.
- [ ] Run `sh deploy/production/update-duckdns.sh` on the VM.
- [ ] Confirm the hostname resolves to the Oracle VM public IP from a second
      network.
- [ ] Install the six-hour cron entry from the production README.
- [ ] Confirm the cron updater still succeeds after a VM reboot.

## 3. Caddy And HTTPS

- [ ] Confirm both TCP 80 and 443 are reachable from the public internet before
      starting Caddy.
- [ ] Start Compose only after DuckDNS resolves to this VM.
- [ ] Confirm Caddy obtains a trusted certificate automatically.
- [ ] Confirm `https://<DOMAIN>/` loads the StealthSync login page.
- [ ] Confirm `https://<DOMAIN>/actuator/health` returns HTTP 200 and only the
      non-detailed health response.
- [ ] Confirm plain HTTP redirects to HTTPS.

## 4. OAuth Production Callbacks

Register these exact URLs, substituting the one final DuckDNS hostname:

```text
Google:  https://<DOMAIN>/cloud-storage/oauth/google/callback
Dropbox: https://<DOMAIN>/cloud-storage/dropbox/callback
OneDrive: https://<DOMAIN>/cloud-storage/onedrive/callback
```

- [ ] Enter matching provider IDs and secrets in the VM-only env file.
- [ ] Google requests only `drive.file`, `userinfo.email`, and `openid`.
- [ ] If Google remains in Testing, add every demonstration account as a test
      user and reauthorize before the final demo because Testing refresh tokens
      can expire after seven days.
- [ ] If Google is changed to In Production, complete the consent-screen fields
      and any verification Google requires; do not claim verification unless it
      is approved.
- [ ] Dropbox has the content/metadata scopes used by upload, list, download,
      and delete, and permits the exact redirect URI.
- [ ] OneDrive is configured as a Web application, has the required delegated
      Graph permissions plus `offline_access`, and uses the intended tenant or
      `common`.
- [ ] Reconnect every migrated provider after changing its callback hostname.

## 5. Production Secrets

- [ ] Copy `.env.production.example` to `.env.production` only on the VM.
- [ ] Set file mode to `600` and directory access to the maintenance account.
- [ ] Generate independent random values for database, JWT, OAuth state, Vault,
      and OAuth-token encryption secrets.
- [ ] Back up secrets in a private password manager controlled by the project
      team.
- [ ] Never upload the populated file to GitHub, Drive, the final ZIP, logs, or
      screenshots.
- [ ] Never copy a real database dump into the repository or submission ZIP.
- [ ] If existing encrypted credentials or Vault data are migrated, retain the
      matching token-encryption and Vault secrets through a private channel.

## 6. GitHub Actions SSH Deployment

Create a protected GitHub environment named `production`, then add:

- [ ] Secret `OCI_SSH_HOST` - VM public IP or trusted SSH hostname.
- [ ] Secret `OCI_SSH_USER` - normally `ubuntu`.
- [ ] Secret `OCI_SSH_PORT` - normally `22`.
- [ ] Secret `OCI_SSH_PRIVATE_KEY` - a deployment key authorized on the VM.
- [ ] Secret `OCI_SSH_KNOWN_HOSTS` - verified host-key line, captured only after
      comparing the VM fingerprint through the Oracle console.
- [ ] Secret `OCI_DEPLOY_PATH` - absolute clone path, for example
      `/home/ubuntu/stealthsync`.
- [ ] Variable `PRODUCTION_URL` - `https://<DOMAIN>` for the Actions environment
      link; it is not a secret.
- [ ] Run `Deploy Oracle Production` manually once and confirm the validated SHA
      is the SHA deployed on the VM.
- [ ] Confirm workflow logs contain no private key, env file, client secret,
      token, database URL, or password.

## 7. GitHub Pages Marketing Website

- [ ] In repository Settings > Pages, select **GitHub Actions** as the source.
- [ ] Run `Deploy Marketing Website` and record the resulting Pages URL.
- [ ] Confirm the Pages site contains marketing content only and no login form,
      OAuth secret, API credential, or private production configuration.
- [ ] Add the final application URL as a clear call to action only after the
      Oracle deployment passes acceptance.

## 8. External Acceptance

- [ ] Open `https://<DOMAIN>/` using a phone on mobile data.
- [ ] Power off the development Windows PC and confirm the public site, health,
      login, and provider status remain available.
- [ ] Google: connect, upload encrypted, list, wrong-password reject, correct
      decrypt and SHA-256 match, delete.
- [ ] Dropbox: connect, upload encrypted, list, wrong-password reject, correct
      decrypt and SHA-256 match, delete.
- [ ] OneDrive: connect, upload encrypted, list, wrong-password reject, correct
      decrypt and SHA-256 match, delete.
- [ ] A second Windows PC signs in to the same Premium account and decrypts a
      file uploaded by Device A using the same Key Password.
- [ ] A different customer cannot access the first customer's links, keys, or
      file records.
- [ ] Restart every Compose service and confirm PostgreSQL accounts, cloud
      links, key metadata, devices, and file indexes persist.
- [ ] Reboot the Oracle VM and confirm Docker's restart policies restore the
      application without the development PC.
- [ ] Record the deployment URL, UTC timestamps, screenshots, hashes, and result
      in the final evidence index.

## Readiness Decision

The project reaches **complete public operation independent of a personal PC**
only when the Oracle VM, DuckDNS, HTTPS, secrets, OAuth callbacks, external
three-provider tests, persistence/reboot test, and powered-off-PC check above
all pass. Source preparation alone is deployment-ready, not live-production
evidence.
