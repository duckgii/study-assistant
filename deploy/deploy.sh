#!/usr/bin/env bash
# Rebuild and restart on the VM (run from the project root on the server).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and fill in values."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [[ -z "${DOMAIN:-}" ]]; then
  echo "DOMAIN is required in .env"
  exit 1
fi

echo "==> Building and starting (DOMAIN=$DOMAIN)"
docker compose up -d --build --remove-orphans

echo "==> Status"
docker compose ps

echo ""
echo "App should be at: https://${DOMAIN}"
echo "Logs: docker compose logs -f app"
