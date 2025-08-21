# apps/web/Dockerfile
# Build Next.js (App Router) and ship standalone output.

# ---------- 1) BUILD ----------
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production

# Copy manifests + TS files first for better layer caching
COPY apps/web/package*.json apps/web/tsconfig.json apps/web/next-env.d.ts apps/web/

# Install deps (include devDeps for build; no audit/fund noise in CI)
RUN bash -lc 'cd apps/web && npm install --no-audit --no-fund'

# Copy the rest of the repo
COPY . .

# Build (next.config.mjs should have output:"standalone")
RUN bash -lc 'cd apps/web && npm run build'

# ---------- 2) RUNTIME (distroless) ----------
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy Next standalone server, static assets, public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start the Next standalone server (path emitted by Next)
CMD ["apps/web/server.js"]
