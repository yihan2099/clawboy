import { describe, test, expect } from 'bun:test';
import { WEB_RATE_LIMITS, createWaitlistLimiter } from '../config/web-config';

describe('Web Config', () => {
  describe('WEB_RATE_LIMITS', () => {
    test('waitlist limit is 5 per hour', () => {
      expect(WEB_RATE_LIMITS.waitlist.limit).toBe(5);
      expect(WEB_RATE_LIMITS.waitlist.window).toBe('1 h');
      expect(WEB_RATE_LIMITS.waitlist.prefix).toBe('web:waitlist');
    });
  });

  describe('createWaitlistLimiter', () => {
    test('returns same instance on subsequent calls (caching)', () => {
      const limiter1 = createWaitlistLimiter();
      const limiter2 = createWaitlistLimiter();

      // Both should be the same reference (cached) or both null (no Redis)
      expect(limiter1).toBe(limiter2);
    });

    test('returns Ratelimit instance or null', () => {
      const limiter = createWaitlistLimiter();

      // Should be null if Redis not configured, or a Ratelimit instance
      if (limiter !== null) {
        expect(typeof limiter.limit).toBe('function');
      }
    });
  });
});
