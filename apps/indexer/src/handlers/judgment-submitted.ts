import type { IndexerEvent } from '../listener';
import {
  getTaskByChainId,
  createJudgment,
  hasJudgedTask,
  updateTaskJudgmentCount,
} from '@pactprotocol/database';
import { invalidateJudgmentCaches, invalidateTaskCaches } from '@pactprotocol/cache';

/**
 * Handle JudgmentSubmitted event (V2)
 *
 * V2 event signature:
 *   JudgmentSubmitted(uint256 indexed taskId, address indexed judge, uint8 judgmentIndex)
 *
 * Note: The event does not include the ranking array (to save gas). The ranking
 * is stored on-chain and can be read via the contract's getJudgment() view function.
 * For the indexer, we record the judgment metadata; the full ranking is fetched
 * on-demand by the MCP server or web app.
 */
export async function handleJudgmentSubmitted(event: IndexerEvent): Promise<void> {
  const { taskId, judge, judgmentIndex } = event.args as {
    taskId: bigint;
    judge: `0x${string}`;
    judgmentIndex: number;
  };

  console.log(
    `Processing JudgmentSubmitted: taskId=${taskId}, judge=${judge}, judgmentIndex=${judgmentIndex}`
  );

  // Find task in database
  const task = await getTaskByChainId(taskId.toString(), event.chainId);
  if (!task) {
    throw new Error(`Task ${taskId} (chain: ${event.chainId}) not found in database`);
  }

  // Idempotency check: skip if judge already recorded for this task
  const alreadyJudged = await hasJudgedTask(task.id, judge.toLowerCase());
  if (alreadyJudged) {
    console.log(`Judge ${judge} already recorded for task ${taskId}, skipping`);
    return;
  }

  // Create judgment record (ranking is empty here; will be populated when TaskResolved
  // fires with full consensus data, or on-demand via contract read)
  await createJudgment({
    task_id: task.id,
    judge_address: judge.toLowerCase(),
    judgment_index: judgmentIndex,
    ranking: [], // Will be backfilled on TaskResolved or on-demand
    submitted_at: new Date().toISOString(),
  });

  // Update task judgment count
  const newCount = judgmentIndex + 1; // judgmentIndex is 0-based
  await updateTaskJudgmentCount(task.id, newCount);

  // Invalidate relevant caches
  await Promise.all([
    invalidateJudgmentCaches(task.id),
    invalidateTaskCaches(task.id), // Task judgment count changed
  ]);

  console.log(`Judgment ${judgmentIndex} recorded for task ${taskId} by judge ${judge}`);
}
