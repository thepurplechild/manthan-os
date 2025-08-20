# ---------- 1) BUILD ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Optional: backend URL baked at build time (passed from Cloud Build)
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

# Install web workspace deps without running postinstall scripts
COPY apps/web/package*.json apps/web/
RUN bash -lc 'cd apps/web && if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi'

# Bring in the rest of the repo and build
COPY . .
ENV NODE_ENV=production
RUN bash -lc 'cd apps/web && npm run build'

# Guard: ensure Next produced the standalone entry we plan to run
RUN test -f /app/apps/web/.next/standalone/apps/web/server.js || (echo "❌ Missing apps/web/server.js in standalone output" && ls -la /app/apps/web/.next/standalone/apps/web && exit 1)

# ---------- 2) RUNTIME ----------
# Use non-distroless Node for predictable startup and easier debugging
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Ensure Next binds to all interfaces on Cloud Run
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 8080

# Copy standalone server + assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start Next's standalone server explicitly with node
CMD ["node", "apps/web/server.js"]
