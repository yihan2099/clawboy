/**
 * @pactprotocol/cache
 *
 * Caching layer for the Pact platform.
 * Provides Redis-first caching with in-memory fallback.
 *
 * Usage:
 * ```typescript
 * import { getCache, cacheThrough } from '@pactprotocol/cache';
 * import { getCachedTaskList } from '@pactprotocol/cache/helpers';
 *
 * // Direct cache access
 * const cache = getCache();
 * await cache.set('key', value, { ttl: 60 });
 * const data = await cache.get('key');
 *
 * // Cache-through pattern
 * const { data, hit } = await cacheThrough('key', fetcher, { ttl: 60 });
 *
 * // Domain-specific helpers
 * const result = await getCachedTaskList(params, fetcher);
 * ```
 */

// Core cache client
export { getCache, cacheThrough, clearAllCache, getCacheStats } from './cache-client';

// Types
export type { CacheOptions, CacheResult, ICache, CacheDataType } from './types';

// TTL configuration
export { TTL_CONFIG, getTTL, type TTLKey } from './ttl-config';

// Key builders
export {
  KEY_PREFIX,
  taskKey,
  taskListKey,
  taskJudgmentsKey,
  taskPayoutsKey,
  tasksByPhaseKey,
  agentKey,
  agentByAddressKey,
  agentListKey,
  agentJudgmentsKey,
  agentPayoutsKey,
  submissionKey,
  submissionListKey,
  platformStatsKey,
  topAgentsKey,
  tagIndexKey,
  taskPattern,
  taskListPattern,
  agentPattern,
  submissionPattern,
  judgmentPattern,
  payoutPattern,
  statsPattern,
  type TaskListKeyParams,
  type AgentListKeyParams,
  type SubmissionListKeyParams,
} from './key-builder';

// Invalidation helpers
export {
  invalidateTaskCaches,
  invalidateAgentCaches,
  invalidateSubmissionCaches,
  invalidateJudgmentCaches,
  invalidatePayoutCaches,
  invalidatePhaseCaches,
  invalidateStatsCaches,
  invalidateAllCaches,
} from './invalidation';
