/**
 * Task Phase State Machine (V2 — N+M Consensus)
 *
 * Replaces the old TaskStatus state machine with phase-based lifecycle.
 *
 * State Diagram:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │  Open ──► WorkPhase ──► JudgePhase ──► Resolved                         │
 * │    │           │              │              │                            │
 * │    │           │              │              ├─► Completed (payouts)      │
 * │    │           │              │              └─► Failed (no consensus)    │
 * │    │           │              │                                           │
 * │    │           │              └─► Failed (judge timeout)                  │
 * │    │           └─► Failed (work timeout, insufficient workers)            │
 * │    │                                                                      │
 * │    └─► Cancelled (creator cancels before any submissions)                 │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Valid Transitions:
 * - open → work_phase: First worker submits
 * - open → cancelled: Creator cancels (no submissions)
 * - work_phase → judge_phase: All N workers submitted or timeout with enough
 * - work_phase → failed: Work timeout with insufficient workers
 * - judge_phase → resolved: All M judges submitted and consensus exists
 * - judge_phase → failed: Judge timeout or no consensus
 * - resolved: Terminal (payouts made)
 * - cancelled: Terminal (refund issued)
 * - failed: Terminal (refund issued)
 */

/**
 * Task phase enum matching the TaskManagerV2 contract phases
 */
export enum TaskPhase {
  /** Task is open and accepting worker submissions */
  Open = 'open',
  /** Work in progress — first submission received, more expected */
  WorkPhase = 'work_phase',
  /** Judging in progress — all workers submitted, judges ranking */
  JudgePhase = 'judge_phase',
  /** Consensus reached, payouts made */
  Resolved = 'resolved',
  /** Task cancelled by creator before any submissions */
  Cancelled = 'cancelled',
  /** Failed — insufficient workers/judges or no consensus, refunded */
  Failed = 'failed',
}

/**
 * Task phase type as string union (for database/API compatibility)
 */
export type TaskPhaseString =
  | 'open'
  | 'work_phase'
  | 'judge_phase'
  | 'resolved'
  | 'cancelled'
  | 'failed';

/**
 * Numeric phase values matching the smart contract
 */
export const TaskPhaseNumber: Record<TaskPhase, number> = {
  [TaskPhase.Open]: 0,
  [TaskPhase.WorkPhase]: 1,
  [TaskPhase.JudgePhase]: 2,
  [TaskPhase.Resolved]: 3,
  [TaskPhase.Cancelled]: 4,
  [TaskPhase.Failed]: 5,
};

/**
 * Terminal phases (no further transitions possible)
 */
export const TERMINAL_PHASES: readonly TaskPhase[] = [
  TaskPhase.Resolved,
  TaskPhase.Cancelled,
  TaskPhase.Failed,
];

/**
 * Valid phase transitions
 * Maps from current phase to array of valid next phases
 */
export const VALID_PHASE_TRANSITIONS: Record<TaskPhase, readonly TaskPhase[]> = {
  [TaskPhase.Open]: [TaskPhase.WorkPhase, TaskPhase.Cancelled],
  [TaskPhase.WorkPhase]: [TaskPhase.JudgePhase, TaskPhase.Failed],
  [TaskPhase.JudgePhase]: [TaskPhase.Resolved, TaskPhase.Failed],
  [TaskPhase.Resolved]: [], // Terminal state
  [TaskPhase.Cancelled]: [], // Terminal state
  [TaskPhase.Failed]: [], // Terminal state
};

/**
 * Convert numeric phase from contract to TaskPhase enum
 */
export function numberToTaskPhase(num: number): TaskPhase {
  const entries = Object.entries(TaskPhaseNumber);
  const found = entries.find(([_, value]) => value === num);
  if (!found) {
    throw new Error(`Unknown task phase number: ${num}`);
  }
  return found[0] as TaskPhase;
}

/**
 * Check if a phase transition is valid
 */
export function isValidPhaseTransition(
  fromPhase: TaskPhase | TaskPhaseString,
  toPhase: TaskPhase | TaskPhaseString
): boolean {
  const from = typeof fromPhase === 'string' ? stringToTaskPhase(fromPhase) : fromPhase;
  const to = typeof toPhase === 'string' ? stringToTaskPhase(toPhase) : toPhase;
  const validTransitions = VALID_PHASE_TRANSITIONS[from];
  return validTransitions.includes(to);
}

/**
 * Check if a phase is terminal (no further transitions)
 */
export function isTerminalPhase(phase: TaskPhase | TaskPhaseString): boolean {
  const p = typeof phase === 'string' ? stringToTaskPhase(phase) : phase;
  return TERMINAL_PHASES.includes(p);
}

/**
 * Convert string phase to TaskPhase enum
 */
export function stringToTaskPhase(phase: string): TaskPhase {
  const mapping: Record<string, TaskPhase> = {
    open: TaskPhase.Open,
    work_phase: TaskPhase.WorkPhase,
    judge_phase: TaskPhase.JudgePhase,
    resolved: TaskPhase.Resolved,
    cancelled: TaskPhase.Cancelled,
    failed: TaskPhase.Failed,
  };
  const result = mapping[phase];
  if (!result) {
    throw new Error(`Unknown task phase: ${phase}`);
  }
  return result;
}

/**
 * Error thrown when an invalid phase transition is attempted
 */
export class InvalidPhaseTransitionError extends Error {
  constructor(
    public readonly fromPhase: TaskPhase | TaskPhaseString,
    public readonly toPhase: TaskPhase | TaskPhaseString,
    public readonly taskId?: string
  ) {
    const fromEnum = typeof fromPhase === 'string' ? stringToTaskPhase(fromPhase) : fromPhase;
    const toEnum = typeof toPhase === 'string' ? stringToTaskPhase(toPhase) : toPhase;
    const fromStr = fromEnum.valueOf();
    const toStr = toEnum.valueOf();
    const taskRef = taskId ? ` (task: ${taskId})` : '';
    const validTransitions =
      VALID_PHASE_TRANSITIONS[fromEnum].map((p) => p.valueOf()).join(', ') ||
      'none (terminal phase)';

    super(
      `Invalid phase transition from '${fromStr}' to '${toStr}'${taskRef}. ` +
        `Valid transitions from '${fromStr}': ${validTransitions}`
    );
    this.name = 'InvalidPhaseTransitionError';
  }
}

/**
 * Assert that a phase transition is valid, throwing if not
 */
export function assertValidPhaseTransition(
  fromPhase: TaskPhase | TaskPhaseString,
  toPhase: TaskPhase | TaskPhaseString,
  taskId?: string
): void {
  if (!isValidPhaseTransition(fromPhase, toPhase)) {
    throw new InvalidPhaseTransitionError(fromPhase, toPhase, taskId);
  }
}

/**
 * Get a human-readable description for a task phase
 */
export function getPhaseDescription(phase: TaskPhase | TaskPhaseString): string {
  const p = typeof phase === 'string' ? stringToTaskPhase(phase) : phase;
  const descriptions: Record<TaskPhase, string> = {
    [TaskPhase.Open]: 'Task is accepting worker submissions',
    [TaskPhase.WorkPhase]: 'Workers are producing outputs',
    [TaskPhase.JudgePhase]: 'Judges are ranking worker outputs',
    [TaskPhase.Resolved]: 'Consensus reached, payouts distributed',
    [TaskPhase.Cancelled]: 'Task cancelled by creator',
    [TaskPhase.Failed]: 'Task failed — bounty refunded to creator',
  };
  return descriptions[p];
}
