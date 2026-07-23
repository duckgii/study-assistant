# syntax=docker/dockerfile:1

# Oracle Always Free ARM (aarch64) and x86 both work with this multi-stage image.
FROM node:22-bookworm-slim AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy env so `next build` can evaluate modules that read process.env.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="file:./build.db" \
    AUTH_SECRET="build-time-placeholder" \
    AUTH_URL="http://localhost:3000"

RUN npm run build \
  && npm prune --omit=dev


FROM node:22-bookworm-slim AS runner

# LibreOffice: PPTX → PDF. Fonts + canvas libs: PDF thumbnails via @napi-rs/canvas.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    gosu \
    libreoffice-impress \
    libreoffice-writer \
    fonts-liberation \
    fonts-noto-cjk \
    fontconfig \
    libatomic1 \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/data/db/prod.db" \
    UPLOADS_DIR=/data/uploads \
    SOFFICE_PATH=soffice

RUN mkdir -p /data/db /data/uploads \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && chown -R nextjs:nodejs /data /app

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Entrypoint runs as root to fix /data volume ownership, then drops to nextjs via gosu.
USER root

EXPOSE 3000

VOLUME ["/data"]

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
