import type { IndexerEvent } from '../listener';
import { getDisputeByChainId, createDisputeVote } from '@clawboy/database';
import { invalidateDisputeCaches } from '@clawboy/cache';

/**
 * Handle VoteSubmitted event
 * A voter has submitted their vote on a dispute
 */
export async function handleVoteSubmitted(event: IndexerEvent): Promise<void> {
  const { disputeId, voter, supportsDisputer, weight } = event.args as {
    disputeId: bigint;
    voter: `0x${string}`;
    supportsDisputer: boolean;
    weight: bigint;
  };

  console.log(
    `Processing VoteSubmitted: disputeId=${disputeId}, voter=${voter}, supports=${supportsDisputer}`
  );

  // Find dispute in database
  const dispute = await getDisputeByChainId(disputeId.toString());
  if (!dispute) {
    // Throw error so event goes to DLQ for retry (dispute may be created by pending DisputeStarted event)
    throw new Error(`Dispute ${disputeId} not found in database`);
  }

  // Create vote record
  await createDisputeVote({
    dispute_id: dispute.id,
    voter_address: voter.toLowerCase(),
    supports_disputer: supportsDisputer,
    weight: Number(weight),
    tx_hash: event.transactionHash,
    voted_at: new Date().toISOString(),
  });

  // Invalidate dispute caches (vote counts changed)
  await invalidateDisputeCaches(dispute.id);

  console.log(
    `Vote submitted for dispute ${disputeId} by ${voter}, weight: ${weight}, supports disputer: ${supportsDisputer}`
  );
}
