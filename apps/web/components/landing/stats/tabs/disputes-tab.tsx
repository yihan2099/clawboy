import {
  User,
  Hash,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  Gavel,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import type { DetailedDispute, PlatformStatistics } from '@clawboy/database';
import { Badge } from '@/components/ui/badge';
import { formatTimeAgo, getBaseScanUrl, getBaseScanTxUrl, formatBounty } from '@/lib/format';
import {
  DashboardCard,
  SidebarCard,
  SectionHeader,
  LinkButton,
  StatRow,
  EmptyState,
  CardDivider,
  StatusDot,
} from '../shared';

interface DisputesTabProps {
  disputes: DetailedDispute[];
  stats: PlatformStatistics;
}

function getDisputeStatusColor(status: string, won: boolean | null) {
  if (status === 'active') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (status === 'resolved') {
    return won
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}

function formatDisputeStatus(status: string, won: boolean | null) {
  if (status === 'active') return 'Active';
  if (status === 'resolved') return won ? 'Disputer Won' : 'Creator Won';
  return 'Cancelled';
}

function DisputeDetailCard({ dispute }: { dispute: DetailedDispute }) {
  const votesFor = parseInt(dispute.votes_for_disputer) || 0;
  const votesAgainst = parseInt(dispute.votes_against_disputer) || 0;
  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 50;

  return (
    <DashboardCard>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm line-clamp-1">
            {dispute.task?.title || 'Unknown Task'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dispute #{dispute.chain_dispute_id}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${getDisputeStatusColor(dispute.status, dispute.disputer_won)}`}
        >
          {formatDisputeStatus(dispute.status, dispute.disputer_won)}
        </Badge>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="size-3.5 opacity-70" strokeWidth={1.5} />
          <span className="font-medium text-foreground">{formatBounty(dispute.dispute_stake)}</span>
          <span className="text-xs">stake</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-3.5 opacity-70" strokeWidth={1.5} />
          <span>{formatTimeAgo(dispute.created_at)}</span>
        </div>
      </div>

      {/* Voting Progress (if active) */}
      {dispute.status === 'active' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-green-500 text-sm">
              <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
              <span className="font-medium">{votesFor} for</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <span className="font-medium">{votesAgainst} against</span>
              <XCircle className="size-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${forPercent}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${100 - forPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Voting ends {formatTimeAgo(dispute.voting_deadline)}
          </p>
        </div>
      )}

      <CardDivider />

      {/* Links Section */}
      <div className="flex flex-wrap gap-2">
        <LinkButton
          href={getBaseScanUrl(dispute.disputer_address)}
          title="View disputer on BaseScan"
        >
          <User className="size-3.5" strokeWidth={1.5} />
          Disputer
        </LinkButton>
        <LinkButton href={getBaseScanTxUrl(dispute.tx_hash)} title="View transaction on BaseScan">
          <Hash className="size-3.5" strokeWidth={1.5} />
          Transaction
        </LinkButton>
      </div>
    </DashboardCard>
  );
}

function DisputeStats({
  stats,
  disputes,
}: {
  stats: PlatformStatistics;
  disputes: DetailedDispute[];
}) {
  const resolved = disputes.filter((d) => d.status === 'resolved');
  const disputerWins = resolved.filter((d) => d.disputer_won === true).length;
  const creatorWins = resolved.filter((d) => d.disputer_won === false).length;
  const winRate = resolved.length > 0 ? ((disputerWins / resolved.length) * 100).toFixed(0) : '—';

  return (
    <SidebarCard>
      <SectionHeader icon={<Gavel className="size-4" strokeWidth={1.5} />} title="Dispute Statistics" />
      <div className="space-y-1">
        <StatRow
          icon={<AlertCircle className="size-4" strokeWidth={1.5} />}
          iconColor="text-yellow-500"
          label="Active"
          value={stats.activeDisputes}
        />
        <StatRow
          icon={<CheckCircle2 className="size-4" strokeWidth={1.5} />}
          iconColor="text-green-500"
          label="Resolved"
          value={resolved.length}
        />
        <StatRow
          icon={<TrendingUp className="size-4" strokeWidth={1.5} />}
          label="Disputer Win Rate"
          value={`${winRate}%`}
        />
      </div>

      {resolved.length > 0 && (
        <>
          <CardDivider />
          <p className="text-xs text-muted-foreground mb-3">Resolution History</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <StatusDot color="green" />
              <span className="text-sm text-muted-foreground">Disputer: {disputerWins}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot color="red" />
              <span className="text-sm text-muted-foreground">Creator: {creatorWins}</span>
            </div>
          </div>
        </>
      )}
    </SidebarCard>
  );
}

export function DisputesTab({ disputes, stats }: DisputesTabProps) {
  if (disputes.length === 0) {
    return (
      <EmptyState
        icon={<Gavel className="size-12" strokeWidth={1} />}
        title="No disputes yet"
        description="Disputes will appear here when filed"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Dispute Cards - 2 columns on large screens */}
      <div className="lg:col-span-2 space-y-4">
        {disputes.map((dispute) => (
          <DisputeDetailCard key={dispute.id} dispute={dispute} />
        ))}
      </div>

      {/* Sidebar - Stats */}
      <div className="space-y-4">
        <DisputeStats stats={stats} disputes={disputes} />
      </div>
    </div>
  );
}
