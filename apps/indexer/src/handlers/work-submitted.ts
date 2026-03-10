import type { IndexerEvent } from '../listener';
import {
  getTaskByChainId,
  createSubmission,
  updateSubmission,
  getSubmissionByTaskAndAgent,
  updateTaskSubmissionCount,
} from '@pactprotocol/database';
import { invalidateSubmissionCaches, invalidateTaskCaches } from '@pactprotocol/cache';

/**
 * Handle WorkSubmitted event (V2)
 * Creates submissions in the submissions table.
 *
 * V2 event signature:
 *   WorkSubmitted(uint256 indexed taskId, address indexed worker, string submissionCid, uint256 slotIndex)
 *
 * In V2, each worker gets exactly one slot (no edits). slotIndex is the authoritative
 * on-chain submission index.
 */
export async function handleWorkSubmitted(event: IndexerEvent): Promise<void> {
  const { taskId, worker, submissionCid, slotIndex } = event.args as {
    taskId: bigint;
    worker: `0x${string}`;
    submissionCid: string;
    slotIndex: bigint;
  };

  console.log(
    `Processing WorkSubmitted: taskId=${taskId}, worker=${worker}, slotIndex=${slotIndex}`
  );

  // Find task in database (filter by chainId for multi-chain support)
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry (task may be created by pending TaskCreated event)
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Check if worker already has a submission for this task (idempotency)
  const existingSubmission = await getSubmissionByTaskAndAgent(task.id, worker.toLowerCase());

  const now = new Date().toISOString();

  if (existingSubmission) {
    // Idempotent re-processing: update the CID and index if needed
    await updateSubmission(existingSubmission.id, {
      submission_cid: submissionCid,
      submission_index: Number(slotIndex),
      updated_at: now,
    });
    console.log(`Submission updated for task ${taskId} by worker ${worker} (re-processed)`);
  } else {
    // Create new submission with the authoritative on-chain slotIndex
    await createSubmission({
      task_id: task.id,
      agent_address: worker.toLowerCase(),
      submission_cid: submissionCid,
      submission_index: Number(slotIndex),
      submitted_at: now,
      updated_at: now,
    });
    console.log(`New submission created for task ${taskId} by worker ${worker}`);
  }

  // Update task submission count
  const newCount = Number(slotIndex) + 1; // slotIndex is 0-based
  await updateTaskSubmissionCount(task.id, newCount);

  // Invalidate relevant caches
  await Promise.all([
    invalidateSubmissionCaches(task.id, worker.toLowerCase()),
    invalidateTaskCaches(task.id), // Task submission count changed
  ]);
}
