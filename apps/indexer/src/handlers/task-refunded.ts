import type { IndexerEvent } from '../listener';
import { getTaskByChainId, updateTask } from '@clawboy/database';
import { assertValidStatusTransition, type TaskStatusString } from '@clawboy/shared-types';
import { invalidateTaskCaches } from '@clawboy/cache';

/**
 * Handle TaskRefunded event
 * Bounty returned to creator (rejected submissions or deadline passed)
 */
export async function handleTaskRefunded(event: IndexerEvent): Promise<void> {
  const { taskId, creator, refundAmount } = event.args as {
    taskId: bigint;
    creator: `0x${string}`;
    refundAmount: bigint;
  };

  console.log(
    `Processing TaskRefunded: taskId=${taskId}, creator=${creator}, amount=${refundAmount}`
  );

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Validate status transition
  const currentStatus = task.status as TaskStatusString;
  const newStatus: TaskStatusString = 'refunded';
  assertValidStatusTransition(currentStatus, newStatus, task.chain_task_id);

  // Update task status to refunded
  await updateTask(task.id, {
    status: newStatus,
  });

  // Invalidate task caches
  await invalidateTaskCaches(task.id);

  console.log(`Task ${taskId} refunded ${refundAmount} to ${creator}`);
}
