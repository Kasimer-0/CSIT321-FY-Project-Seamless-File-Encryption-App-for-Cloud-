#!/bin/sh
set -eu

rm -rf /srv/* /srv/.[!.]* /srv/..?* 2>/dev/null || true
cp -R /opt/stealthsync-site/. /srv/
touch /srv/.ready
chown -R stealthsync:stealthsync /srv

# Caddy reads the shared, immutable production build from its own container.
exec su-exec stealthsync tail -f /dev/null
