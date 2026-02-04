/**
 * Re-export Redis client from foundational @clawboy/redis package
 *
 * This maintains backward compatibility while consolidating Redis
 * connection management in a single package.
 */

export { getRedisClient, isRedisEnabled } from '@clawboy/redis';

/**
 * Check if rate limiting is available (Redis configured)
 * @deprecated Use isRedisEnabled() instead
 */
export function isRateLimitingEnabled(): boolean {
  return getRedisClient() !== null;
}

// Re-import to keep function available
import { getRedisClient } from '@clawboy/redis';
