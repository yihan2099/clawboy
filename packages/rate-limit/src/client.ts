/**
 * Upstash Redis client singleton for rate limiting
 *
 * Uses environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

/**
 * Get the Upstash Redis client singleton
 *
 * Returns null if environment variables are not configured,
 * allowing services to fail open when rate limiting is unavailable.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      'Rate limiting disabled: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured'
    );
    return null;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

/**
 * Check if rate limiting is available (Redis configured)
 */
export function isRateLimitingEnabled(): boolean {
  return getRedisClient() !== null;
}
