# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for readmigo-cn / server-cn (NestJS 11 + TypeORM)
#
# Build context must be the monorepo root so pnpm workspace resolution works:
#   docker build -f server-cn/Dockerfile -t server-cn .
#
# Stages:
#   1. deps    — install ALL workspace deps (leverages layer cache)
#   2. build   — compile TypeScript → dist/
#   3. runtime — minimal production image (no dev deps, no source)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependency installation ─────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Enable pnpm via corepack (version pinned to match packageManager in package.json)
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Copy only the files needed to resolve the workspace graph first.
# This layer is cached until any of these manifests change.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server-cn/package.json ./server-cn/
COPY packages/llm-adapter/package.json ./packages/llm-adapter/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server-cn/node_modules ./server-cn/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/llm-adapter/node_modules ./packages/llm-adapter/node_modules 2>/dev/null || true

# Copy full source (needed by nest build)
COPY . .

# Build llm-adapter first so server-cn can import its compiled output
RUN pnpm --filter @readmigo-cn/llm-adapter build

WORKDIR /app/server-cn
RUN pnpm build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Security: run as a non-root user.
# addgroup/adduser flags are alpine-specific.
RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nestjs -G nodejs

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only.
# We copy manifests + lockfile and run pnpm install --prod to keep the layer
# as small as possible without bundling devDependencies.
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server-cn/package.json ./server-cn/
COPY packages/llm-adapter/package.json ./packages/llm-adapter/

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Copy compiled artefacts from build stage
COPY --from=build /app/server-cn/dist         ./server-cn/dist
COPY --from=build /app/packages/llm-adapter/dist ./packages/llm-adapter/dist

# Transfer ownership to non-root user
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

# Graceful shutdown: NestJS handles SIGTERM to drain in-flight requests.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "server-cn/dist/main.js"]
