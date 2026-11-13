# ─────────────────────────────────────────────────────────────────────────────
# Rete Mali API — production image
#
#   docker build -t retemali-api .
#   docker run --env-file .env -p 5000:5000 -v retemali_uploads:/app/uploads retemali-api
#
# No database credentials are needed at build time: `prisma generate` reads the
# schema only. Everything environment-specific is injected at run time.
# ─────────────────────────────────────────────────────────────────────────────

# 1. Dependencies (full, needed to compile TypeScript)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2. Compile: prisma generate -> tsc -> tsc-alias (rewrites @/… path aliases)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

# 3. Production dependencies only
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 4. Runtime
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# src/ is kept so `npx prisma db seed` (tsx prisma/seed.ts) works inside the
# container. The running server only ever loads dist/.
COPY --from=build /app/src ./src
COPY package.json ./

# Uploaded files (book covers, QRIS codes, avatars, payment proofs) live here.
# Mount a volume on /app/uploads or they disappear when the container is recreated.
RUN mkdir -p /app/uploads && chown -R node:node /app
VOLUME ["/app/uploads"]

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations are applied by the orchestrator before this starts
# (docker-compose.prod.yml runs `prisma migrate deploy` first).
CMD ["node", "dist/server.js"]
