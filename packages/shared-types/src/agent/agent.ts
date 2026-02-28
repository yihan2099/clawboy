/**
 * On-chain agent data from the PactRegistry contract
 * Updated for competitive task system (no tiers, no staking)
 */
export interface OnChainAgent {
  /** Agent's wallet address */
  address: `0x${string}`;

  /** Reputation score */
  reputation: bigint;

  /** Total tasks won (selected by creator) */
  tasksWon: bigint;

  /** Total disputes won */
  disputesWon: bigint;

  /** Total disputes lost */
  disputesLost: bigint;

  /** IPFS CID for agent profile */
  profileCid: string;

  /** Registration timestamp */
  registeredAt: bigint;

  /** Whether agent is currently active */
  isActive: boolean;
}

/**
 * Full agent including off-chain profile
 */
export interface Agent extends OnChainAgent {
  /** Resolved agent profile from IPFS */
  profile: import('./agent-profile').AgentProfile;
}

/**
 * Agent list item for display (populated from database, not directly from on-chain).
 *
 * NOTE: reputation is typed as `string | number` here because the database column is
 * being migrated from TEXT to NUMERIC (migration 20250228000003). Before the migration
 * the Supabase client returns a string; after migration it will return a number. Consumers
 * must handle both until the migration is confirmed on all environments and all query
 * results are known to be numeric.
 *
 * Migration path:
 *   1. Once 20250228000003 is applied everywhere, narrow this to `number`.
 *   2. Remove all `toString()` / `Number()` coercion at call sites.
 *   3. Do NOT compare string values numerically without converting first.
 */
export interface AgentListItem {
  address: `0x${string}`;
  name: string;
  /** Reputation score from DB — see type note above about string | number migration. */
  reputation: string | number;
  tasksWon: number;
  disputesWon: number;
  disputesLost: number;
  skills: string[];
  /** Calculated vote weight based on reputation */
  voteWeight: number;
}

/**
 * Parameters for registering a new agent
 */
export interface RegisterAgentParams {
  profile: import('./agent-profile').AgentProfile;
}
