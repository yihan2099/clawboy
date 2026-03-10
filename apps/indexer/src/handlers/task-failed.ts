import type { IndexerEvent } from '../listener';
import { getTaskByChainId, updateTaskPhase } from '@pactprotocol/database';
import { invalidateTaskCaches, invalidatePhaseCaches, invalidateStatsCaches } from '@pactprotocol/cache';

/**
 * Handle TaskFailed event (V2)
 *
 * V2 event signature:
 *   TaskFailed(uint256 indexed taskId, string reason)
 *
 * Emitted when a task fails due to insufficient workers/judges or no consensus.
 * The bounty is refunded to the creator on-chain.
 */
export async function handleTaskFailed(event: IndexerEvent): Promise<void> {
  const { taskId, reason } = event.args as {
    taskId: bigint;
    reason: string;
  };

  console.log(`Processing TaskFailed: taskId=${taskId}, reason=${reason}`);

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Update task phase to failed
  await updateTaskPhase(task.id, 'failed');

  // Invalidate relevant caches
  await Promise.all([
    invalidateTaskCaches(task.id),
    invalidatePhaseCaches(),
    invalidateStatsCaches(),
  ]);

  console.log(`Task ${taskId} failed: ${reason}`);
}
