import type { NextConfig } from 'next';

// SECURITY: Content Security Policy
//
// KNOWN WEAKNESS: 'unsafe-inline' in script-src significantly weakens XSS protection
// because it allows inline <script> tags and event handlers from any origin that can
// inject HTML. The proper fix is to use nonces via Next.js middleware:
//   https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
// With nonces, 'unsafe-inline' can be removed and each server-rendered <script> is
// individually authorized. This is a known limitation of static CSP headers in Next.js.
//
// 'unsafe-inline' for style-src is lower risk (styles cannot exfiltrate data directly).
// 'unsafe-eval' is NOT included here to prevent dynamic code execution.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co https://*.upstash.io wss://*.supabase.co https://vercel.live https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org https://rpc.sepolia.org https://*.base.org https://*.infura.io https://*.alchemy.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
