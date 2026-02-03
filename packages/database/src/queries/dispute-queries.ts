import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type {
  DisputeRow,
  DisputeInsert,
  DisputeUpdate,
  DisputeVoteRow,
  DisputeVoteInsert,
} from '../schema/disputes';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

/**
 * Get a dispute by its database ID
 */
export async function getDisputeById(id: string): Promise<DisputeRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('disputes').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get dispute: ${error.message}`);
  }

  return data as DisputeRow;
}

/**
 * Get a dispute by its on-chain dispute ID
 */
export async function getDisputeByChainId(chainDisputeId: string): Promise<DisputeRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('chain_dispute_id', chainDisputeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get dispute: ${error.message}`);
  }

  return data as DisputeRow;
}

/**
 * Get the dispute for a task
 */
export async function getDisputeByTaskId(taskId: string): Promise<DisputeRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('task_id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get dispute: ${error.message}`);
  }

  return data as DisputeRow;
}

/**
 * List active disputes
 */
export async function listActiveDisputes(
  options: { limit?: number; offset?: number } = {}
): Promise<{ disputes: DisputeRow[]; total: number }> {
  const supabase = getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('disputes')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('voting_deadline', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list disputes: ${error.message}`);
  }

  return {
    disputes: (data ?? []) as DisputeRow[],
    total: count ?? 0,
  };
}

/**
 * Get disputes ready for resolution (past voting deadline)
 */
export async function getDisputesReadyForResolution(): Promise<DisputeRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('status', 'active')
    .lte('voting_deadline', new Date().toISOString());

  if (error) {
    throw new Error(`Failed to get disputes ready for resolution: ${error.message}`);
  }

  return (data ?? []) as DisputeRow[];
}

/**
 * Create a new dispute
 */
export async function createDispute(dispute: DisputeInsert): Promise<DisputeRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      ...dispute,
      disputer_address: dispute.disputer_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dispute: ${error.message}`);
  }

  return data as DisputeRow;
}

/**
 * Update a dispute
 */
export async function updateDispute(id: string, updates: DisputeUpdate): Promise<DisputeRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('disputes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update dispute: ${error.message}`);
  }

  return data as DisputeRow;
}

// ============ Dispute Votes ============

/**
 * Get all votes for a dispute
 */
export async function getDisputeVotes(disputeId: string): Promise<DisputeVoteRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('dispute_votes')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('voted_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get dispute votes: ${error.message}`);
  }

  return (data ?? []) as DisputeVoteRow[];
}

/**
 * Get a vote by dispute and voter
 */
export async function getDisputeVote(
  disputeId: string,
  voterAddress: string
): Promise<DisputeVoteRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('dispute_votes')
    .select('*')
    .eq('dispute_id', disputeId)
    .eq('voter_address', voterAddress.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get dispute vote: ${error.message}`);
  }

  return data as DisputeVoteRow;
}

/**
 * Check if a voter has voted on a dispute
 */
export async function hasVoted(disputeId: string, voterAddress: string): Promise<boolean> {
  const vote = await getDisputeVote(disputeId, voterAddress);
  return vote !== null;
}

/**
 * Create a new dispute vote
 */
export async function createDisputeVote(vote: DisputeVoteInsert): Promise<DisputeVoteRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('dispute_votes')
    .insert({
      ...vote,
      voter_address: vote.voter_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dispute vote: ${error.message}`);
  }

  return data as DisputeVoteRow;
}

/**
 * Get all votes by a voter across all disputes
 */
export async function getVotesByVoter(
  voterAddress: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ votes: DisputeVoteRow[]; total: number }> {
  const supabase = getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('dispute_votes')
    .select('*', { count: 'exact' })
    .eq('voter_address', voterAddress.toLowerCase())
    .order('voted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get votes: ${error.message}`);
  }

  return {
    votes: (data ?? []) as DisputeVoteRow[],
    total: count ?? 0,
  };
}
