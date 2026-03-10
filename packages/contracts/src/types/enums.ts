/**
 * Contract enums matching Solidity definitions in TaskManagerV2.sol
 *
 * IMPORTANT: These values MUST match the Solidity enum ordering exactly:
 * - Open=0: Accepting worker submissions
 * - WorkPhase=1: Workers producing outputs
 * - JudgePhase=2: Judges ranking worker outputs
 * - Resolved=3: Consensus reached, payouts distributed
 * - Failed=4: No consensus or timeouts, bounty refunded
 * - Cancelled=5: Creator cancelled before any submissions
 */
export enum ContractTaskPhase {
  Open = 0,
  WorkPhase = 1,
  JudgePhase = 2,
  Resolved = 3,
  Failed = 4,
  Cancelled = 5,
}

/** @deprecated Use ContractTaskPhase instead */
export const ContractTaskStatus = ContractTaskPhase;
/** @deprecated Use ContractTaskPhase instead */
export type ContractTaskStatus = ContractTaskPhase;

/**
 * Database/API phase strings used throughout the application
 */
export type TaskPhaseString =
  | 'open'
  | 'work_phase'
  | 'judge_phase'
  | 'resolved'
  | 'failed'
  | 'cancelled';

/** @deprecated Use TaskPhaseString instead */
export type TaskStatusString = TaskPhaseString;

/**
 * Convert contract numeric phase to database string phase
 *
 * @throws {Error} if `phase` is not a defined {@link ContractTaskPhase} value.
 * An unknown phase indicates a contract upgrade that added new states — this should
 * fail loudly so the indexer surfaces the gap rather than silently returning `undefined`.
 */
export function contractPhaseToString(phase: ContractTaskPhase): TaskPhaseString {
  const mapping: Record<ContractTaskPhase, TaskPhaseString> = {
    [ContractTaskPhase.Open]: 'open',
    [ContractTaskPhase.WorkPhase]: 'work_phase',
    [ContractTaskPhase.JudgePhase]: 'judge_phase',
    [ContractTaskPhase.Resolved]: 'resolved',
    [ContractTaskPhase.Failed]: 'failed',
    [ContractTaskPhase.Cancelled]: 'cancelled',
  };
  const result = mapping[phase];
  if (result === undefined) {
    throw new Error(
      `Unknown ContractTaskPhase value: ${phase}. ` +
        'Update contractPhaseToString() to handle the new phase.'
    );
  }
  return result;
}

/** @deprecated Use contractPhaseToString instead */
export const contractStatusToString = contractPhaseToString;

/**
 * Convert database string phase to contract numeric phase
 */
export function stringToContractPhase(phase: TaskPhaseString): ContractTaskPhase {
  const mapping: Record<TaskPhaseString, ContractTaskPhase> = {
    open: ContractTaskPhase.Open,
    work_phase: ContractTaskPhase.WorkPhase,
    judge_phase: ContractTaskPhase.JudgePhase,
    resolved: ContractTaskPhase.Resolved,
    failed: ContractTaskPhase.Failed,
    cancelled: ContractTaskPhase.Cancelled,
  };
  return mapping[phase];
}

/** @deprecated Use stringToContractPhase instead */
export const stringToContractStatus = stringToContractPhase;
