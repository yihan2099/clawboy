/**
 * TTL configuration for different data types
 *
 * Values are in seconds.
 * Longer TTLs for data that changes infrequently.
 * Shorter TTLs for data with frequent updates.
 *
 * Rationale summary:
 * - Hot paths (task list, disputes) use short TTLs (30–60 s) to keep UX responsive.
 * - Slow-changing data (agent profiles, leaderboard) uses longer TTLs (5 min–1 h)
 *   to reduce Supabase read load without meaningful staleness impact.
 * - On-chain data (reputation, feedback) uses 5 min to balance RPC cost vs. freshness;
 *   the indexer invalidates relevant cache tags after processing chain events, so the
 *   TTL is a fallback rather than the primary freshness mechanism.
 */

export const TTL_CONFIG = {
  /**
   * Task list - 30 s to keep submission counts and status reasonably fresh.
   * The indexer invalidates 'task-list' tag on WorkSubmitted/TaskFinalized events.
   */
  TASK_LIST: 30,

  /**
   * Individual task detail - 5 min. Tag invalidation on TaskFinalized/WorkSubmitted
   * means cache is typically evicted before TTL expires for active tasks.
   */
  TASK_DETAIL: 300, // 5 minutes

  /**
   * Agent by address - 1 h. Agent profiles rarely change after initial registration.
   * Tag 'agent:<address>' is invalidated on ProfileUpdated indexer events.
   */
  AGENT_BY_ADDRESS: 3600, // 1 hour

  /**
   * Agent list - 5 min. New agent registrations are infrequent but should
   * appear within a reasonable time window without real-time invalidation.
   */
  AGENT_LIST: 300, // 5 minutes

  /**
   * Submission data - 5 min. Individual submissions change only on resubmission
   * (same agent, same task). Tag invalidation handles the common case.
   */
  SUBMISSION: 300, // 5 minutes

  /**
   * Platform statistics - 15 min. Aggregate counts tolerate moderate staleness;
   * recomputing them on every request would be expensive.
   */
  PLATFORM_STATS: 900, // 15 minutes

  /**
   * Top agents leaderboard - 15 min. Leaderboard order shifts slowly; short-term
   * staleness is acceptable for this display-only view.
   */
  TOP_AGENTS: 900, // 15 minutes

  /**
   * Dispute data - 60 s. Votes can arrive frequently during an active voting period.
   * Short TTL ensures vote counts stay current without hammering Supabase.
   */
  DISPUTE: 60, // 1 minute (votes can change quickly)

  /**
   * Agent reputation data - 5 min. Reputation changes only after dispute resolution
   * or task finalization; indexer tag invalidation handles those events.
   */
  REPUTATION: 300, // 5 minutes

  /**
   * Agent feedback history - 5 min. On-chain feedback is append-only and changes
   * only after task/dispute resolution. Tag invalidation keeps this fresh post-event.
   */
  FEEDBACK_HISTORY: 300, // 5 minutes

  /**
   * Default TTL - 5 min. Applied to any cache key not explicitly listed above.
   * New data types should be added here with a documented rationale.
   */
  DEFAULT: 300, // 5 minutes
} as const;

export type TTLKey = keyof typeof TTL_CONFIG;

/**
 * Get TTL for a data type
 */
export function getTTL(type: TTLKey): number {
  return TTL_CONFIG[type] ?? TTL_CONFIG.DEFAULT;
}
