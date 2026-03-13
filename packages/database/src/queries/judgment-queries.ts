import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { JudgmentRow, JudgmentInsert } from '../schema/judgments';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

/**
 * Create a new judgment
 */
export async function createJudgment(judgment: JudgmentInsert): Promise<JudgmentRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('judgments')
    .insert({
      ...judgment,
      judge_address: judgment.judge_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create judgment: ${error.message}`);
  }

  return data as JudgmentRow;
}

/**
 * Check if a judge has already judged a task
 */
export async function hasJudgedTask(
  taskId: string,
  judgeAddress: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('judgments')
    .select('id')
    .eq('task_id', taskId)
    .eq('judge_address', judgeAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check judgment: ${error.message}`);
  }

  return data !== null;
}

/**
 * Get judgments for a task
 */
export async function getJudgmentsByTask(taskId: string): Promise<JudgmentRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('judgments')
    .select('*')
    .eq('task_id', taskId)
    .order('judgment_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to get judgments: ${error.message}`);
  }

  return (data ?? []) as JudgmentRow[];
}

/**
 * Update judgment ranking array (backfill from on-chain data)
 */
export async function updateJudgmentRanking(
  taskId: string,
  judgmentIndex: number,
  ranking: number[]
): Promise<JudgmentRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('judgments')
    .update({
      ranking,
      updated_at: new Date().toISOString(),
    })
    .eq('task_id', taskId)
    .eq('judgment_index', judgmentIndex)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update judgment ranking: ${error.message}`);
  }

  return data as JudgmentRow;
}

/**
 * Update judgment consensus status after resolution
 */
export async function updateJudgmentConsensus(
  taskId: string,
  judgmentIndex: number,
  inConsensus: boolean
): Promise<JudgmentRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('judgments')
    .update({
      in_consensus: inConsensus,
      updated_at: new Date().toISOString(),
    })
    .eq('task_id', taskId)
    .eq('judgment_index', judgmentIndex)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update judgment consensus: ${error.message}`);
  }

  return data as JudgmentRow;
}
