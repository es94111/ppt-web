# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:26-bookworm-slim AS deps
# Prisma needs libssl at engine load time.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Builder ----
FROM node:26-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
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
# 基底用 Debian（glibc）而非 Alpine：Alpine 的 LibreOffice（musl 建置）啟動即崩潰
# （terminate called after throwing ... RuntimeException），Debian 套件可正常 headless 轉檔。
FROM node:26-bookworm-slim AS runner
# PPTX 轉檔需要 LibreOffice headless（soffice）與 poppler-utils（pdftoppm），
# 並安裝 Noto CJK 中文字型避免簡報文字渲染成方塊。見 lib/pptx.ts 與開發文件 §4.3 / §9.6。
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl libreoffice-impress poppler-utils fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*
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
  && adduser --system --uid 1001 nextjs \
  # 確保非 root 使用者有可寫的 HOME（LibreOffice 首次執行需建立設定檔）
  && mkdir -p /home/nextjs \
  && chown nextjs:nodejs /home/nextjs

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
