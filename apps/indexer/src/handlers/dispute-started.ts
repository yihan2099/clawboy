import type { IndexerEvent } from '../listener';
import { getTaskByChainId, createDispute } from '@pactprotocol/database';
import { invalidateDisputeCaches, invalidateTaskCaches } from '@pactprotocol/cache';

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

  // Validate and convert the on-chain Unix timestamp (seconds) to ISO-8601.
  // Number(bigint) is safe for any Unix timestamp that fits within Number.MAX_SAFE_INTEGER
  // (year 285,428,751), but we guard against unreasonably large values from malformed events.
  const votingDeadlineSeconds = votingDeadline;
  if (votingDeadlineSeconds > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `DisputeCreated event has unreasonable votingDeadline: ${votingDeadlineSeconds}`
    );
  }
  const votingDeadlineMs = Number(votingDeadlineSeconds) * 1000;
  if (!Number.isFinite(votingDeadlineMs) || votingDeadlineMs < 0) {
    throw new Error(`Invalid votingDeadline timestamp: ${votingDeadlineSeconds}`);
  }

  // Create dispute record
  await createDispute({
    task_id: task.id,
    chain_dispute_id: disputeId.toString(),
    disputer_address: disputer.toLowerCase(),
    dispute_stake: stake.toString(),
    voting_deadline: new Date(votingDeadlineMs).toISOString(),
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
