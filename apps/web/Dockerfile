# apps/web/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests from repo root
COPY package.json pnpm-workspace.yaml ./
# Optional: copy lockfile if you committed one
# COPY pnpm-lock.yaml ./

# Copy the app and any shared packages
COPY apps ./apps
COPY packages ./packages

# Install and build
RUN npm i -g pnpm && pnpm i --frozen-lockfile || pnpm i
WORKDIR /app/apps/web
RUN pnpm build

ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
