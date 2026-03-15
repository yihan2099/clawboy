import { getSupabaseClient, getSupabaseAdminClient } from '../client';
import type { TaskRow, TaskInsert, TaskUpdate } from '../schema/tasks';
import type { TaskPhase } from '@pactprotocol/shared-types';

// Use admin client for write operations (bypasses RLS)
const getWriteClient = () => getSupabaseAdminClient();

export interface ListTasksOptions {
  phase?: TaskPhase;
  creatorAddress?: string;
  tags?: string[];
  minBounty?: string;
  maxBounty?: string;
  /** Filter by bounty token address */
  bountyToken?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'bounty_amount' | 'created_at' | 'work_deadline' | 'submission_count';
  sortOrder?: 'asc' | 'desc';
}

/**
 * List tasks with filtering and pagination.
 * Uses PostgreSQL RPC function for proper numeric bounty comparison when
 * bounty filters are provided, otherwise uses standard Supabase query.
 */
export async function listTasks(options: ListTasksOptions = {}): Promise<{
  tasks: TaskRow[];
  total: number;
  /** True when total is an estimate (count RPC unavailable); pagination may be inaccurate */
  isEstimate?: boolean;
}> {
  const supabase = getSupabaseClient();
  const {
    phase,
    creatorAddress,
    tags,
    minBounty,
    maxBounty,
    bountyToken,
    limit = 20,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  // When bounty filters are provided, use RPC function for proper numeric comparison.
  // NOTE: This RPC path bypasses the Supabase query builder. Callers should use
  // getCachedTaskList() with bounty filter params for caching (TaskListKeyParams
  // supports minBounty, maxBounty, bountyToken, and tags).
  if (minBounty || maxBounty) {
    const { data, error } = await supabase.rpc('list_tasks_with_bounty_filter', {
      p_min_bounty: minBounty || null,
      p_max_bounty: maxBounty || null,
      p_phase: phase || null,
      p_creator_address: creatorAddress?.toLowerCase() || null,
      p_tags: tags && tags.length > 0 ? tags : null,
      p_limit: limit,
      p_offset: offset,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_bounty_token: bountyToken?.toLowerCase() || null,
    });

    if (error) {
      throw new Error(`Failed to list tasks: ${error.message}`);
    }

    const tasks = (data ?? []) as TaskRow[];

    const { data: countData, error: countError } = await supabase.rpc(
      'count_tasks_with_bounty_filter',
      {
        p_min_bounty: minBounty || null,
        p_max_bounty: maxBounty || null,
        p_phase: phase || null,
        p_creator_address: creatorAddress?.toLowerCase() || null,
        p_tags: tags && tags.length > 0 ? tags : null,
        p_bounty_token: bountyToken?.toLowerCase() || null,
      }
    );

    if (countError) {
      console.warn('[task-queries] count_tasks_with_bounty_filter failed:', countError.message);
      return { tasks, total: tasks.length, isEstimate: true };
    }

    return { tasks, total: (countData as number) ?? tasks.length };
  }

  // Standard query without bounty filtering
  let query = supabase.from('tasks').select('*', { count: 'exact' });

  if (phase) {
    query = query.eq('phase', phase);
  }

  if (creatorAddress) {
    query = query.eq('creator_address', creatorAddress.toLowerCase());
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  if (bountyToken) {
    query = query.eq('bounty_token', bountyToken.toLowerCase());
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return {
    tasks: (data ?? []) as TaskRow[],
    total: count ?? 0,
  };
}

/**
 * Get a task by its database ID
 */
export async function getTaskById(id: string): Promise<TaskRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data as TaskRow;
}

/**
 * Get multiple tasks by their database IDs in a single query.
 * Returns a Map for O(1) lookup by task ID.
 */
export async function getTasksByIds(ids: string[]): Promise<Map<string, TaskRow>> {
  if (ids.length === 0) return new Map();

  const supabase = getSupabaseClient();
  const uniqueIds = [...new Set(ids)];

  const { data, error } = await supabase.from('tasks').select('*').in('id', uniqueIds);

  if (error) {
    throw new Error(`Failed to get tasks by IDs: ${error.message}`);
  }

  const map = new Map<string, TaskRow>();
  for (const task of (data ?? []) as TaskRow[]) {
    map.set(task.id, task);
  }
  return map;
}

/**
 * Get a task by its on-chain task ID
 */
export async function getTaskByChainId(
  chainTaskId: string,
  chainId?: number
): Promise<TaskRow | null> {
  const supabase = getSupabaseClient();

  let query = supabase.from('tasks').select('*').eq('chain_task_id', chainTaskId);

  if (chainId !== undefined) {
    query = query.eq('chain_id', chainId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data as TaskRow | null;
}

/**
 * Create a new task
 *
 * @remarks **Admin/Indexer only** — uses the admin client which bypasses RLS.
 * This function should only be called from the indexer service. Do not call
 * from the MCP server or web app; use the indexer's event-driven flow instead.
 */
export async function createTask(task: TaskInsert): Promise<TaskRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase.from('tasks').insert(task).select().single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data as TaskRow;
}

/**
 * Update a task
 *
 * @remarks **Admin/Indexer only** — uses the admin client which bypasses RLS.
 * This function should only be called from the indexer service.
 */
export async function updateTask(id: string, updates: TaskUpdate): Promise<TaskRow> {
  const supabase = getWriteClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data as TaskRow;
}

/**
 * Get tasks by phase
 */
export async function getTasksByPhase(
  phase: string,
  limit = 20,
  offset = 0
): Promise<{ tasks: TaskRow[]; total: number }> {
  const supabase = getSupabaseClient();

  const { data, error, count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('phase', phase)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get tasks by phase: ${error.message}`);
  }

  return {
    tasks: (data ?? []) as TaskRow[],
    total: count ?? 0,
  };
}

/**
 * Update task phase
 *
 * @remarks **Admin/Indexer only** — uses the admin client which bypasses RLS.
 */
export async function updateTaskPhase(id: string, phase: string): Promise<TaskRow> {
  return updateTask(id, { phase } as TaskUpdate);
}

/**
 * Update task judgment count
 *
 * @remarks **Admin/Indexer only** — uses the admin client which bypasses RLS.
 */
export async function updateTaskJudgmentCount(
  id: string,
  judgmentCount: number
): Promise<TaskRow> {
  return updateTask(id, { judgment_count: judgmentCount } as TaskUpdate);
}

/**
 * Update task submission count
 *
 * @remarks **Admin/Indexer only** — uses the admin client which bypasses RLS.
 */
export async function updateTaskSubmissionCount(
  id: string,
  submissionCount: number
): Promise<TaskRow> {
  return updateTask(id, { submission_count: submissionCount } as TaskUpdate);
}

/**
 * Get tasks with failed IPFS fetches (for background retry)
 */
export async function getTasksWithFailedIpfs(limit = 50): Promise<TaskRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('ipfs_fetch_failed', true)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get tasks with failed IPFS: ${error.message}`);
  }

  return (data ?? []) as TaskRow[];
}
