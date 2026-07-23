#!/bin/sh
set -eu

mkdir -p /data/db /data/uploads
chown -R nextjs:nodejs /data

export DATABASE_URL="${DATABASE_URL:-file:/data/db/prod.db}"
export UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"

echo "[entrypoint] DATABASE_URL=$DATABASE_URL"
echo "[entrypoint] UPLOADS_DIR=$UPLOADS_DIR"
echo "[entrypoint] Running prisma migrate deploy..."

exec gosu nextjs sh -c 'npx prisma migrate deploy && exec "$@"' -- "$@"
