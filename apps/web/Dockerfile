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

ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]

