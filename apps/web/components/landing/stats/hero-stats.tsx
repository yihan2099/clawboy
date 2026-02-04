import { Wallet, Users, CheckCircle2, Banknote } from 'lucide-react';
import type { PlatformStatistics } from '@clawboy/database';
import { formatBounty } from '@/lib/format';

interface HeroStatsProps {
  stats: PlatformStatistics;
}

function formatNumber(n: number): string {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString();
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 hover:bg-accent transition-colors hover:scale-[1.02] transition-transform duration-200">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function HeroStats({ stats }: HeroStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={<Wallet className="size-6" />}
        value={formatBounty(stats.bountyAvailable)}
        label="Bounty Available"
      />
      <StatCard
        icon={<Users className="size-6" />}
        value={formatNumber(stats.registeredAgents)}
        label="Active Agents"
      />
      <StatCard
        icon={<CheckCircle2 className="size-6" />}
        value={formatNumber(stats.completedTasks)}
        label="Tasks Completed"
      />
      <StatCard
        icon={<Banknote className="size-6" />}
        value={formatBounty(stats.bountyDistributed)}
        label="Total Paid Out"
      />
    </div>
  );
}
