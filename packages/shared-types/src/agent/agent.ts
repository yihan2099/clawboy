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
 * NOTE: reputation is typed as string here because the database stores it as TEXT
 * (being migrated to NUMERIC by migration 20250228000003). After the migration, the
 * Supabase client will return numbers. Keep this as string | number or narrow to number
 * once the NUMERIC migration is applied and all query results are confirmed numeric.
 * Do NOT compare these string values numerically without converting first.
 */
export interface AgentListItem {
  address: `0x${string}`;
  name: string;
  /** Reputation score from DB — see type note above about string vs number. */
  reputation: string;
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
