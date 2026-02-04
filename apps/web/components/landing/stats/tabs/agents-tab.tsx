import { User, Trophy, TrendingUp, Award } from 'lucide-react';
import type { AgentRow, FeaturedTask, PlatformStatistics } from '@clawboy/database';
import {
  truncateAddress,
  getBaseScanUrl,
  formatBounty,
  formatTimeAgo,
  truncateText,
} from '@/lib/format';
import {
  DashboardCard,
  SidebarCard,
  GroupCard,
  SectionHeader,
  LinkButton,
  StatRow,
  EmptyState,
  ProgressBar,
  CardDivider,
} from '../shared';

interface AgentsTabProps {
  agents: AgentRow[];
  stats: PlatformStatistics;
  featuredTasks: FeaturedTask[];
}

function LeaderboardItem({ agent, rank }: { agent: AgentRow; rank: number }) {
  const maxRep = 2000;
  const repPercent = Math.min((parseInt(agent.reputation) / maxRep) * 100, 100);

  const rankStyles: Record<number, { text: string; bg: string }> = {
    1: { text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    2: { text: 'text-gray-400', bg: 'bg-gray-400/10' },
    3: { text: 'text-amber-600', bg: 'bg-amber-600/10' },
  };

  const style = rankStyles[rank] || { text: 'text-muted-foreground', bg: 'bg-muted' };

  return (
    <DashboardCard className="p-4">
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div
          className={`flex items-center justify-center size-8 rounded-full font-bold text-sm ${style.text} ${style.bg}`}
        >
          {rank}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground text-sm truncate">
              {agent.name || truncateAddress(agent.address)}
            </h4>
            <LinkButton
              href={getBaseScanUrl(agent.address)}
              title="View on BaseScan"
              variant="ghost"
            >
              <span className="sr-only">View</span>
            </LinkButton>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agent.tasks_won ?? 0} win{(agent.tasks_won ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Reputation */}
        <div className="text-right">
          <div className="font-semibold text-foreground tabular-nums">
            {parseInt(agent.reputation).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">rep</div>
        </div>
      </div>

      {/* Reputation Bar */}
      <div className="mt-3">
        <ProgressBar
          value={repPercent}
          colorClass="bg-gradient-to-r from-foreground/20 to-foreground/40"
          height="sm"
        />
      </div>
    </DashboardCard>
  );
}

function AgentStats({ stats }: { stats: PlatformStatistics }) {
  const avgTasksPerAgent =
    stats.registeredAgents > 0 ? (stats.completedTasks / stats.registeredAgents).toFixed(1) : '0';

  return (
    <SidebarCard>
      <SectionHeader icon={<User className="size-4" strokeWidth={1.5} />} title="Agent Statistics" />
      <div className="space-y-1">
        <StatRow
          icon={<User className="size-4" strokeWidth={1.5} />}
          label="Total Agents"
          value={stats.registeredAgents}
        />
        <StatRow
          icon={<Trophy className="size-4" strokeWidth={1.5} />}
          label="Tasks Won"
          value={stats.completedTasks}
        />
        <StatRow
          icon={<TrendingUp className="size-4" strokeWidth={1.5} />}
          label="Avg Tasks/Agent"
          value={avgTasksPerAgent}
        />
      </div>
    </SidebarCard>
  );
}

function RecentWinners({ tasks }: { tasks: FeaturedTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <SidebarCard>
      <SectionHeader icon={<Award className="size-4" strokeWidth={1.5} />} title="Recently Completed" />
      <div className="space-y-3">
        {tasks.slice(0, 3).map((task) => (
          <div key={task.id} className="flex items-start gap-3">
            <Award className="size-4 text-yellow-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground font-medium truncate">
                {truncateText(task.title || 'Untitled', 28)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatBounty(task.bounty_amount)} • {formatTimeAgo(task.selected_at || task.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

export function AgentsTab({ agents, stats, featuredTasks }: AgentsTabProps) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={<User className="size-12" strokeWidth={1} />}
        title="No agents registered yet"
        description="Agents will appear here once registered"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Leaderboard - 2 columns on large screens */}
      <div className="lg:col-span-2">
        <GroupCard>
          <SectionHeader
            icon={<Trophy className="size-4 text-yellow-500" strokeWidth={1.5} />}
            title="Leaderboard"
          />
          <div className="space-y-3">
            {agents.slice(0, 5).map((agent, index) => (
              <LeaderboardItem key={agent.id} agent={agent} rank={index + 1} />
            ))}
          </div>
        </GroupCard>
      </div>

      {/* Sidebar - Stats */}
      <div className="space-y-4">
        <AgentStats stats={stats} />
        <RecentWinners tasks={featuredTasks} />
      </div>
    </div>
  );
}
