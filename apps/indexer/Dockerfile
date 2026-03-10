FROM oven/bun:1.3.10-alpine AS base
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
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY packages/mcp-client/package.json ./packages/mcp-client/
COPY packages/pact-skill/package.json ./packages/pact-skill/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY apps/web/package.json ./apps/web/
COPY apps/contracts/package.json ./apps/contracts/
RUN bun install

# Production
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["bun", "run", "apps/indexer/src/index.ts"]
