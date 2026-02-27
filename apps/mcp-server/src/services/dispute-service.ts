import { getSupabaseClient, getDisputesReadyForResolution } from '@pactprotocol/database';
import { getDisputeByChainId, getDisputeVotes } from '@pactprotocol/database';
import { getCachedDisputeList, getCachedDispute } from '@pactprotocol/cache/helpers';
import type { DisputeStatus } from '@pactprotocol/shared-types';
import { sanitizeErrorMessage } from '../utils/error-sanitizer';

export interface ListDisputesInput {
  status: 'active' | 'resolved' | 'all';
  taskId?: string;
  limit: number;
  offset: number;
}

export interface DisputeItem {
  id: string;
  chainDisputeId: string;
  taskId: string;
  disputerAddress: string;
  disputeStake: string;
  votingDeadline: string;
  status: DisputeStatus;
  disputerWon: boolean | null;
  votesForDisputer: number;
  votesAgainstDisputer: number;
  createdAt: string;
  canBeResolved: boolean;
}

export async function listDisputesHandler(input: ListDisputesInput) {
  const { data } = await getCachedDisputeList<DisputeItem>(
    {
      status: input.status !== 'all' ? input.status : undefined,
      taskId: input.taskId,
      limit: input.limit,
      offset: input.offset,
    },
    async () => {
      const supabase = getSupabaseClient();

      // Build query
      let query = supabase.from('disputes').select('*', { count: 'exact' });

      // Apply status filter
      if (input.status === 'active') {
        query = query.eq('status', 'active');
      } else if (input.status === 'resolved') {
        query = query.eq('status', 'resolved');
      }

      // Apply task filter
      if (input.taskId) {
        query = query.eq('task_id', input.taskId);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list disputes: ${sanitizeErrorMessage(error)}`);
      }

      // Get disputes ready for resolution
      const readyForResolution = await getDisputesReadyForResolution();
      const readyIds = new Set(readyForResolution.map((d) => d.id));

      const disputes: DisputeItem[] = (data ?? []).map((d) => ({
        id: d.id,
        chainDisputeId: d.chain_dispute_id,
        taskId: d.task_id,
        disputerAddress: d.disputer_address,
        disputeStake: d.dispute_stake,
        votingDeadline: d.voting_deadline,
        status: d.status as DisputeStatus,
        disputerWon: d.disputer_won,
        votesForDisputer: d.votes_for_disputer,
        votesAgainstDisputer: d.votes_against_disputer,
        createdAt: d.created_at,
        canBeResolved: readyIds.has(d.id),
      }));

      return {
        disputes,
        total: count ?? 0,
        readyForResolutionCount: readyForResolution.length,
      };
    }
  );

  return {
    disputes: data.disputes,
    pagination: {
      total: data.total,
      limit: input.limit,
      offset: input.offset,
      hasMore: data.total > input.offset + input.limit,
    },
    readyForResolutionCount: data.readyForResolutionCount,
  };
}

export interface GetDisputeInput {
  disputeId: string;
}

export async function getDisputeHandler(input: GetDisputeInput) {
  const dispute = await getDisputeByChainId(input.disputeId);

  if (!dispute) {
    throw new Error(`Dispute not found: ${input.disputeId}`);
  }

  const { data } = await getCachedDispute(dispute.id, async () => {
    // Fetch votes for this dispute
    const votes = await getDisputeVotes(dispute.id);

    // Calculate time remaining if active
    const now = new Date();
    const votingDeadline = new Date(dispute.voting_deadline);
    const isActive = dispute.status === 'active';
    const timeRemaining = isActive ? Math.max(0, votingDeadline.getTime() - now.getTime()) : 0;

    return {
      dispute: {
        id: dispute.id,
        chainDisputeId: dispute.chain_dispute_id,
        taskId: dispute.task_id,
        disputerAddress: dispute.disputer_address,
        disputeStake: dispute.dispute_stake,
        votingDeadline: dispute.voting_deadline,
        status: dispute.status as DisputeStatus,
        disputerWon: dispute.disputer_won,
        votesForDisputer: dispute.votes_for_disputer,
        votesAgainstDisputer: dispute.votes_against_disputer,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
      },
      votes: votes.map((v) => ({
        voterAddress: v.voter_address,
        supportsDisputer: v.supports_disputer,
        weight: v.vote_weight,
        votedAt: v.voted_at,
      })),
      summary: {
        totalVotes: votes.length,
        totalWeightFor: dispute.votes_for_disputer,
        totalWeightAgainst: dispute.votes_against_disputer,
        isActive,
        timeRemainingMs: timeRemaining,
        canBeResolved: isActive && now >= votingDeadline,
      },
    };
  });

  return data;
}
