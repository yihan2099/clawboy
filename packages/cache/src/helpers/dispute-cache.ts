/**
 * Dispute caching helpers
 */

import { cacheThrough } from '../cache-client';
import { disputeKey, disputeListKey, type DisputeListKeyParams } from '../key-builder';
import { TTL_CONFIG } from '../ttl-config';
import type { CacheOptions, CacheResult } from '../types';

export interface DisputeListData<T> {
  disputes: T[];
  total: number;
  readyForResolutionCount: number;
}

export async function getCachedDispute<T>(
  disputeId: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<CacheResult<T>> {
  const key = disputeKey(disputeId);
  return cacheThrough(key, fetcher, {
    ttl: TTL_CONFIG.DISPUTE,
    tags: ['dispute', `dispute:${disputeId}`],
    ...options,
  });
}

export async function getCachedDisputeList<T>(
  params: DisputeListKeyParams,
  fetcher: () => Promise<DisputeListData<T>>,
  options: CacheOptions = {}
): Promise<CacheResult<DisputeListData<T>>> {
  const key = disputeListKey(params);
  return cacheThrough(key, fetcher, {
    ttl: TTL_CONFIG.DISPUTE,
    tags: ['dispute_list'],
    ...options,
  });
}
