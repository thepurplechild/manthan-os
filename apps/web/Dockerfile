# apps/web/Dockerfile
# Build Next.js (App Router) and ship standalone output.

# ---------- 1) BUILD ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production

# (Optional) backend base URL baked at build time (override via Cloud Build arg)
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# Copy manifests first for better cache
COPY apps/web/package*.json apps/web/
# TypeScript shims (commit these to repo; if missing, add them per earlier instructions)
COPY apps/web/tsconfig.json apps/web/next-env.d.ts apps/web/ 2>/dev/null || true

# Install deps for the web app (include devDeps for typecheck/build)
# IMPORTANT: ignore lifecycle scripts to prevent postinstall from running in CI
RUN bash -lc 'cd apps/web && npm install --no-audit --no-fund --ignore-scripts'

# Copy the rest of the repo (sources, components, app dir)
COPY . .

# Build (next.config.mjs should have output: "standalone")
RUN bash -lc 'cd apps/web && npm run build'

# If Next placed server.js at the root of standalone, mirror it to apps/web/server.js
# so our distroless CMD stays stable.
RUN bash -lc '\
  if [ -f /app/apps/web/.next/standalone/server.js ] && [ ! -f /app/apps/web/.next/standalone/apps/web/server.js ]; then \
    mkdir -p /app/apps/web/.next/standalone/apps/web && \
    cp /app/apps/web/.next/standalone/server.js /app/apps/web/.next/standalone/apps/web/server.js; \
  fi'

# ---------- 2) RUNTIME (distroless) ----------
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy Next standalone server, static, public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start Next standalone server (stable path)
CMD ["apps/web/server.js"]
