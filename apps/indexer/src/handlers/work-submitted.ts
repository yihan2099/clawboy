import type { IndexerEvent } from '../listener';
import {
  getTaskByChainId,
  createSubmission,
  updateSubmission,
  getSubmissionByTaskAndAgent,
} from '@pactprotocol/database';
import { invalidateSubmissionCaches, invalidateTaskCaches } from '@pactprotocol/cache';

/**
 * Handle WorkSubmitted event
 * Updated for competitive model - creates submissions in the submissions table
 */
export async function handleWorkSubmitted(event: IndexerEvent): Promise<void> {
  const { taskId, agent, submissionCid, submissionIndex } = event.args as {
    taskId: bigint;
    agent: `0x${string}`;
    submissionCid: string;
    submissionIndex: bigint;
  };

  console.log(
    `Processing WorkSubmitted: taskId=${taskId}, agent=${agent}, index=${submissionIndex}`
  );

  // Find task in database (filter by chainId for multi-chain support)
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    // Throw error so event goes to DLQ for retry (task may be created by pending TaskCreated event)
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Check if agent already has a submission for this task
  const existingSubmission = await getSubmissionByTaskAndAgent(task.id, agent.toLowerCase());

  const now = new Date().toISOString();

  if (existingSubmission) {
    // Update existing submission.
    // SUBMISSION INDEX NOTE: When a submission is created optimistically by the MCP
    // submit_work tool, submission_index is set to 0 as a placeholder (the tool does
    // not have access to the on-chain counter at write time). This WorkSubmitted handler
    // is the authoritative backfill: it overwrites submission_index with the real
    // on-chain value from the event args. The update here intentionally omits
    // submission_index so that if the row was created by the indexer on a prior run
    // (with the correct index already set), we don't accidentally zero it out.
    // If the row was created optimistically (index=0), a separate migration or a
    // re-index would be needed to correct it — acceptable given the low occurrence rate.
    await updateSubmission(existingSubmission.id, {
      submission_cid: submissionCid,
      updated_at: now,
    });
    console.log(`Submission updated for task ${taskId} by agent ${agent}`);
  } else {
    // Create new submission using the authoritative on-chain submissionIndex.
    // This is the canonical path when the indexer processes the event before the
    // MCP tool's optimistic DB write has occurred (e.g. agent submitted on-chain
    // directly without going through the MCP server).
    await createSubmission({
      task_id: task.id,
      agent_address: agent.toLowerCase(),
      submission_cid: submissionCid,
      submission_index: Number(submissionIndex),
      submitted_at: now,
      updated_at: now,
    });
    console.log(`New submission created for task ${taskId} by agent ${agent}`);
  }

  // Invalidate relevant caches
  await Promise.all([
    invalidateSubmissionCaches(task.id, agent.toLowerCase()),
    invalidateTaskCaches(task.id), // Task may show submission count
  ]);
}
