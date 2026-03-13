import type { IndexerEvent } from '../listener';
import {
  getTaskByChainId,
  getSubmissionsByTaskId,
  updateSubmissionConsensus,
  updateJudgmentConsensus,
  getJudgmentsByTask,
  updateTaskPhase,
} from '@pactprotocol/database';
import {
  invalidateTaskCaches,
  invalidateSubmissionCaches,
  invalidateJudgmentCaches,
  invalidatePayoutCaches,
  invalidatePhaseCaches,
  invalidateStatsCaches,
} from '@pactprotocol/cache';

/**
 * Handle TaskResolved event (V2)
 *
 * V2 event signature:
 *   TaskResolved(uint256 indexed taskId, uint8[] consensusRanking,
 *                address[] winningWorkers, address[] consensusJudges)
 *
 * This is emitted when consensus is computed and payouts are distributed.
 * We update submissions with their consensus rank and winner status,
 * and update judgments with their consensus status.
 */
export async function handleTaskResolved(event: IndexerEvent): Promise<void> {
  // Runtime validation: viem decodes event args dynamically; incorrect ABI or a chain
  // reorg could produce unexpected types. Validate before use to prevent silent corruption
  // of consensus data (wrong workers paid, wrong judges marked as in-consensus).
  const raw = event.args;
  if (
    typeof raw.taskId !== 'bigint' ||
    !Array.isArray(raw.consensusRanking) ||
    !Array.isArray(raw.winningWorkers) ||
    !Array.isArray(raw.consensusJudges)
  ) {
    throw new Error(
      `TaskResolved event has unexpected arg types: ${JSON.stringify(
        Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, typeof v])
        )
      )}`
    );
  }

  // Validate array element types
  for (const rank of raw.consensusRanking) {
    if (typeof rank !== 'number') {
      throw new Error(
        `TaskResolved consensusRanking contains non-number element: ${typeof rank}`
      );
    }
  }
  for (const addr of raw.winningWorkers) {
    if (typeof addr !== 'string') {
      throw new Error(
        `TaskResolved winningWorkers contains non-string element: ${typeof addr}`
      );
    }
  }
  for (const addr of raw.consensusJudges) {
    if (typeof addr !== 'string') {
      throw new Error(
        `TaskResolved consensusJudges contains non-string element: ${typeof addr}`
      );
    }
  }

  const { taskId, consensusRanking, winningWorkers, consensusJudges } = raw as {
    taskId: bigint;
    consensusRanking: readonly number[];
    winningWorkers: readonly `0x${string}`[];
    consensusJudges: readonly `0x${string}`[];
  };

  console.log(
    `Processing TaskResolved: taskId=${taskId}, ` +
    `consensusRanking=[${consensusRanking.join(',')}], ` +
    `winningWorkers=${winningWorkers.length}, consensusJudges=${consensusJudges.length}`
  );

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Update task phase to resolved
  await updateTaskPhase(task.id, 'resolved');

  // Build set of winning worker addresses for O(1) lookup
  const winnerSet = new Set(winningWorkers.map((a) => a.toLowerCase()));

  // Update submission consensus data
  // consensusRanking[i] = rank of submission at index i (0 = best)
  const { submissions } = await getSubmissionsByTaskId(task.id);
  for (const submission of submissions) {
    if (submission.submission_index != null && submission.submission_index < consensusRanking.length) {
      const rank = consensusRanking[submission.submission_index];
      const isWinner = winnerSet.has(submission.agent_address.toLowerCase());
      await updateSubmissionConsensus(
        task.id,
        submission.submission_index,
        rank,
        isWinner
      );
    }
  }

  // Update judgment consensus data
  const consensusJudgeSet = new Set(consensusJudges.map((a) => a.toLowerCase()));
  const judgments = await getJudgmentsByTask(task.id);
  for (const judgment of judgments) {
    const inConsensus = consensusJudgeSet.has(judgment.judge_address.toLowerCase());
    await updateJudgmentConsensus(task.id, judgment.judgment_index, inConsensus);
  }

  // Invalidate all related caches
  await Promise.all([
    invalidateTaskCaches(task.id),
    invalidateSubmissionCaches(task.id),
    invalidateJudgmentCaches(task.id),
    invalidatePayoutCaches(task.id),
    invalidatePhaseCaches(),
    invalidateStatsCaches(),
  ]);

  console.log(
    `Task ${taskId} resolved: ${winningWorkers.length} winning workers, ` +
    `${consensusJudges.length} consensus judges`
  );
}
