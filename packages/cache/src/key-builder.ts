/**
 * Cache key builder utilities
 *
 * Provides consistent key generation and pattern matching
 * for all cached data types.
 */

/**
 * Key prefixes for different data types
 */
export const KEY_PREFIX = {
  TASK: 'task:',
  TASK_LIST: 'tasks:',
  AGENT: 'agent:',
  AGENT_BY_ADDR: 'agent:addr:',
  AGENT_LIST: 'agents:',
  SUBMISSION: 'submission:',
  SUBMISSION_LIST: 'submissions:',
  JUDGMENT: 'judgment:',
  JUDGMENT_LIST: 'judgments:',
  PAYOUT: 'payout:',
  PAYOUT_LIST: 'payouts:',
  STATS: 'stats:',
  TAG_INDEX: 'tag:',
} as const;

/**
 * Task list filter parameters for key generation
 */
export interface TaskListKeyParams {
  phase?: string;
  creatorAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Generate a cache key for a task list query
 */
export function taskListKey(params: TaskListKeyParams = {}): string {
  const parts: string[] = [KEY_PREFIX.TASK_LIST];

  if (params.phase) parts.push(`p:${params.phase}`);
  if (params.creatorAddress) parts.push(`c:${params.creatorAddress.toLowerCase()}`);
  if (params.limit) parts.push(`l:${params.limit}`);
  if (params.offset) parts.push(`o:${params.offset}`);
  if (params.sortBy) parts.push(`sb:${params.sortBy}`);
  if (params.sortOrder) parts.push(`so:${params.sortOrder}`);

  return parts.join('');
}

/**
 * Generate a cache key for a single task
 */
export function taskKey(taskId: string): string {
  return `${KEY_PREFIX.TASK}${taskId}`;
}

/**
 * Generate a cache key for task judgments
 */
export function taskJudgmentsKey(taskId: string): string {
  return `${KEY_PREFIX.TASK}${taskId}:judgments`;
}

/**
 * Generate a cache key for task payouts
 */
export function taskPayoutsKey(taskId: string): string {
  return `${KEY_PREFIX.TASK}${taskId}:payouts`;
}

/**
 * Generate a cache key for an agent by address
 */
export function agentByAddressKey(address: string): string {
  return `${KEY_PREFIX.AGENT_BY_ADDR}${address.toLowerCase()}`;
}

/**
 * Generate a cache key for an agent by ID
 */
export function agentKey(agentId: string): string {
  return `${KEY_PREFIX.AGENT}${agentId}`;
}

/**
 * Generate a cache key for agent judgments
 */
export function agentJudgmentsKey(address: string): string {
  return `${KEY_PREFIX.AGENT}${address.toLowerCase()}:judgments`;
}

/**
 * Generate a cache key for agent payouts
 */
export function agentPayoutsKey(address: string): string {
  return `${KEY_PREFIX.AGENT}${address.toLowerCase()}:payouts`;
}

/**
 * Agent list filter parameters for key generation
 */
export interface AgentListKeyParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Generate a cache key for an agent list query
 */
export function agentListKey(params: AgentListKeyParams = {}): string {
  const parts: string[] = [KEY_PREFIX.AGENT_LIST];

  if (params.limit) parts.push(`l:${params.limit}`);
  if (params.offset) parts.push(`o:${params.offset}`);
  if (params.sortBy) parts.push(`sb:${params.sortBy}`);
  if (params.sortOrder) parts.push(`so:${params.sortOrder}`);

  return parts.join('');
}

/**
 * Submission list filter parameters for key generation
 */
export interface SubmissionListKeyParams {
  taskId?: string;
  agentAddress?: string;
  limit?: number;
  offset?: number;
}

/**
 * Generate a cache key for a submission list query
 */
export function submissionListKey(params: SubmissionListKeyParams = {}): string {
  const parts: string[] = [KEY_PREFIX.SUBMISSION_LIST];

  if (params.taskId) parts.push(`t:${params.taskId}`);
  if (params.agentAddress) parts.push(`a:${params.agentAddress.toLowerCase()}`);
  if (params.limit) parts.push(`l:${params.limit}`);
  if (params.offset) parts.push(`o:${params.offset}`);

  return parts.join('');
}

/**
 * Generate a cache key for a single submission
 */
export function submissionKey(taskId: string, agentAddress: string): string {
  return `${KEY_PREFIX.SUBMISSION}${taskId}:${agentAddress.toLowerCase()}`;
}

/**
 * Generate a cache key for platform statistics
 */
export function platformStatsKey(): string {
  return `${KEY_PREFIX.STATS}platform`;
}

/**
 * Generate a cache key for top agents leaderboard
 */
export function topAgentsKey(limit: number = 10): string {
  return `${KEY_PREFIX.STATS}top_agents:${limit}`;
}

/**
 * Generate a cache key for tasks by phase
 */
export function tasksByPhaseKey(phase: string): string {
  return `${KEY_PREFIX.TASK_LIST}phase:${phase}`;
}

/**
 * Generate a tag index key
 */
export function tagIndexKey(tag: string): string {
  return `${KEY_PREFIX.TAG_INDEX}${tag}`;
}

/**
 * Pattern for matching all task-related keys
 */
export function taskPattern(): string {
  return `${KEY_PREFIX.TASK}*`;
}

/**
 * Pattern for matching all task list keys
 */
export function taskListPattern(): string {
  return `${KEY_PREFIX.TASK_LIST}*`;
}

/**
 * Pattern for matching all agent-related keys
 */
export function agentPattern(): string {
  return `${KEY_PREFIX.AGENT}*`;
}

/**
 * Pattern for matching all submission-related keys
 */
export function submissionPattern(): string {
  return `${KEY_PREFIX.SUBMISSION}*`;
}

/**
 * Pattern for matching all judgment-related keys
 */
export function judgmentPattern(): string {
  return `${KEY_PREFIX.JUDGMENT}*`;
}

/**
 * Pattern for matching all payout-related keys
 */
export function payoutPattern(): string {
  return `${KEY_PREFIX.PAYOUT}*`;
}

/**
 * Pattern for matching all statistics keys
 */
export function statsPattern(): string {
  return `${KEY_PREFIX.STATS}*`;
}
