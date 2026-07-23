#!/usr/bin/env bash
# From your laptop: push latest main, SSH to the VM, pull, and redeploy.
# Usage:
#   export DEPLOY_HOST=opc@x.x.x.x
#   export DEPLOY_DIR=~/project
#   bash deploy/remote-deploy.sh
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST, e.g. opc@203.0.113.10}"
DEPLOY_DIR="${DEPLOY_DIR:-~/project}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: working tree is dirty. Commit/push what you need before deploying."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Pushing $BRANCH"
git push -u origin "$BRANCH"

echo "==> Remote pull + deploy on $DEPLOY_HOST:$DEPLOY_DIR"
ssh "$DEPLOY_HOST" "bash -s" <<EOF
set -euo pipefail
cd ${DEPLOY_DIR}
git fetch origin
git checkout ${BRANCH}
git pull --ff-only origin ${BRANCH}
bash deploy/deploy.sh
EOF

echo "Done."
