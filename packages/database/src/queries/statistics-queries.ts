import { getSupabaseClient } from '../client';
import type { TaskRow } from '../schema/tasks';
import type { SubmissionRow } from '../schema/submissions';

export interface PlatformStatistics {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  refundedTasks: number;
  bountyDistributed: string; // wei string for precision
  bountyAvailable: string; // wei string - sum of open task bounties
  registeredAgents: number;
  totalSubmissions: number;
  activeDisputes: number;
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
    completedTasksResult,
    refundedTasksResult,
    bountyDistributedResult,
    bountyAvailableResult,
    agentsResult,
    submissionsResult,
    activeDisputesResult,
  ] = await Promise.all([
    // Total tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    // Open tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    // Completed tasks
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    // Refunded tasks (cancelled/expired)
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'refunded'),
    // Sum of bounties from completed tasks (using RPC for precision)
    supabase.rpc('sum_completed_bounties'),
    // Sum of bounties from open tasks (using RPC for precision)
    supabase.rpc('sum_open_bounties'),
    // Total agents
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    // Total submissions
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    // Active disputes
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Check for errors
  if (totalTasksResult.error) {
    throw new Error(`Failed to get total tasks: ${totalTasksResult.error.message}`);
  }
  if (openTasksResult.error) {
    throw new Error(`Failed to get open tasks: ${openTasksResult.error.message}`);
  }
  if (completedTasksResult.error) {
    throw new Error(`Failed to get completed tasks: ${completedTasksResult.error.message}`);
  }
  if (refundedTasksResult.error) {
    throw new Error(`Failed to get refunded tasks: ${refundedTasksResult.error.message}`);
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
  if (activeDisputesResult.error) {
    throw new Error(`Failed to get active disputes: ${activeDisputesResult.error.message}`);
  }

  return {
    totalTasks: totalTasksResult.count ?? 0,
    openTasks: openTasksResult.count ?? 0,
    completedTasks: completedTasksResult.count ?? 0,
    refundedTasks: refundedTasksResult.count ?? 0,
    bountyDistributed: (bountyDistributedResult.data as string) ?? '0',
    bountyAvailable: (bountyAvailableResult.data as string) ?? '0',
    registeredAgents: agentsResult.count ?? 0,
    totalSubmissions: submissionsResult.count ?? 0,
    activeDisputes: activeDisputesResult.count ?? 0,
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
    .eq('status', 'open')
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
  task: Pick<TaskRow, 'title' | 'bounty_amount'> | null;
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
        bounty_amount
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
