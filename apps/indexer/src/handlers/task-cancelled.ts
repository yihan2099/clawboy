import type { IndexerEvent } from '../listener';
import { getTaskByChainId, updateTaskPhase } from '@pactprotocol/database';
import { invalidateTaskCaches, invalidatePhaseCaches } from '@pactprotocol/cache';

/**
 * Handle TaskCancelled event (V2)
 *
 * V2 event signature:
 *   TaskCancelled(uint256 indexed taskId, address indexed creator)
 */
export async function handleTaskCancelled(event: IndexerEvent): Promise<void> {
  const { taskId, creator } = event.args as {
    taskId: bigint;
    creator: `0x${string}`;
  };

  console.log(`Processing TaskCancelled: taskId=${taskId}, creator=${creator}`);

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Update task phase to cancelled
  await updateTaskPhase(task.id, 'cancelled');

  // Invalidate task caches
  await Promise.all([
    invalidateTaskCaches(task.id),
    invalidatePhaseCaches(),
  ]);

  console.log(`Task ${taskId} cancelled by ${creator}`);
}
