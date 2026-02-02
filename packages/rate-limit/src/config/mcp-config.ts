/**
 * Rate limit configuration for the MCP server
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '../client';

/**
 * Operation types for rate limiting
 */
export type OperationType = 'global' | 'read' | 'write' | 'auth';

/**
 * Rate limit configuration for each operation type
 */
export const MCP_RATE_LIMITS = {
  global: {
    limit: 100,
    window: '1 m' as const,
    prefix: 'mcp:global',
  },
  read: {
    limit: 100,
    window: '1 m' as const,
    prefix: 'mcp:read',
  },
  write: {
    limit: 10,
    window: '1 m' as const,
    prefix: 'mcp:write',
  },
  auth: {
    limit: 20,
    window: '1 m' as const,
    prefix: 'mcp:auth',
  },
} as const;

/**
 * Map of tool names to their operation type
 */
export const TOOL_OPERATION_MAP: Record<string, OperationType> = {
  // Auth tools
  auth_get_challenge: 'auth',
  auth_verify: 'auth',
  auth_session: 'auth',

  // Read tools
  list_tasks: 'read',
  get_task: 'read',
  get_my_submissions: 'read',

  // Write tools
  create_task: 'write',
  cancel_task: 'write',
  submit_work: 'write',
};

/**
 * Get the operation type for a tool
 */
export function getOperationType(toolName: string): OperationType {
  return TOOL_OPERATION_MAP[toolName] || 'read';
}

/**
 * Rate limiter cache to avoid recreating on every request
 */
const limiterCache = new Map<string, Ratelimit>();

/**
 * Create or get a cached rate limiter for an operation type
 */
export function getMcpLimiter(operationType: OperationType): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const cacheKey = operationType;
  const cached = limiterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const config = MCP_RATE_LIMITS[operationType];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: config.prefix,
    analytics: true,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Create or get a cached global rate limiter
 */
export function getGlobalLimiter(): Ratelimit | null {
  return getMcpLimiter('global');
}
