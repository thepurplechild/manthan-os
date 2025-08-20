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

# ---------- 2) RUNTIME ----------
# Use non-distroless for predictable startup & easy debugging
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 8080

# Copy Next standalone bundle
COPY --from=builder /app/apps/web/.next/standalone ./

# Copy static assets to BOTH likely locations (root and nested), so whichever
# server.js we get (root ./server.js OR ./apps/web/server.js) can find them.
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy public to BOTH likely locations as well
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start whichever entry exists (root or nested)
# - If ./server.js exists, use it
# - else fall back to ./apps/web/server.js
CMD [ "bash", "-lc", "if [ -f server.js ]; then exec node server.js; else exec node apps/web/server.js; fi" ]
