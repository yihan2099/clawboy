import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createWaitlistLimiter } from '@clawboy/rate-limit';

// Get the cached rate limiter from the shared package
const ratelimit = createWaitlistLimiter();

// SECURITY: Whether to trust proxy headers for client IP detection
// Only set this to true if you're behind a trusted reverse proxy (e.g., Vercel, Cloudflare)
const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === 'true';

// SECURITY: Simple IPv4/IPv6 validation pattern
const IP_PATTERN = /^(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[a-fA-F0-9:]+:+)+[a-fA-F0-9]+)$/;

/**
 * SECURITY: Get client IP address with validation
 *
 * WARNING: x-forwarded-for and x-real-ip headers can be spoofed by attackers
 * unless you're behind a trusted reverse proxy that overwrites these headers.
 *
 * In production (Vercel), the x-forwarded-for header is set by the edge network
 * and can be trusted. For other deployments, ensure your proxy is configured
 * to overwrite (not append to) these headers.
 */
function getClientIp(request: NextRequest): string {
  // Only trust proxy headers if explicitly configured
  if (TRUST_PROXY_HEADERS) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwarded) {
      // Take the first IP (client IP when proxy is trusted)
      const clientIp = forwarded.split(',')[0].trim();
      // Validate IP format to prevent injection
      if (IP_PATTERN.test(clientIp)) {
        return clientIp;
      }
    }

    if (realIp) {
      // Validate IP format
      if (IP_PATTERN.test(realIp)) {
        return realIp;
      }
    }
  }

  // Fallback: Return a consistent identifier for unknown IPs
  // This prevents rate limit bypass but may group multiple users
  return 'unknown-client';
}

export async function proxy(request: NextRequest) {
  // Only rate limit POST requests to the waitlist action
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    const ip = getClientIp(request);

    // If rate limiter is not configured, allow the request (fail open)
    if (!ratelimit) {
      return NextResponse.next();
    }

    try {
      const result = await ratelimit.limit(`ip:${ip}`);

      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Too many requests. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toString(),
            },
          }
        );
      }

      // Add rate limit headers to the response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
      return response;
    } catch (error) {
      // Fail open if rate limiter is unavailable
      console.error('Rate limiter error, allowing request:', error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
