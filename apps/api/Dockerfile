# syntax=docker/dockerfile:1.7
# myvisa API. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t myvisa-api .
# Migrations ship in the same image — run before each release (same env as the API):
#   docker run --env-file .env myvisa-api sh -c "cd db && node_modules/.bin/prisma migrate deploy"
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
# Only the API and its workspace packages (the website's dependencies stay out of this image).
RUN pnpm install --frozen-lockfile --filter "@myvisa/api..."
RUN pnpm --filter @myvisa/api build
# Self-contained copies: the API with production dependencies, and the db package with the Prisma CLI.
RUN pnpm --filter @myvisa/api deploy --prod /out && pnpm --filter @myvisa/db deploy /db

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --from=build --chown=node:node /db ./db
USER node
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:${API_PORT:-4100}/health/live || exit 1
CMD ["node", "--enable-source-maps", "dist/main.js"]
