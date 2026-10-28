# syntax=docker/dockerfile:1.7
# myvisa website (Next.js standalone). Build from the repository root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg API_URL=https://api.myvisa.sa --build-arg NEXT_PUBLIC_SITE_URL=https://myvisa.sa \
#     --build-arg UPLOAD_ORIGIN=https://<bucket-endpoint> -t myvisa-web .
# API_URL, the site URL and the upload origin are baked in at build time (rewrites, canonical URLs, CSP).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG API_URL=http://api:4100
ARG NEXT_PUBLIC_SITE_URL=https://myvisa.sa
ARG UPLOAD_ORIGIN
ENV API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL UPLOAD_ORIGIN=$UPLOAD_ORIGIN NEXT_OUTPUT_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm install --frozen-lockfile --filter "@myvisa/web..."
RUN pnpm --filter @myvisa/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
# Runtime secrets: JWT_ACCESS_SECRET (same as the API), REVALIDATE_SECRET.
CMD ["node", "apps/web/server.js"]
