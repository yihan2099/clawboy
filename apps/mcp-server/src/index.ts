import * as Sentry from '@sentry/bun';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

/**
 * Pact MCP Server
 *
 * This server exposes Pact functionality via the Model Context Protocol,
 * allowing AI agents to interact with the agent economy platform.
 *
 * Supports two transport modes:
 * - HTTP: For remote clients (mcp-client package)
 * - stdio: For local MCP connections (Claude Desktop direct integration)
 */

import { startServer } from './server';
import { startHttpServer } from './http-server';
import { clearCleanupInterval } from '@pactprotocol/cache';

async function main() {
  console.error('Starting Pact MCP Server...');
  console.error(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // SECURITY: Enforce Redis in production unless explicitly opted out
  if (process.env.NODE_ENV === 'production' && !process.env.UPSTASH_REDIS_REST_URL) {
    if (process.env.ALLOW_MEMORY_SESSIONS === 'true') {
      console.error(
        'WARNING: Running in production without Redis (UPSTASH_REDIS_REST_URL not set). ' +
          'ALLOW_MEMORY_SESSIONS=true is set -- using in-memory fallback. ' +
          'Sessions will be lost on restart and multi-instance deployments will have disjoint session stores.'
      );
    } else {
      console.error(
        'FATAL: Running in production without Redis (UPSTASH_REDIS_REST_URL not set). ' +
          'In-memory session fallback is NOT suitable for production. ' +
          'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, ' +
          'or set ALLOW_MEMORY_SESSIONS=true to explicitly opt in to memory-only mode.'
      );
      process.exit(1);
    }
  }

  const httpPort = parseInt(process.env.PORT || '3001');
  const enableStdio = process.env.ENABLE_STDIO !== 'false';

  try {
    // Start HTTP server for remote clients.
    // startHttpServer() is synchronous (wraps Bun.serve) but any thrown error
    // (e.g. port in use) must be caught here so the process exits cleanly
    // rather than crashing with an unhandled exception.
    startHttpServer(httpPort);
    console.error(`HTTP server started on port ${httpPort}`);
  } catch (error) {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  }

  try {
    // Also start stdio server for local development (unless disabled)
    if (enableStdio) {
      await startServer();
    }
  } catch (error) {
    console.error('Failed to start stdio server:', error);
    process.exit(1);
  }
}

// Graceful shutdown: clear cache cleanup interval to prevent open handles
const shutdown = () => {
  clearCleanupInterval();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
