import type { IndexerEvent } from '../listener';
import { getTaskByChainId, updateTaskPhase } from '@pactprotocol/database';
import { invalidateTaskCaches, invalidatePhaseCaches } from '@pactprotocol/cache';

/**
 * Phase enum values from the contract (matches TaskManagerV2.TaskPhase)
 */
const PHASE_NAMES: Record<number, string> = {
  0: 'open',
  1: 'work_phase',
  2: 'judge_phase',
  3: 'resolved',
  4: 'cancelled',
  5: 'failed',
};

/**
 * Handle PhaseChanged event (V2)
 *
 * V2 event signature:
 *   PhaseChanged(uint256 indexed taskId, TaskPhase fromPhase, TaskPhase toPhase)
 *
 * This event is emitted on every phase transition. It updates the task's phase
 * in the database and invalidates relevant caches.
 */
export async function handlePhaseChanged(event: IndexerEvent): Promise<void> {
  const { taskId, fromPhase, toPhase } = event.args as {
    taskId: bigint;
    fromPhase: number;
    toPhase: number;
  };

  const fromPhaseName = PHASE_NAMES[fromPhase] ?? `unknown(${fromPhase})`;
  const toPhaseName = PHASE_NAMES[toPhase] ?? `unknown(${toPhase})`;

  console.log(
    `Processing PhaseChanged: taskId=${taskId}, ${fromPhaseName} -> ${toPhaseName}`
  );

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Update task phase
  const newPhase = PHASE_NAMES[toPhase];
  if (!newPhase) {
    console.error(`Unknown phase value ${toPhase} for task ${taskId}`);
    return;
  }

  await updateTaskPhase(task.id, newPhase);

  // Invalidate relevant caches
  await Promise.all([
    invalidateTaskCaches(task.id),
    invalidatePhaseCaches(),
  ]);

  console.log(`Task ${taskId} phase updated: ${fromPhaseName} -> ${toPhaseName}`);
}
