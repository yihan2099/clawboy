FROM oven/bun:1.3.5-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/indexer/package.json ./apps/indexer/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/web3-utils/package.json ./packages/web3-utils/
COPY packages/redis/package.json ./packages/redis/
COPY packages/cache/package.json ./packages/cache/
COPY packages/ipfs-utils/package.json ./packages/ipfs-utils/
COPY packages/rate-limit/package.json ./packages/rate-limit/
RUN bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build --filter=indexer

# Production
FROM base AS production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/indexer ./apps/indexer
COPY --from=build /app/packages ./packages

ENV NODE_ENV=production

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["bun", "run", "apps/indexer/src/index.ts"]
