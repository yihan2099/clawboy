import type { IndexerEvent } from '../listener';
import { createTask } from '@pactprotocol/database';
import { fetchTaskSpecification } from '@pactprotocol/ipfs-utils';
import { withRetryResult } from '../utils/retry';
import { invalidateTaskCaches } from '@pactprotocol/cache';

/**
 * Handle TaskCreated event (V2)
 * Includes IPFS retry with exponential backoff
 *
 * V2 event signature:
 *   TaskCreated(uint256 indexed taskId, address indexed creator, uint256 bounty,
 *               address bountyToken, string specCid, uint8 requiredWorkers,
 *               uint8 requiredJudges, uint256 workDeadline, uint256 judgeDeadline)
 */
export async function handleTaskCreated(event: IndexerEvent): Promise<void> {
  // Runtime validation: viem decodes event args dynamically; incorrect ABI or a chain
  // reorg could produce unexpected types. Validate before use to prevent silent errors.
  const raw = event.args;
  if (
    typeof raw.taskId !== 'bigint' ||
    typeof raw.creator !== 'string' ||
    typeof raw.bounty !== 'bigint' ||
    typeof raw.bountyToken !== 'string' ||
    typeof raw.specCid !== 'string' ||
    typeof raw.requiredWorkers !== 'number' ||
    typeof raw.requiredJudges !== 'number' ||
    typeof raw.workDeadline !== 'bigint' ||
    typeof raw.judgeDeadline !== 'bigint'
  ) {
    throw new Error(
      `TaskCreated event has unexpected arg types: ${JSON.stringify(
        Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, typeof v])
        )
      )}`
    );
  }

  const { taskId, creator, bounty, bountyToken, specCid, requiredWorkers, requiredJudges, workDeadline, judgeDeadline } = raw as {
    taskId: bigint;
    creator: `0x${string}`;
    bounty: bigint;
    bountyToken: `0x${string}`;
    specCid: string;
    requiredWorkers: number;
    requiredJudges: number;
    workDeadline: bigint;
    judgeDeadline: bigint;
  };

  console.log(`Processing TaskCreated: taskId=${taskId}, creator=${creator}`);

  // Fetch specification from IPFS with retry
  let title = 'Untitled Task';
  let description = '';
  let tags: string[] = [];
  let ipfsFetchFailed = false;

  const fetchResult = await withRetryResult(() => fetchTaskSpecification(specCid), {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    onRetry: (attempt, error, delayMs) => {
      console.warn(
        `IPFS fetch attempt ${attempt} failed for CID ${specCid}: ${error.message}. Retrying in ${delayMs}ms...`
      );
    },
  });

  if (fetchResult.success && fetchResult.data) {
    title = fetchResult.data.title;
    description = fetchResult.data.description;
    tags = fetchResult.data.tags || [];
    console.log(`Successfully fetched task spec after ${fetchResult.attempts} attempt(s)`);
  } else {
    ipfsFetchFailed = true;
    console.error(
      `Failed to fetch task spec for CID ${specCid} after ${fetchResult.attempts} attempts: ${fetchResult.error ?? 'unknown error'}`
    );
    console.warn(
      `Task ${specCid} created with placeholder values. ` +
        `IPFS retry job will attempt to backfill metadata. CID: ${specCid}`
    );
  }

  // Create task in database with V2 fields
  await createTask({
    chain_id: event.chainId,
    chain_task_id: taskId.toString(),
    creator_address: creator.toLowerCase(),
    phase: 'open',
    bounty_amount: bounty.toString(),
    bounty_token: bountyToken,
    specification_cid: specCid,
    title,
    description,
    tags,
    required_workers: requiredWorkers,
    required_judges: requiredJudges,
    deadline: workDeadline > 0n ? new Date(Number(workDeadline) * 1000).toISOString() : null,
    judge_deadline: judgeDeadline > 0n ? new Date(Number(judgeDeadline) * 1000).toISOString() : null,
    created_at_block: event.blockNumber.toString(),
    ipfs_fetch_failed: ipfsFetchFailed,
  });

  // Invalidate task list caches (new task added)
  await invalidateTaskCaches();

  console.log(
    `Task ${taskId} created in database (IPFS fetch ${ipfsFetchFailed ? 'failed' : 'succeeded'})`
  );
}
