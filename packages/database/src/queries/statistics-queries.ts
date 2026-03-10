import { getSupabaseClient } from '../client';
import type { TaskRow } from '../schema/tasks';
import type { SubmissionRow } from '../schema/submissions';

/**
 * Tag statistics for displaying category breakdown
 */
export interface TagStatistic {
  tag: string;
  count: number;
}

/**
 * Featured completed task with details for showcase
 */
export interface FeaturedTask {
  id: string;
  title: string;
  description: string;
  tags: string[];
  bounty_amount: string;
  created_at: string;
}

/**
 * Bounty distribution statistics
 */
export interface BountyStatistics {
  minBounty: string;
  maxBounty: string;
  avgBounty: string;
}

export interface PlatformStatistics {
  totalTasks: number;
  openTasks: number;
  resolvedTasks: number;
  failedTasks: number;
  bountyDistributed: string; // wei string for precision
  bountyAvailable: string; // wei string - sum of open task bounties
  registeredAgents: number;
  totalSubmissions: number;
  avgCompletionHours: number | null; // average hours from creation to resolution
}

/**
 * Get platform-wide statistics for display on the landing page.
 * Runs parallel queries for efficiency.
 */
export async function getPlatformStatistics(): Promise<PlatformStatistics> {
  const supabase = getSupabaseClient();

  const [
    totalTasksResult,
    openTasksResult,
    resolvedTasksResult,
    failedTasksResult,
    bountyDistributedResult,
    bountyAvailableResult,
    agentsResult,
    submissionsResult,
    resolvedTasksForAvgResult,
  ] = await Promise.all([
    // Total tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    // Open tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('phase', 'open'),
    // Resolved tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('phase', 'resolved'),
    // Failed tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('phase', 'failed'),
    // Sum of bounties from resolved tasks (using RPC for precision)
    supabase.rpc('sum_completed_bounties'),
    // Sum of bounties from open tasks (using RPC for precision)
    supabase.rpc('sum_open_bounties'),
    // Total agents
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    // Total submissions
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    // Resolved tasks with timestamps for avg calculation
    supabase
      .from('tasks')
      .select('created_at, updated_at')
      .eq('phase', 'resolved')
      .not('updated_at', 'is', null),
  ]);

  // Check for errors
  if (totalTasksResult.error) {
    throw new Error(`Failed to get total tasks: ${totalTasksResult.error.message}`);
  }
  if (openTasksResult.error) {
    throw new Error(`Failed to get open tasks: ${openTasksResult.error.message}`);
  }
  if (resolvedTasksResult.error) {
    throw new Error(`Failed to get resolved tasks: ${resolvedTasksResult.error.message}`);
  }
  if (failedTasksResult.error) {
    throw new Error(`Failed to get failed tasks: ${failedTasksResult.error.message}`);
  }
  if (bountyDistributedResult.error) {
    throw new Error(`Failed to get bounty distributed: ${bountyDistributedResult.error.message}`);
  }
  if (bountyAvailableResult.error) {
    throw new Error(`Failed to get bounty available: ${bountyAvailableResult.error.message}`);
  }
  if (agentsResult.error) {
    throw new Error(`Failed to get agents count: ${agentsResult.error.message}`);
  }
  if (submissionsResult.error) {
    throw new Error(`Failed to get submissions count: ${submissionsResult.error.message}`);
  }

  // Calculate average completion time in hours
  let avgCompletionHours: number | null = null;
  if (!resolvedTasksForAvgResult.error && resolvedTasksForAvgResult.data) {
    const tasks = resolvedTasksForAvgResult.data as Array<{
      created_at: string;
      updated_at: string;
    }>;
    if (tasks.length > 0) {
      const totalHours = tasks.reduce((sum, task) => {
        const created = new Date(task.created_at).getTime();
        const resolved = new Date(task.updated_at).getTime();
        const hours = (resolved - created) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgCompletionHours = Math.round((totalHours / tasks.length) * 10) / 10; // 1 decimal place
    }
  }

  return {
    totalTasks: totalTasksResult.count ?? 0,
    openTasks: openTasksResult.count ?? 0,
    resolvedTasks: resolvedTasksResult.count ?? 0,
    failedTasks: failedTasksResult.count ?? 0,
    bountyDistributed: (bountyDistributedResult.data as string) ?? '0',
    bountyAvailable: (bountyAvailableResult.data as string) ?? '0',
    registeredAgents: agentsResult.count ?? 0,
    totalSubmissions: submissionsResult.count ?? 0,
    avgCompletionHours,
  };
}

/**
 * Get recent open tasks for display on the landing page.
 */
export async function getRecentOpenTasks(limit = 5): Promise<TaskRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('phase', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent open tasks: ${error.message}`);
  }

  return (data ?? []) as TaskRow[];
}

/**
 * Submission with associated task information
 */
export interface SubmissionWithTask extends SubmissionRow {
  task: Pick<TaskRow, 'title' | 'bounty_amount' | 'phase'> | null;
}

/**
 * Get recent submissions with task info for display on the landing page.
 */
export async function getRecentSubmissions(limit = 5): Promise<SubmissionWithTask[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
      *,
      task:tasks!task_id (
        title,
        bounty_amount,
        phase
      )
    `
    )
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent submissions: ${error.message}`);
  }

  return (data ?? []) as SubmissionWithTask[];
}

/**
 * Detailed task info for the mini dashboard
 */
export interface DetailedTask {
  id: string;
  chain_task_id: string;
  title: string;
  description: string;
  phase: string;
  bounty_amount: string;
  bounty_token: string;
  creator_address: string;
  specification_cid: string;
  tags: string[];
  deadline: string | null;
  judge_deadline: string | null;
  submission_count: number;
  judgment_count: number;
  required_workers: number;
  required_judges: number;
  created_at: string;
}

/**
 * Get detailed tasks for the mini dashboard.
 * Returns recent tasks with full details for display.
 */
export async function getDetailedTasks(limit = 3): Promise<DetailedTask[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, chain_task_id, title, description, phase, bounty_amount, bounty_token, creator_address, specification_cid, tags, deadline, judge_deadline, submission_count, judgment_count, required_workers, required_judges, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get detailed tasks: ${error.message}`);
  }

  return (data ?? []) as DetailedTask[];
}

/**
 * Get tag statistics - count of tasks per tag for category breakdown.
 * Returns top N tags by task count.
 *
 * Uses the `get_tag_statistics` PostgreSQL RPC function which performs
 * unnest() aggregation in the database to avoid fetching all tasks into memory.
 * Falls back to in-memory aggregation if the RPC function is not available.
 */
export async function getTagStatistics(limit = 6): Promise<TagStatistic[]> {
  const supabase = getSupabaseClient();

  // Prefer database-level aggregation via RPC to avoid OOM on large datasets
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_tag_statistics', {
    p_limit: limit,
  });

  if (!rpcError && rpcData) {
    return (rpcData as Array<{ tag: string; count: number }>).map((row) => ({
      tag: row.tag,
      count: Number(row.count),
    }));
  }

  // Fallback: in-memory aggregation (less efficient, use only if RPC unavailable)
  if (rpcError && rpcError.code !== '42883') {
    // Non-PGRST116 error: unexpected failure
    throw new Error(`Failed to get tag statistics: ${rpcError.message}`);
  }

  const { data, error } = await supabase.from('tasks').select('tags').not('tags', 'is', null);

  if (error) {
    throw new Error(`Failed to get tag statistics: ${error.message}`);
  }

  // Aggregate tag counts
  const tagCounts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.tags && Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  // Sort by count descending and take top N
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));

  return sortedTags;
}

/**
 * Get recently resolved tasks for the featured showcase.
 */
export async function getFeaturedCompletedTasks(limit = 3): Promise<FeaturedTask[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, tags, bounty_amount, created_at')
    .eq('phase', 'resolved')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get featured completed tasks: ${error.message}`);
  }

  return (data ?? []) as FeaturedTask[];
}

/**
 * Get bounty distribution statistics (min, max, avg).
 *
 * Uses the `get_bounty_statistics` PostgreSQL RPC function which performs
 * MIN/MAX/AVG aggregation in the database to avoid fetching all bounty amounts
 * into memory for BigInt conversion (OOM risk with large datasets).
 * Falls back to in-memory calculation if the RPC function is not available.
 */
export async function getBountyStatistics(): Promise<BountyStatistics> {
  const supabase = getSupabaseClient();

  // Prefer database-level aggregation via RPC to avoid OOM on large datasets
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_bounty_statistics');

  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    const row = rpcData[0] as {
      min_bounty: string | null;
      max_bounty: string | null;
      avg_bounty: string | null;
    };
    return {
      minBounty: row.min_bounty ? BigInt(row.min_bounty).toString() : '0',
      maxBounty: row.max_bounty ? BigInt(row.max_bounty).toString() : '0',
      avgBounty: row.avg_bounty ? BigInt(row.avg_bounty).toString() : '0',
    };
  }

  // Fallback: in-memory aggregation (less efficient, use only if RPC unavailable)
  if (rpcError && rpcError.code !== '42883') {
    throw new Error(`Failed to get bounty statistics: ${rpcError.message}`);
  }

  const { data, error } = await supabase.from('tasks').select('bounty_amount');

  if (error) {
    throw new Error(`Failed to get bounty statistics: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      minBounty: '0',
      maxBounty: '0',
      avgBounty: '0',
    };
  }

  // Convert to BigInt for precision
  const amounts = data.map((row) => BigInt(row.bounty_amount));
  const min = amounts.reduce((a, b) => (a < b ? a : b), amounts[0]!);
  const max = amounts.reduce((a, b) => (a > b ? a : b), amounts[0]!);
  const sum = amounts.reduce((a, b) => a + b, BigInt(0));
  const avg = sum / BigInt(amounts.length);

  return {
    minBounty: min.toString(),
    maxBounty: max.toString(),
    avgBounty: avg.toString(),
  };
}
