# apps/web/Dockerfile
# Build Next.js (App Router) and ship standalone output.

# ---------- 1) BUILD ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production

# Optional: bake backend base at build time (we still prefer runtime via /api/app-config)
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# Copy manifests first for cache
COPY apps/web/package*.json apps/web/

# Install deps without running lifecycle scripts
RUN bash -lc 'cd apps/web && npm install --no-audit --no-fund --ignore-scripts'

# Copy the rest of the repo
COPY . .

# Build Next.js (next.config.mjs must have output: "standalone")
RUN bash -lc 'cd apps/web && npm run build'

# If Next wrote server.js at standalone root, mirror it to apps/web/server.js
RUN bash -lc '\
  if [ -f /app/apps/web/.next/standalone/server.js ] && [ ! -f /app/apps/web/.next/standalone/apps/web/server.js ]; then \
    mkdir -p /app/apps/web/.next/standalone/apps/web && \
    cp /app/apps/web/.next/standalone/server.js /app/apps/web/.next/standalone/apps/web/server.js; \
  fi'

# ---------- 2) RUNTIME ----------
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy standalone server + static + public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start Next standalone server
CMD ["apps/web/server.js"]

