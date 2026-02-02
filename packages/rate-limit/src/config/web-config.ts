/**
 * Rate limit configuration for the web app
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '../client';

export const WEB_RATE_LIMITS = {
  waitlist: {
    limit: 5,
    window: '1 h' as const,
    prefix: 'web:waitlist',
  },
} as const;

/**
 * Cached waitlist limiter instance
 */
let waitlistLimiter: Ratelimit | null = null;
let limiterInitialized = false;

/**
 * Create or get a cached rate limiter for the waitlist endpoint
 *
 * Returns null if Redis is not configured (fail open)
 */
export function createWaitlistLimiter(): Ratelimit | null {
  // Return cached instance if already initialized
  if (limiterInitialized) {
    return waitlistLimiter;
  }

  const redis = getRedisClient();
  if (!redis) {
    limiterInitialized = true;
    return null;
  }

  waitlistLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      WEB_RATE_LIMITS.waitlist.limit,
      WEB_RATE_LIMITS.waitlist.window
    ),
    prefix: WEB_RATE_LIMITS.waitlist.prefix,
    analytics: true,
  });

  limiterInitialized = true;
  return waitlistLimiter;
}
