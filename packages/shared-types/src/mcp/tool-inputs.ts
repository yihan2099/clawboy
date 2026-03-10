/**
 * MCP tool input types
 * These define the parameters for each MCP tool
 * V2: Phase-based lifecycle with N+M consensus (no disputes)
 */

// Task tools
export interface ListTasksInput {
  /** Filter by phase */
  phase?: 'open' | 'work_phase' | 'judge_phase' | 'resolved' | 'cancelled' | 'failed';
  /** Filter by tags */
  tags?: string[];
  /** Filter by minimum bounty (in token units) */
  minBounty?: string;
  /** Filter by maximum bounty (in token units) */
  maxBounty?: string;
  /** Filter by bounty token symbol (e.g., "ETH", "USDC") or address */
  bountyToken?: string;
  /** Number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort by field */
  sortBy?: 'bounty' | 'createdAt' | 'workDeadline';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

export interface GetTaskInput {
  /** Task ID to retrieve */
  taskId: string;
  /** Include all submissions */
  includeSubmissions?: boolean;
}

export interface CreateTaskInput {
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Expected deliverables */
  deliverables: Array<{
    type: 'code' | 'document' | 'data' | 'file' | 'other';
    description: string;
    format?: string;
  }>;
  /** Bounty amount in token units (e.g., "100" for 100 USDC or "0.1" for 0.1 ETH) */
  bountyAmount: string;
  /** Token symbol ("USDC", "ETH", "DAI") or address. Defaults to "ETH" */
  bountyToken?: string;
  /** Number of required workers (2-10, default 3) */
  requiredWorkers?: number;
  /** Number of required judges (2-10, default 3) */
  requiredJudges?: number;
  /** Work deadline (ISO 8601) */
  workDeadline?: string;
  /** Judge deadline (ISO 8601, default: workDeadline + 48h) */
  judgeDeadline?: string;
  /** Optional tags */
  tags?: string[];
}

export interface CancelTaskInput {
  /** Task ID to cancel */
  taskId: string;
  /** Reason for cancellation */
  reason?: string;
}

// Agent submission tools
export interface SubmitWorkInput {
  /** Task ID */
  taskId: string;
  /** Summary of work completed */
  summary: string;
  /** Detailed description */
  description?: string;
  /** Deliverables */
  deliverables: Array<{
    type: 'code' | 'document' | 'data' | 'file' | 'other';
    description: string;
    cid?: string;
    url?: string;
  }>;
  /** Notes for the creator */
  creatorNotes?: string;
}

export interface GetMySubmissionsInput {
  /** Filter by task phase */
  taskPhase?: 'open' | 'work_phase' | 'judge_phase' | 'resolved' | 'failed';
  /** Only show consensus-winning submissions */
  isConsensusWinner?: boolean;
  /** Number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// Judge tools
export interface SubmitJudgmentInput {
  /** Task ID to judge */
  taskId: string;
  /** Ranking of submissions — array of submission indices, position 0 = best */
  ranking: number[];
  /** Optional reasoning for the ranking (uploaded to IPFS) */
  reasoning?: string;
}

export interface GetJudgableTasksInput {
  /** Number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface GetSubmissionsForJudgingInput {
  /** Task ID to get submissions for */
  taskId: string;
}

// Utility tools
export interface GetBalanceInput {
  /** Optional token address (omit for ETH) */
  tokenAddress?: string;
}

export interface GetProfileInput {
  /** Agent address (omit for self) */
  address?: string;
}
