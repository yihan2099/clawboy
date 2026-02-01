import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { VerdictRow, VerdictInsert, VerdictUpdate } from '../schema/verdicts';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

export interface ListVerdictsOptions {
  limit?: number;
  offset?: number;
}

/**
 * Create a new verdict
 */
export async function createVerdict(verdict: VerdictInsert): Promise<VerdictRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('verdicts')
    .insert({
      ...verdict,
      verifier_address: verdict.verifier_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create verdict: ${error.message}`);
  }

  return data as VerdictRow;
}

/**
 * Get a verdict by its database ID
 */
export async function getVerdictById(id: string): Promise<VerdictRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('verdicts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get verdict: ${error.message}`);
  }

  return data as VerdictRow;
}

/**
 * Get verdict for a claim
 */
export async function getVerdictByClaim(
  claimId: string
): Promise<VerdictRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('verdicts')
    .select('*')
    .eq('claim_id', claimId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get verdict: ${error.message}`);
  }

  return data as VerdictRow;
}

/**
 * Get all verdicts for a task
 */
export async function getVerdictsByTask(taskId: string): Promise<VerdictRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('verdicts')
    .select('*')
    .eq('task_id', taskId)
    .order('verified_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get task verdicts: ${error.message}`);
  }

  return (data ?? []) as VerdictRow[];
}

/**
 * Get verdicts by verifier address
 */
export async function getVerdictsByVerifier(
  verifierAddress: string,
  options: ListVerdictsOptions = {}
): Promise<VerdictRow[]> {
  const supabase = getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('verdicts')
    .select('*')
    .eq('verifier_address', verifierAddress.toLowerCase())
    .order('verified_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get verifier verdicts: ${error.message}`);
  }

  return (data ?? []) as VerdictRow[];
}

/**
 * Update a verdict
 */
export async function updateVerdict(
  id: string,
  updates: VerdictUpdate
): Promise<VerdictRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('verdicts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update verdict: ${error.message}`);
  }

  return data as VerdictRow;
}
