# Frontend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY ../../pnpm-workspace.yaml ../../package.json ./
COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm && pnpm i --frozen-lockfile || pnpm i
COPY . .
RUN pnpm build
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
