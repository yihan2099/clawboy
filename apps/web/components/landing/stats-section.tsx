import {
  getCachedPlatformStatistics,
  getCachedRecentTasks,
  getCachedTopAgents,
  getCachedRecentSubmissions,
} from '@/app/actions/statistics';
import { HeroStats, SecondaryStats, ActivityFeedGrid } from './stats';

export async function StatsSection() {
  const [stats, recentTasks, topAgents, recentSubmissions] = await Promise.all([
    getCachedPlatformStatistics(),
    getCachedRecentTasks(),
    getCachedTopAgents(),
    getCachedRecentSubmissions(),
  ]);

  // Graceful degradation: don't render if stats unavailable
  if (!stats) {
    return null;
  }

  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
          Platform Activity
        </h2>

        <HeroStats stats={stats} />
        <SecondaryStats stats={stats} />
        <ActivityFeedGrid tasks={recentTasks} agents={topAgents} submissions={recentSubmissions} />
      </div>
    </section>
  );
}
