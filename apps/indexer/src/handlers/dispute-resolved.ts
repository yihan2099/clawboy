import type { IndexerEvent } from '../listener';
import {
  getDisputeByChainId,
  updateDispute,
  incrementDisputesWon,
  incrementDisputesLost,
} from '@pactprotocol/database';
import { invalidateDisputeCaches, invalidateAgentCaches } from '@pactprotocol/cache';

/**
 * Handle DisputeResolved event
 * The dispute voting has concluded and outcome determined
 * Uses atomic increment operations to avoid N+1 queries and race conditions
 */
export async function handleDisputeResolved(event: IndexerEvent): Promise<void> {
  const { disputeId, disputerWon, votesFor, votesAgainst } = event.args as {
    disputeId: bigint;
    taskId: bigint;
    disputerWon: boolean;
    votesFor: bigint;
    votesAgainst: bigint;
  };

  console.log(`Processing DisputeResolved: disputeId=${disputeId}, disputerWon=${disputerWon}`);

  // Find dispute in database
  const dispute = await getDisputeByChainId(disputeId.toString());
  if (!dispute) {
    // Throw error so event goes to DLQ for retry (dispute may be created by pending DisputeCreated event)
    throw new Error(`Dispute ${disputeId} not found in database`);
  }

  // Update dispute record
  await updateDispute(dispute.id, {
    status: 'resolved',
    disputer_won: disputerWon,
    votes_for_disputer: votesFor.toString(),
    votes_against_disputer: votesAgainst.toString(),
    resolved_at: new Date().toISOString(),
  });

  // Update disputer's stats atomically (avoids N+1 query and race conditions)
  try {
    if (disputerWon) {
      await incrementDisputesWon(dispute.disputer_address);
    } else {
      await incrementDisputesLost(dispute.disputer_address);
    }
    console.log(
      `Updated disputes ${disputerWon ? 'won' : 'lost'} for agent ${dispute.disputer_address}`
    );
  } catch (error) {
    // Log at error level (not warn) because agent stats failure is a data integrity issue:
    // the dispute is resolved on-chain but the agent's win/loss record is now incorrect.
    // This does not fail the event (the core dispute update succeeded) but should be
    // investigated and corrected — e.g. by replaying the event or running a stats repair job.
    // Common cause: agent not yet registered in the database (race with AgentRegistered event).
    console.error(
      `[dispute-resolved] Failed to update agent stats for ${dispute.disputer_address} ` +
        `(dispute ${disputeId}, disputerWon=${disputerWon}): ${error}`
    );
  }

  // Invalidate relevant caches
  await Promise.all([
    invalidateDisputeCaches(dispute.id),
    invalidateAgentCaches(dispute.disputer_address),
  ]);

  console.log(
    `Dispute ${disputeId} resolved: disputer ${disputerWon ? 'won' : 'lost'} (votes: ${votesFor} for, ${votesAgainst} against)`
  );
}
