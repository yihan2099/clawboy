import { isIP } from 'net';
import { z } from 'zod';

// Block private IP ranges and localhost for SSRF protection
// IPv4 private ranges per RFC 1918 + RFC 3927 (link-local)
const BLOCKED_IPV4_PREFIXES = [
  '127.', // loopback
  '10.', // private class A
  '172.16.', // private class B (172.16.0.0/12)
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.', // private class C
  '169.254.', // link-local
  '0.0.0.0', // any-address
  '100.64.', // CGNAT (RFC 6598)
];

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0']);

/**
 * Check if an IPv6 address is private/loopback/link-local.
 * Covers: loopback (::1), link-local (fe80::/10), unique-local (fc00::/7),
 * and the IPv4-mapped ranges (::ffff:127.0.0.1, etc.).
 */
function isPrivateIpv6(addr: string): boolean {
  const lower = addr.toLowerCase().replace(/^\[|\]$/g, ''); // strip brackets
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fe80:')) return true; // link-local fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — check the embedded IPv4 part
    const ipv4Part = lower.slice(7);
    return BLOCKED_IPV4_PREFIXES.some((prefix) => ipv4Part.startsWith(prefix));
  }
  return false;
}

/**
 * Check if a URL points to a blocked/private address (SSRF protection).
 * Handles both IPv4 and IPv6 addresses including bracket notation.
 */
export function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return true;
    }

    const hostname = url.hostname.toLowerCase();

    // Block known hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return true;
    }

    // Detect and validate IPv6 addresses (hostname is bracketed: [::1])
    const ipv6Match = hostname.match(/^\[(.+)\]$/);
    if (ipv6Match) {
      const ipv6Addr = ipv6Match[1]!;
      if (isIP(ipv6Addr) !== 6) return true; // invalid IPv6
      if (isPrivateIpv6(ipv6Addr)) return true;
      return false;
    }

    // Check if hostname is a raw IPv6 address (should be bracketed in URLs, but handle defensively)
    if (isIP(hostname) === 6) {
      if (isPrivateIpv6(hostname)) return true;
      return false;
    }

    // Check IPv4 private ranges
    if (isIP(hostname) === 4) {
      for (const prefix of BLOCKED_IPV4_PREFIXES) {
        if (hostname.startsWith(prefix)) return true;
      }
      return false;
    }

    // Regular hostname — check for private IP prefix patterns
    // (handles cases where hostname resolves to private IP; prefix-check is best-effort)
    for (const prefix of BLOCKED_IPV4_PREFIXES) {
      if (hostname.startsWith(prefix)) return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Zod schema for validating webhook URLs with SSRF protection
 */
export const webhookUrlSchema = z
  .string()
  .max(2048, 'Webhook URL too long')
  .url('Invalid webhook URL')
  .refine((url) => !isBlockedUrl(url), {
    message: 'Webhook URL must be HTTPS and not a private address',
  });
