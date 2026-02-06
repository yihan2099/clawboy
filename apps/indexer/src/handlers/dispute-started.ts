import type { IndexerEvent } from '../listener';
import { getTaskByChainId, createDispute } from '@clawboy/database';
import { invalidateDisputeCaches, invalidateTaskCaches } from '@clawboy/cache';

/**
 * Handle DisputeCreated event
 * A new dispute has been opened against a task decision
 */
export async function handleDisputeCreated(event: IndexerEvent): Promise<void> {
  const { disputeId, taskId, disputer, stake, votingDeadline } = event.args as {
    disputeId: bigint;
    taskId: bigint;
    disputer: `0x${string}`;
    stake: bigint;
    votingDeadline: bigint;
  };

  console.log(
    `Processing DisputeCreated: disputeId=${disputeId}, taskId=${taskId}, disputer=${disputer}`
  );

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry (task may be created by pending TaskCreated event)
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Create dispute record
  await createDispute({
    task_id: task.id,
    chain_dispute_id: disputeId.toString(),
    disputer_address: disputer.toLowerCase(),
    dispute_stake: stake.toString(),
    voting_deadline: new Date(Number(votingDeadline) * 1000).toISOString(),
    status: 'active',
    tx_hash: event.transactionHash,
  });

  // Invalidate relevant caches
  await Promise.all([
    invalidateDisputeCaches(undefined, task.id),
    invalidateTaskCaches(task.id), // Task status changed to disputed
  ]);

  console.log(`Dispute ${disputeId} started for task ${taskId} by ${disputer}, stake: ${stake}`);
}
