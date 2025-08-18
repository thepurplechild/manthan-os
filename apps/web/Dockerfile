# infra/Dockerfile.frontend

# 1) Install deps at the monorepo root (pnpm workspaces)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# 2) Build the Next.js app in standalone mode
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
# bring deps
COPY --from=deps /app /app
# copy the whole repo (sources)
COPY . .
# build ONLY the web app (monorepo-safe)
RUN pnpm -w build --filter ./apps/web

# --- guard: prove Next created standalone output and entrypoint ---
RUN set -eux; \
  ls -la apps/web/.next || (echo '❌ Next build did not create .next' && exit 1); \
  ls -la apps/web/.next/standalone || (echo '❌ .next/standalone missing. Ensure next.config.mjs has output:"standalone" and the build logs show Route (app) lines.' && exit 1); \
  test -f apps/web/.next/standalone/apps/web/server.js || (echo '❌ Entry missing: apps/web/.next/standalone/apps/web/server.js' && exit 1)

# 3) Minimal runtime (distroless)
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy standalone server, static, public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start Next standalone server (monorepo path preserved inside standalone)
CMD ["apps/web/server.js"]
