#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${STEALTHSYNC_ENV_FILE:-${SCRIPT_DIR}/.env.production}"
EXPECTED_COMMIT="${1:-}"

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "${ENV_FILE}" | tail -n 1 | tr -d '\r'
}

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example and add VM-only values." >&2
  exit 1
fi

cd "${REPOSITORY_ROOT}"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Tracked files are modified on the VM. Refusing to overwrite operator changes." >&2
  exit 1
fi

git fetch --quiet origin main
git switch --quiet main

TARGET_COMMIT="origin/main"
if [[ -n "${EXPECTED_COMMIT}" ]]; then
  if ! git cat-file -e "${EXPECTED_COMMIT}^{commit}" 2>/dev/null; then
    echo "The requested commit is not available on the VM." >&2
    exit 1
  fi
  if ! git merge-base --is-ancestor "${EXPECTED_COMMIT}" origin/main; then
    echo "The requested commit is not part of the current origin/main history." >&2
    exit 1
  fi
  TARGET_COMMIT="${EXPECTED_COMMIT}"
fi

if ! git merge-base --is-ancestor HEAD "${TARGET_COMMIT}"; then
  echo "The VM branch is ahead of or divergent from the requested commit." >&2
  exit 1
fi

git merge --ff-only --quiet "${TARGET_COMMIT}"

if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "${TARGET_COMMIT}")" ]]; then
  echo "The VM did not reach the requested main-branch commit." >&2
  exit 1
fi

compose config --quiet
compose up -d --build --remove-orphans

PUBLIC_DOMAIN="$(read_env_value PUBLIC_DOMAIN)"
if [[ ! "${PUBLIC_DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "PUBLIC_DOMAIN must contain only a hostname, without protocol or path." >&2
  exit 1
fi

for attempt in {1..36}; do
  if curl --fail --silent --show-error --max-time 10 \
      "https://${PUBLIC_DOMAIN}/actuator/health" >/dev/null; then
    echo "StealthSync production is healthy at https://${PUBLIC_DOMAIN}/"
    compose ps
    exit 0
  fi
  sleep 10
done

echo "Deployment completed, but the public health endpoint did not become ready." >&2
compose ps >&2
exit 1
