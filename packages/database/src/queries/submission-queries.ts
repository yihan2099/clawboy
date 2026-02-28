import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { SubmissionRow, SubmissionInsert, SubmissionUpdate } from '../schema/submissions';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

/**
 * Get submissions for a task
 */
export async function getSubmissionsByTaskId(
  taskId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ submissions: SubmissionRow[]; total: number }> {
  const supabase = getSupabaseClient();
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact' })
    .eq('task_id', taskId)
    .order('submission_index', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get submissions: ${error.message}`);
  }

  return {
    submissions: (data ?? []) as SubmissionRow[],
    total: count ?? 0,
  };
}

/**
 * Get a submission by task and agent
 */
export async function getSubmissionByTaskAndAgent(
  taskId: string,
  agentAddress: string
): Promise<SubmissionRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('agent_address', agentAddress.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get submission: ${error.message}`);
  }

  return data as SubmissionRow;
}

/**
 * Get the winning submission for a task
 */
export async function getWinningSubmission(taskId: string): Promise<SubmissionRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('is_winner', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get winning submission: ${error.message}`);
  }

  return data as SubmissionRow;
}

/**
 * Get all submissions by an agent
 */
export async function getSubmissionsByAgent(
  agentAddress: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ submissions: SubmissionRow[]; total: number }> {
  const supabase = getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact' })
    .eq('agent_address', agentAddress.toLowerCase())
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get submissions: ${error.message}`);
  }

  return {
    submissions: (data ?? []) as SubmissionRow[],
    total: count ?? 0,
  };
}

/**
 * Create a new submission
 */
export async function createSubmission(submission: SubmissionInsert): Promise<SubmissionRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      ...submission,
      agent_address: submission.agent_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create submission: ${error.message}`);
  }

  return data as SubmissionRow;
}

/**
 * Update a submission
 */
export async function updateSubmission(
  id: string,
  updates: SubmissionUpdate
): Promise<SubmissionRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('submissions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update submission: ${error.message}`);
  }

  return data as SubmissionRow;
}

/**
 * Mark a submission as winner (atomic operation)
 * Uses a single UPDATE with CASE to avoid race conditions
 *
 * @remarks
 * The primary path calls the `mark_submission_winner` RPC function which is atomic.
 * If the RPC function is absent (error code 42883) a two-step UPDATE fallback is used.
 *
 * @deprecated **Fallback path only** — the two-step UPDATE fallback inside this function
 * has a TOCTOU race window: two concurrent calls can both clear existing winners and then
 * both set their own winner, leaving the task in an inconsistent state. Deploy migration
 * `20250228000002_mark_submission_winner_atomic.sql` to eliminate the fallback entirely.
 * Once the RPC function exists in all environments, the fallback block can be removed.
 */
export async function markSubmissionAsWinner(
  taskId: string,
  agentAddress: string
): Promise<SubmissionRow> {
  const supabase = getWriteClient();
  const normalizedAddress = agentAddress.toLowerCase();

  // First attempt: try the atomic RPC function if available
  const { error: rpcError } = await supabase.rpc('mark_submission_winner', {
    p_task_id: taskId,
    p_agent_address: normalizedAddress,
  });

  // If RPC doesn't exist, fall back to two-step (less ideal: has a race window between
  // the two UPDATE statements). Deploy migration 20250228000002 to eliminate this race.
  if (rpcError && rpcError.code === '42883') {
    // Function doesn't exist, use fallback
    // Clear existing winners and set new winner in sequence
    await supabase.from('submissions').update({ is_winner: false }).eq('task_id', taskId);

    const { data, error } = await supabase
      .from('submissions')
      .update({ is_winner: true, updated_at: new Date().toISOString() })
      .eq('task_id', taskId)
      .eq('agent_address', normalizedAddress)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark winner: ${error.message}`);
    }

    return data as SubmissionRow;
  } else if (rpcError) {
    throw new Error(`Failed to mark winner: ${rpcError.message}`);
  }

  // Fetch the updated submission
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('agent_address', normalizedAddress)
    .single();

  if (error) {
    throw new Error(`Failed to fetch winner submission: ${error.message}`);
  }

  return data as SubmissionRow;
}
