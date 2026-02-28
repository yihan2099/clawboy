import type { IndexerEvent } from '../listener';
import {
  getTaskByChainId,
  updateTask,
  incrementTasksWon,
  markSubmissionAsWinner,
} from '@pactprotocol/database';
import { assertValidStatusTransition, type TaskStatusString } from '@pactprotocol/shared-types';
import {
  invalidateTaskCaches,
  invalidateAgentCaches,
  invalidateSubmissionCaches,
} from '@pactprotocol/cache';

/**
 * Handle TaskCompleted event
 * Updated for competitive model - uses atomic increment for tasks_won
 */
export async function handleTaskCompleted(event: IndexerEvent): Promise<void> {
  const { taskId, winner, bountyAmount } = event.args as {
    taskId: bigint;
    winner: `0x${string}`;
    bountyAmount: bigint;
  };

  console.log(`Processing TaskCompleted: taskId=${taskId}, winner=${winner}`);

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry (task may be created by pending TaskCreated event)
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Validate status transition
  const currentStatus = task.status as TaskStatusString;
  const newStatus: TaskStatusString = 'completed';
  assertValidStatusTransition(currentStatus, newStatus, task.chain_task_id);

  // Update task status
  await updateTask(task.id, {
    status: newStatus,
    winner_address: winner.toLowerCase(),
  });

  // Mark the winning submission
  await markSubmissionAsWinner(task.id, winner.toLowerCase());

  // Update agent stats atomically (avoids N+1 query and race conditions)
  try {
    await incrementTasksWon(winner);
    console.log(`Incremented tasks_won for agent ${winner}`);
  } catch (error) {
    // Agent may not exist in the database if the AgentRegistered event has not yet been
    // processed (indexer ordering race condition). The escrow release and task completion
    // are already committed; this stats update is best-effort. The agent's tasks_won count
    // can be manually corrected via the admin API or by replaying the AgentRegistered event.
    console.warn(
      `[task-completed] Could not increment tasks_won for agent ${winner} ` +
      `(agent may not exist yet in DB — possible AgentRegistered/TaskCompleted ordering race): ${error}`
    );
  }

  // Invalidate relevant caches
  await Promise.all([
    invalidateTaskCaches(task.id),
    invalidateAgentCaches(winner.toLowerCase()),
    invalidateSubmissionCaches(task.id),
  ]);

  console.log(`Task ${taskId} completed, ${bountyAmount} paid to ${winner}`);
}
