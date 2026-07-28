# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:26-alpine AS deps
# Prisma needs libssl at engine load time.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Builder ----
FROM node:26-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` runs `prisma generate` first (see package.json build script).
# DATABASE_URL is only needed at runtime, not for the build.
ENV NEXT_TELEMETRY_DISABLED=1
# Fast-fail gate: `next build` re-checks types itself (via `experimental.useTypeScriptCli`,
# needed for the TypeScript 7 native compiler), but that's bundled inside the ~15s build.
# Running `tsc --noEmit` here first fails a broken build in ~2s instead.
RUN npm run typecheck
RUN npm run build

# ---- Runner ----
FROM node:26-alpine AS runner
RUN apk add --no-cache openssl
# The production image only runs `node`; npm/npx/corepack are unused here and
# ship their own bundled, periodically-vulnerable dependencies (undici, tar, …).
# Drop them so the container scan stays clean. Prisma is invoked via its local bin.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server + static assets produced by `output: "standalone"`.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Ship the Prisma CLI, schema and config so startup can apply committed migrations.
# Prisma 7 reads the datasource URL from prisma.config.ts (no longer from schema).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# `typescript` is a devDependency needed only for build-time type-checking; its
# per-platform native compiler binary bundles a Go toolchain that trails upstream
# CVE fixes. Prisma's CLI treats `typescript` as an optional peer dep (used only
# to load .ts config/schema files, with its own fallback otherwise), so dropping
# it post-build doesn't affect `prisma migrate deploy`. Keeps the container scan clean.
RUN rm -rf ./node_modules/typescript ./node_modules/@typescript \
  ./node_modules/.bin/tsc ./node_modules/.bin/tsserver

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node server.js"]
