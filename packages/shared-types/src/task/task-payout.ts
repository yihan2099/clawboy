/**
 * Task payout types for the N+M consensus model
 * Tracks how task bounties are distributed after resolution
 */

/**
 * Role of a payout recipient
 */
export type PayoutRole = 'worker' | 'judge' | 'protocol';

/**
 * Task payout record
 */
export interface TaskPayout {
  /** Database ID */
  id: string;

  /** Task ID */
  taskId: string;

  /** Recipient wallet address */
  recipientAddress: `0x${string}`;

  /** Role of the recipient */
  role: PayoutRole;

  /** Payout amount (in token units as string) */
  amount: string;

  /** Consensus rank for workers (0 = best), null for judges/protocol */
  consensusRank: number | null;

  /** Transaction hash */
  txHash: string | null;

  /** Timestamp when paid */
  paidAt: string | null;
}
