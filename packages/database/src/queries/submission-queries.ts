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
export async function getWinningSubmission(
  taskId: string
): Promise<SubmissionRow | null> {
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
export async function createSubmission(
  submission: SubmissionInsert
): Promise<SubmissionRow> {
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
 * Mark a submission as winner
 */
export async function markSubmissionAsWinner(
  taskId: string,
  agentAddress: string
): Promise<SubmissionRow> {
  const supabase = getWriteClient();

  // First, clear any existing winner for this task
  await supabase
    .from('submissions')
    .update({ is_winner: false })
    .eq('task_id', taskId);

  // Then mark the new winner
  const { data, error } = await supabase
    .from('submissions')
    .update({ is_winner: true, updated_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('agent_address', agentAddress.toLowerCase())
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark winner: ${error.message}`);
  }

  return data as SubmissionRow;
}
