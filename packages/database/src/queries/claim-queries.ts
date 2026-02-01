import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { ClaimRow, ClaimInsert, ClaimUpdate } from '../schema/claims';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

export interface ListClaimsOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new claim
 */
export async function createClaim(claim: ClaimInsert): Promise<ClaimRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('claims')
    .insert({
      ...claim,
      agent_address: claim.agent_address.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create claim: ${error.message}`);
  }

  return data as ClaimRow;
}

/**
 * Get a claim by its database ID
 */
export async function getClaimById(id: string): Promise<ClaimRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get claim: ${error.message}`);
  }

  return data as ClaimRow;
}

/**
 * Get a claim by task ID and agent address
 */
export async function getClaimByTaskAndAgent(
  taskId: string,
  agentAddress: string
): Promise<ClaimRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('task_id', taskId)
    .eq('agent_address', agentAddress.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get claim: ${error.message}`);
  }

  return data as ClaimRow;
}

/**
 * Get claims for an agent with optional filtering
 */
export async function getClaimsByAgent(
  agentAddress: string,
  options: ListClaimsOptions = {}
): Promise<ClaimRow[]> {
  const supabase = getSupabaseClient();
  const { status, limit = 20, offset = 0 } = options;

  let query = supabase
    .from('claims')
    .select('*')
    .eq('agent_address', agentAddress.toLowerCase());

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('claimed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get agent claims: ${error.message}`);
  }

  return (data ?? []) as ClaimRow[];
}

/**
 * Get all claims for a task
 */
export async function getClaimsByTask(taskId: string): Promise<ClaimRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('task_id', taskId)
    .order('claimed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get task claims: ${error.message}`);
  }

  return (data ?? []) as ClaimRow[];
}

/**
 * Update a claim
 */
export async function updateClaim(
  id: string,
  updates: ClaimUpdate
): Promise<ClaimRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('claims')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update claim: ${error.message}`);
  }

  return data as ClaimRow;
}

/**
 * Get active claim for a task (if any)
 */
export async function getActiveClaimForTask(
  taskId: string
): Promise<ClaimRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('task_id', taskId)
    .in('status', ['active', 'submitted', 'under_verification'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get active claim: ${error.message}`);
  }

  return data as ClaimRow;
}
