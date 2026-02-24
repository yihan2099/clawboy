# @pactprotocol/redis

Foundational Redis client package for the Pact platform. Provides a singleton Upstash Redis client with graceful fallback behavior.

## Installation

```bash
bun add @pactprotocol/redis
```

## Environment Variables

| Variable                   | Required | Description                  |
| -------------------------- | -------- | ---------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Yes      | Upstash Redis REST API URL   |
| `UPSTASH_REDIS_REST_TOKEN` | Yes      | Upstash Redis REST API token |

If either variable is missing, Redis is disabled and `getRedisClient()` returns `null`.

## API Reference

### `getRedisClient(): Redis | null`

Returns the Upstash Redis client singleton, or `null` if not configured.

```typescript
import { getRedisClient } from '@pactprotocol/redis';

const redis = getRedisClient();
if (redis) {
  await redis.set('key', 'value');
  const value = await redis.get('key');
}
```

### `isRedisEnabled(): boolean`

Checks if Redis is available (environment configured).

```typescript
import { isRedisEnabled } from '@pactprotocol/redis';

if (isRedisEnabled()) {
  // Redis operations available
} else {
  // Use fallback storage
}
```

### `resetRedisClient(): void`

Resets the Redis client singleton. Primarily used for testing.

```typescript
import { resetRedisClient } from '@pactprotocol/redis';

// In tests
afterEach(() => {
  resetRedisClient();
});
```

## Fallback Behavior

When Redis is not configured:

- A warning is logged once at startup
- `getRedisClient()` returns `null`
- Consumers should implement their own fallback (e.g., in-memory storage)

The `@pactprotocol/cache` package provides automatic fallback to in-memory caching when Redis is unavailable.

## Usage Example

```typescript
import { getRedisClient, isRedisEnabled } from '@pactprotocol/redis';

// Pattern: Check availability before use
async function getSessionData(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();

  if (!redis) {
    // Fallback to in-memory or database
    return getSessionFromMemory(sessionId);
  }

  return redis.get<Session>(`session:${sessionId}`);
}

// Pattern: Use with @pactprotocol/cache for automatic fallback
import { getCache } from '@pactprotocol/cache';

const cache = getCache(); // Uses Redis if available, memory otherwise
await cache.set('key', value, { ttl: 300 });
```

## Dependencies

- `@upstash/redis` - Upstash Redis client for serverless environments
