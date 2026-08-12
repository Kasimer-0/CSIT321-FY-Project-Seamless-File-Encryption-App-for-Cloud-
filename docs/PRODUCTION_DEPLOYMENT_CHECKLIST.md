# Production Deployment And Acceptance Checklist

The primary checklist now lives at:

[`deploy/production/HUMAN_SETUP_CHECKLIST.md`](../deploy/production/HUMAN_SETUP_CHECKLIST.md)

It covers Oracle Always Free provisioning, OCI and UFW ports, DuckDNS, Caddy
HTTPS, VM-only secrets, all three OAuth consoles, GitHub Actions SSH secrets,
GitHub Pages, external three-provider testing, Premium multi-device testing,
container restart persistence, VM reboot recovery, and the powered-off-PC test.

Do not mark production complete until every real external item in that checklist
has evidence. Local Compose validation or a successful image build does not
prove one-month public availability.
