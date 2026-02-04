import {
  FileText,
  User,
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Users,
  ListTodo,
  Send,
} from 'lucide-react';
import type { BountyStatistics, PlatformStatistics, SubmissionWithTask } from '@clawboy/database';
import {
  formatTimeAgo,
  truncateAddress,
  truncateText,
  getBaseScanUrl,
  getIpfsUrl,
  formatBounty,
} from '@/lib/format';
import {
  SidebarCard,
  SectionHeader,
  LinkButton,
  CardDivider,
  StatusDot,
} from '../shared';

interface AnalyticsTabProps {
  bountyStats: BountyStatistics | null;
  stats: PlatformStatistics;
  submissions: SubmissionWithTask[];
}

function BountyDistribution({
  bountyStats,
  stats,
}: {
  bountyStats: BountyStatistics | null;
  stats: PlatformStatistics;
}) {
  if (!bountyStats) return null;

  const min = parseFloat(formatBounty(bountyStats.minBounty).replace(' ETH', ''));
  const max = parseFloat(formatBounty(bountyStats.maxBounty).replace(' ETH', ''));
  const avg = parseFloat(formatBounty(bountyStats.avgBounty).replace(' ETH', ''));

  const range = max - min;
  const avgPosition = range > 0 ? ((avg - min) / range) * 100 : 50;

  return (
    <SidebarCard>
      <SectionHeader icon={<BarChart3 className="size-4" strokeWidth={1.5} />} title="Bounty Distribution" />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 text-center mb-6">
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingDown className="size-3" strokeWidth={1.5} />
            <span className="text-xs">Min</span>
          </div>
          <p className="font-semibold text-foreground text-sm">{formatBounty(bountyStats.minBounty)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Activity className="size-3" strokeWidth={1.5} />
            <span className="text-xs">Avg</span>
          </div>
          <p className="font-semibold text-foreground text-sm">{formatBounty(bountyStats.avgBounty)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="size-3" strokeWidth={1.5} />
            <span className="text-xs">Max</span>
          </div>
          <p className="font-semibold text-foreground text-sm">{formatBounty(bountyStats.maxBounty)}</p>
        </div>
      </div>

      {/* Visual Range Bar */}
      <div className="relative pt-6 mb-4">
        <div className="h-2.5 bg-gradient-to-r from-muted via-foreground/20 to-foreground/50 rounded-full" />
        <div
          className="absolute top-0 transform -translate-x-1/2"
          style={{ left: `${avgPosition}%` }}
        >
          <div className="w-0.5 h-6 bg-foreground rounded-full" />
          <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap font-medium">avg</div>
        </div>
      </div>

      <CardDivider />

      {/* Total Distributed */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coins className="size-4" strokeWidth={1.5} />
          <span className="text-sm">Total Paid Out</span>
        </div>
        <span className="font-semibold text-foreground">{formatBounty(stats.bountyDistributed)}</span>
      </div>
    </SidebarCard>
  );
}

function ActivityTimeline({ submissions }: { submissions: SubmissionWithTask[] }) {
  return (
    <SidebarCard>
      <SectionHeader icon={<Activity className="size-4" strokeWidth={1.5} />} title="Activity Timeline" />

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="flex items-start gap-3">
              <StatusDot color="green" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{truncateAddress(submission.agent_address)}</span>
                  <span className="text-muted-foreground"> submitted to </span>
                  <span className="font-medium">
                    {truncateText(submission.task?.title || 'Unknown Task', 20)}
                  </span>
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(submission.submitted_at)}
                  </span>
                  <LinkButton
                    href={getBaseScanUrl(submission.agent_address)}
                    title="View agent"
                    variant="ghost"
                  >
                    <User className="size-3" strokeWidth={1.5} />
                  </LinkButton>
                  <LinkButton
                    href={getIpfsUrl(submission.submission_cid)}
                    title="View submission"
                    variant="ghost"
                  >
                    <FileText className="size-3" strokeWidth={1.5} />
                  </LinkButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SidebarCard>
  );
}

function PlatformSummary({ stats }: { stats: PlatformStatistics }) {
  const summaryItems = [
    { icon: <ListTodo className="size-5" strokeWidth={1.5} />, value: stats.totalTasks, label: 'Total Tasks' },
    { icon: <Send className="size-5" strokeWidth={1.5} />, value: stats.totalSubmissions, label: 'Submissions' },
    { icon: <Users className="size-5" strokeWidth={1.5} />, value: stats.registeredAgents, label: 'Agents' },
    {
      icon: <Activity className="size-5" strokeWidth={1.5} />,
      value:
        stats.totalSubmissions > 0
          ? (stats.totalSubmissions / Math.max(stats.totalTasks, 1)).toFixed(1)
          : '0',
      label: 'Avg Subs/Task',
    },
  ];

  return (
    <SidebarCard>
      <SectionHeader icon={<BarChart3 className="size-4" strokeWidth={1.5} />} title="Platform Summary" />
      <div className="grid grid-cols-2 gap-3">
        {summaryItems.map(({ icon, value, label }) => (
          <div key={label} className="text-center p-4 rounded-lg bg-muted/40">
            <div className="text-muted-foreground mb-2 flex justify-center">{icon}</div>
            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

export function AnalyticsTab({ bountyStats, stats, submissions }: AnalyticsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column */}
      <div className="space-y-4">
        <BountyDistribution bountyStats={bountyStats} stats={stats} />
        <PlatformSummary stats={stats} />
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <ActivityTimeline submissions={submissions} />
      </div>
    </div>
  );
}
