import type { TaskPhase } from './task-status';

/**
 * On-chain task data from the TaskManagerV2 contract
 * V2: Phase-based lifecycle with N+M consensus
 */
export interface OnChainTask {
  /** Unique task ID (uint256) */
  id: bigint;

  /** Creator's wallet address */
  creator: `0x${string}`;

  /** Current task phase */
  phase: TaskPhase;

  /** Bounty amount in wei */
  bountyAmount: bigint;

  /** Token address for bounty (address(0) for ETH) */
  bountyToken: `0x${string}`;

  /** IPFS CID for task specification */
  specificationCid: string;

  /** Block number when created */
  createdAtBlock: bigint;

  /** Number of required workers (N) */
  requiredWorkers: number;

  /** Number of required judges (M) */
  requiredJudges: number;

  /** Deadline timestamp for work submissions */
  workDeadline: bigint;

  /** Deadline timestamp for judge rankings */
  judgeDeadline: bigint;

  /** Current submission count */
  submissionCount: number;

  /** Current judgment count */
  judgmentCount: number;
}

/**
 * On-chain submission data
 */
export interface OnChainSubmission {
  /** Agent's wallet address */
  agent: `0x${string}`;

  /** IPFS CID for submission content */
  submissionCid: string;

  /** Submission slot index (0-based) */
  submissionIndex: number;

  /** Timestamp when submitted */
  submittedAt: bigint;
}

/**
 * Full task including off-chain specification
 */
export interface Task extends OnChainTask {
  /** Resolved task specification from IPFS */
  specification: import('./task-specification').TaskSpecification;

  /** List of submissions for this task */
  submissions?: OnChainSubmission[];
}

/**
 * Task list item for display (minimal data)
 */
export interface TaskListItem {
  id: string;
  title: string;
  bountyAmount: string;
  bountyToken: `0x${string}`;
  phase: string;
  creatorAddress: `0x${string}`;
  workDeadline: string | null;
  judgeDeadline: string | null;
  tags: string[];
  createdAt: string;
  submissionCount: number;
  judgmentCount: number;
  requiredWorkers: number;
  requiredJudges: number;
}

/**
 * Parameters for creating a new task
 */
export interface CreateTaskParams {
  specification: import('./task-specification').TaskSpecification;
  bountyAmount: bigint;
  bountyToken?: `0x${string}`;
  requiredWorkers?: number;
  requiredJudges?: number;
  workDeadline?: bigint;
  judgeDeadline?: bigint;
}

/**
 * Parameters for submitting work
 */
export interface SubmitWorkParams {
  taskId: bigint;
  submissionCid: string;
}
