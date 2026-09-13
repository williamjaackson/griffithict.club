# syntax=docker/dockerfile:1

# Three images out of one file: the site, the one-shot migration runner, and the
# Funnel bot. They share every layer up to `deps`, so the two small ones cost
# almost nothing beyond the site.

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@11.22.0
WORKDIR /app

# ---- dependencies ----------------------------------------------------------
# Manifests first so a source-only change does not re-resolve the whole tree.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/funnel/package.json apps/funnel/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build -----------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @gict/web build

# ---- site ------------------------------------------------------------------
FROM node:${NODE_VERSION} AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone binds to localhost by default, which makes the container unreachable
# from Caddy and produces a 502 with nothing in the logs to explain it.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: 'standalone'` emits the server and its traced dependencies, but copies
# neither public/ nor .next/static. Both are copied explicitly, and the paths are
# nested by workspace because this is a monorepo.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]

# ---- funnel ----------------------------------------------------------------
# The Discord bot. No port and no healthcheck: it holds an outbound websocket to
# Discord and serves nothing, so there is nothing to probe. Compose restarts it
# if the process dies, which is the failure that actually happens.
FROM deps AS funnel
ENV NODE_ENV=production
COPY packages/db packages/db
COPY apps/funnel apps/funnel
WORKDIR /app/apps/funnel
CMD ["pnpm", "exec", "tsx", "src/index.ts"]

# ---- migrations ------------------------------------------------------------
# Runs once before the site starts, then exits. Uses the runtime migrator from
# drizzle-orm, so drizzle-kit never ships to production.
FROM deps AS migrate
ENV NODE_ENV=production
COPY packages/db packages/db
WORKDIR /app/packages/db
CMD ["pnpm", "exec", "tsx", "src/migrate.ts"]
