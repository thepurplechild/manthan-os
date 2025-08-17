# apps/web/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
# COPY pnpm-lock.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN npm i -g pnpm && pnpm i --frozen-lockfile || pnpm i

WORKDIR /app/apps/web
RUN pnpm build

# Do NOT set ENV PORT here; Cloud Run provides it
# Do NOT EXPOSE a fixed port; not required for Cloud Run

CMD ["sh", "-c", "pnpm start"]


