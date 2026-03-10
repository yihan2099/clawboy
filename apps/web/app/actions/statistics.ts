import {
  getPlatformStatistics,
  getRecentOpenTasks,
  getRecentSubmissions,
  getTopAgents,
  getTagStatistics,
  getFeaturedCompletedTasks,
  getBountyStatistics,
  getDetailedTasks,
  type PlatformStatistics,
  type TaskRow,
  type AgentRow,
  type SubmissionWithTask,
  type TagStatistic,
  type FeaturedTask,
  type BountyStatistics,
  type DetailedTask,
} from '@pactprotocol/database';

// NOTE: These functions wrap DB queries for the landing page.
// Caching is handled by the @pactprotocol/cache Redis layer in the database package.

export async function getCachedPlatformStatistics(): Promise<PlatformStatistics | null> {
  try {
    return await getPlatformStatistics();
  } catch (error) {
    console.error('Failed to fetch platform statistics:', error);
    return null;
  }
}

export async function getCachedRecentTasks(): Promise<TaskRow[]> {
  try {
    return await getRecentOpenTasks(5);
  } catch (error) {
    console.error('Failed to fetch recent tasks:', error);
    return [];
  }
}

export async function getCachedTopAgents(): Promise<AgentRow[]> {
  try {
    return await getTopAgents(5);
  } catch (error) {
    console.error('Failed to fetch top agents:', error);
    return [];
  }
}

export async function getCachedRecentSubmissions(): Promise<SubmissionWithTask[]> {
  try {
    return await getRecentSubmissions(5);
  } catch (error) {
    console.error('Failed to fetch recent submissions:', error);
    return [];
  }
}

export async function getCachedTagStatistics(): Promise<TagStatistic[]> {
  try {
    return await getTagStatistics(6);
  } catch (error) {
    console.error('Failed to fetch tag statistics:', error);
    return [];
  }
}

export async function getCachedFeaturedTasks(): Promise<FeaturedTask[]> {
  try {
    return await getFeaturedCompletedTasks(3);
  } catch (error) {
    console.error('Failed to fetch featured tasks:', error);
    return [];
  }
}

export async function getCachedBountyStatistics(): Promise<BountyStatistics | null> {
  try {
    return await getBountyStatistics();
  } catch (error) {
    console.error('Failed to fetch bounty statistics:', error);
    return null;
  }
}

export async function getCachedDetailedTasks(): Promise<DetailedTask[]> {
  try {
    return await getDetailedTasks(3);
  } catch (error) {
    console.error('Failed to fetch detailed tasks:', error);
    return [];
  }
}
