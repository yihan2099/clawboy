import type { TaskListItem } from '../task/task';
import type { TaskRequirement } from '../task/task-specification';

/**
 * MCP tool response types
 * V2: Phase-based lifecycle with N+M consensus (no disputes)
 */

// Task tool responses
export interface ListTasksResponse {
  tasks: TaskListItem[];
  total: number;
  hasMore: boolean;
}

export interface GetTaskResponse {
  id: string;
  title: string;
  description: string;
  phase: string;
  bountyAmount: string;
  bountyToken: string;
  creator: string;
  workDeadline: string | null;
  judgeDeadline: string | null;
  tags: string[];
  deliverables: Array<{
    type: string;
    description: string;
    format?: string;
  }>;
  requirements?: TaskRequirement[];
  /** All submissions for this task */
  submissions?: SubmissionInfo[];
  /** Number of submissions */
  submissionCount: number;
  /** Number of judgments */
  judgmentCount: number;
  /** Required workers (N) */
  requiredWorkers: number;
  /** Required judges (M) */
  requiredJudges: number;
  createdAt: string;
}

export interface SubmissionInfo {
  agent: string;
  submissionCid: string;
  submissionIndex: number;
  submittedAt: string;
  consensusRank: number | null;
  isConsensusWinner: boolean;
}

export interface CreateTaskResponse {
  taskId: string;
  specificationCid: string;
  txHash: string;
  explorerUrl: string;
}

export interface CancelTaskResponse {
  taskId: string;
  txHash: string;
  refundAmount: string;
}

// Agent submission responses
export interface SubmitWorkResponse {
  taskId: string;
  submissionCid: string;
  slotIndex: number;
  slotsRemaining: number;
  txHash: string;
}

export interface GetMySubmissionsResponse {
  submissions: Array<{
    taskId: string;
    taskTitle: string;
    taskPhase: string;
    submissionCid: string;
    submissionIndex: number;
    submittedAt: string;
    consensusRank: number | null;
    isConsensusWinner: boolean;
    bountyAmount: string;
  }>;
  total: number;
  hasMore: boolean;
}

// Judge tool responses
export interface SubmitJudgmentResponse {
  taskId: string;
  judgmentIndex: number;
  txHash: string;
}

export interface GetJudgableTasksResponse {
  tasks: Array<{
    taskId: string;
    title: string;
    bountyAmount: string;
    submissionCount: number;
    requiredJudges: number;
    currentJudgmentCount: number;
    estimatedJudgeFee: string;
    judgeDeadline: string;
  }>;
  total: number;
  hasMore: boolean;
}

export interface GetSubmissionsForJudgingResponse {
  taskId: string;
  submissions: Array<{
    submissionIndex: number;
    submissionCid: string;
    content: import('../task/submission-content').WorkSubmission | null;
  }>;
  submissionCount: number;
}

// Utility tool responses
export interface GetBalanceResponse {
  address: string;
  balance: string;
  symbol: string;
  decimals: number;
}

export interface GetProfileResponse {
  address: string;
  name: string;
  reputation: string;
  workerConsensusWins: number;
  judgeConsensusWins: number;
  skills: string[];
}

// Error response
export interface ToolErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
