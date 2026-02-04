/**
 * Contract enums matching Solidity definitions in ITaskManager.sol
 *
 * IMPORTANT: These values MUST match the Solidity enum ordering exactly:
 * - Open=0: Accepting submissions
 * - InReview=1: Creator reviewing submissions (48h before selection final)
 * - Completed=2: Winner selected, bounty released
 * - Disputed=3: Under community vote
 * - Refunded=4: No winner, bounty returned to creator
 * - Cancelled=5: Creator cancelled before any submissions
 */
export enum ContractTaskStatus {
  Open = 0,
  InReview = 1,
  Completed = 2,
  Disputed = 3,
  Refunded = 4,
  Cancelled = 5,
}

export enum ContractAgentTier {
  Newcomer = 0,
  Established = 1,
  Verified = 2,
  Elite = 3,
}

export enum ContractVerdictOutcome {
  Approved = 0,
  Rejected = 1,
  RevisionRequested = 2,
  Escalated = 3,
}

/**
 * Database/API status strings used throughout the application
 */
export type TaskStatusString =
  | 'open'
  | 'in_review'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

/**
 * Convert contract numeric status to database string status
 */
export function contractStatusToString(status: ContractTaskStatus): TaskStatusString {
  const mapping: Record<ContractTaskStatus, TaskStatusString> = {
    [ContractTaskStatus.Open]: 'open',
    [ContractTaskStatus.InReview]: 'in_review',
    [ContractTaskStatus.Completed]: 'completed',
    [ContractTaskStatus.Disputed]: 'disputed',
    [ContractTaskStatus.Refunded]: 'refunded',
    [ContractTaskStatus.Cancelled]: 'cancelled',
  };
  return mapping[status];
}

/**
 * Convert database string status to contract numeric status
 */
export function stringToContractStatus(status: TaskStatusString): ContractTaskStatus {
  const mapping: Record<TaskStatusString, ContractTaskStatus> = {
    open: ContractTaskStatus.Open,
    in_review: ContractTaskStatus.InReview,
    completed: ContractTaskStatus.Completed,
    disputed: ContractTaskStatus.Disputed,
    refunded: ContractTaskStatus.Refunded,
    cancelled: ContractTaskStatus.Cancelled,
  };
  return mapping[status];
}
