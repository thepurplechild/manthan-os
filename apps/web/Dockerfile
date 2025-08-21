# apps/web/Dockerfile
# Build Next.js (App Router) and ship standalone output.

# ---------- 1) BUILD ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production

# (Optional) public runtime config from Cloud Build
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# Copy manifests + TS plumbing first for better cache
COPY apps/web/package*.json apps/web/
# If you have these files, keep them in the cache-friendly layer
COPY apps/web/tsconfig.json apps/web/next-env.d.ts apps/web/ 2>/dev/null || true

# Install deps for the web app (devDeps needed for typecheck/build)
RUN bash -lc 'cd apps/web && npm install --no-audit --no-fund'

# Copy the rest of the monorepo (so Next sees sources)
COPY . .

# Build (next.config.mjs must have: output: "standalone")
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

