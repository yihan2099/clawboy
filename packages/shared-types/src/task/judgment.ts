/**
 * Judgment types for the N+M consensus model
 * A judgment is a judge's ranking of worker submissions
 */

/**
 * On-chain judgment data from the TaskManagerV2 contract
 */
export interface Judgment {
  /** Database ID */
  id: string;

  /** Task ID */
  taskId: string;

  /** Judge's wallet address */
  judgeAddress: `0x${string}`;

  /** Judgment slot index (0-based) */
  judgmentIndex: number;

  /** Ranking permutation (position 0 = best submission) */
  ranking: number[];

  /** Whether this judge was in consensus with the aggregate ranking */
  inConsensus: boolean | null;

  /** Timestamp when submitted */
  submittedAt: string;
}

/**
 * Judgment list item for display
 */
export interface JudgmentListItem {
  id: string;
  taskId: string;
  judgeAddress: `0x${string}`;
  judgmentIndex: number;
  inConsensus: boolean | null;
  submittedAt: string;
}
