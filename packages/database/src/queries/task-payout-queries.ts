import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { TaskPayoutRow, TaskPayoutInsert } from '../schema/judgments';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

/**
 * Create a new task payout record
 */
export async function createTaskPayout(payout: TaskPayoutInsert): Promise<TaskPayoutRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('task_payouts')
    .insert({
      ...payout,
      recipient_address: payout.recipient_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task payout: ${error.message}`);
  }

  return data as TaskPayoutRow;
}

/**
 * Get payouts for a task
 */
export async function getPayoutsByTask(taskId: string): Promise<TaskPayoutRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('task_payouts')
    .select('*')
    .eq('task_id', taskId)
    .order('consensus_rank', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to get payouts: ${error.message}`);
  }

  return (data ?? []) as TaskPayoutRow[];
}

/**
 * Get payouts for a recipient
 */
export async function getPayoutsByRecipient(
  recipientAddress: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ payouts: TaskPayoutRow[]; total: number }> {
  const supabase = getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('task_payouts')
    .select('*', { count: 'exact' })
    .eq('recipient_address', recipientAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get payouts: ${error.message}`);
  }

  return {
    payouts: (data ?? []) as TaskPayoutRow[],
    total: count ?? 0,
  };
}
