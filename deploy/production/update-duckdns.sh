#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="${STEALTHSYNC_ENV_FILE:-${SCRIPT_DIR}/.env.production}"

read_env_value() {
  sed -n "s/^$1=//p" "${ENV_FILE}" | tail -n 1 | tr -d '\r'
}

if [ -f "${ENV_FILE}" ]; then
  DUCKDNS_SUBDOMAIN="${DUCKDNS_SUBDOMAIN:-$(read_env_value DUCKDNS_SUBDOMAIN)}"
  DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-$(read_env_value DUCKDNS_TOKEN)}"
fi

: "${DUCKDNS_SUBDOMAIN:?Set DUCKDNS_SUBDOMAIN without .duckdns.org}"
: "${DUCKDNS_TOKEN:?Set DUCKDNS_TOKEN in the VM-only environment file}"

response="$(curl --fail --silent --show-error --get \
  --data-urlencode "domains=${DUCKDNS_SUBDOMAIN}" \
  --data-urlencode "token=${DUCKDNS_TOKEN}" \
  --data-urlencode "ip=" \
  "https://www.duckdns.org/update")"

if [ "${response}" != "OK" ]; then
  echo "DuckDNS did not accept the IP update." >&2
  exit 1
fi

echo "DuckDNS address updated successfully."
