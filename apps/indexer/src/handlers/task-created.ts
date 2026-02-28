import type { IndexerEvent } from '../listener';
import { createTask } from '@pactprotocol/database';
import { fetchTaskSpecification } from '@pactprotocol/ipfs-utils';
import { withRetryResult } from '../utils/retry';
import { invalidateTaskCaches } from '@pactprotocol/cache';

/**
 * Handle TaskCreated event
 * Includes IPFS retry with exponential backoff
 */
export async function handleTaskCreated(event: IndexerEvent): Promise<void> {
  // Runtime validation: viem decodes event args dynamically; incorrect ABI or a chain
  // reorg could produce unexpected types. Validate before use to prevent silent errors.
  const raw = event.args;
  if (
    typeof raw.taskId !== 'bigint' ||
    typeof raw.creator !== 'string' ||
    typeof raw.bountyAmount !== 'bigint' ||
    typeof raw.bountyToken !== 'string' ||
    typeof raw.specificationCid !== 'string' ||
    typeof raw.deadline !== 'bigint'
  ) {
    throw new Error(
      `TaskCreated event has unexpected arg types: ${JSON.stringify(
        Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, typeof v])
        )
      )}`
    );
  }

  const { taskId, creator, bountyAmount, bountyToken, specificationCid, deadline } = raw as {
    taskId: bigint;
    creator: `0x${string}`;
    bountyAmount: bigint;
    bountyToken: `0x${string}`;
    specificationCid: string;
    deadline: bigint;
  };

  console.log(`Processing TaskCreated: taskId=${taskId}, creator=${creator}`);

  // Fetch specification from IPFS with retry
  let title = 'Untitled Task';
  let description = '';
  let tags: string[] = [];
  let ipfsFetchFailed = false;

  const fetchResult = await withRetryResult(() => fetchTaskSpecification(specificationCid), {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    onRetry: (attempt, error, delayMs) => {
      console.warn(
        `IPFS fetch attempt ${attempt} failed for CID ${specificationCid}: ${error.message}. Retrying in ${delayMs}ms...`
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
      `Failed to fetch task spec for CID ${specificationCid} after ${fetchResult.attempts} attempts: ${fetchResult.error ?? 'unknown error'}`
    );
    // Non-silent failure: task is recorded with ipfs_fetch_failed=true.
    // The IPFS retry job (startIpfsRetryJob in index.ts) will periodically
    // re-attempt to fetch and backfill title/description/tags for failed tasks.
    //
    // TODO: Replace the polling-based IPFS retry job with a dedicated retry queue
    // (e.g. BullMQ or Upstash Workflow) that supports per-item max-age alerting and
    // dead-letter visibility so operators are notified when a CID is persistently
    // unfetchable (e.g. unpinned or invalid CID).
    console.warn(
      `Task ${specificationCid} created with placeholder values. ` +
        `IPFS retry job will attempt to backfill metadata. CID: ${specificationCid}`
    );
  }

  // Create task in database
  await createTask({
    chain_id: event.chainId,
    chain_task_id: taskId.toString(),
    creator_address: creator.toLowerCase(),
    status: 'open',
    bounty_amount: bountyAmount.toString(),
    bounty_token: bountyToken,
    specification_cid: specificationCid,
    title,
    description,
    tags,
    deadline: deadline > 0n ? new Date(Number(deadline) * 1000).toISOString() : null,
    created_at_block: event.blockNumber.toString(),
    ipfs_fetch_failed: ipfsFetchFailed,
  });

  // Invalidate task list caches (new task added)
  await invalidateTaskCaches();

  console.log(
    `Task ${taskId} created in database (IPFS fetch ${ipfsFetchFailed ? 'failed' : 'succeeded'})`
  );
}
