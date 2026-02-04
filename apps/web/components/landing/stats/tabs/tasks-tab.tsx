import { FileText, User, Trophy, Clock, Coins, Send, AlertTriangle, CircleDot, Tag } from 'lucide-react';
import type { DetailedTask, TagStatistic, PlatformStatistics } from '@clawboy/database';
import { Badge } from '@/components/ui/badge';
import {
  formatTimeAgo,
  truncateText,
  getBaseScanUrl,
  getIpfsUrl,
  formatBounty,
  getStatusColor,
  formatStatus,
} from '@/lib/format';
import {
  DashboardCard,
  SidebarCard,
  SectionHeader,
  LinkButton,
  EmptyState,
  ProgressBar,
  CardDivider,
} from '../shared';

interface TasksTabProps {
  tasks: DetailedTask[];
  stats: PlatformStatistics;
  tagStats: TagStatistic[];
}

function TaskDetailCard({ task }: { task: DetailedTask }) {
  return (
    <DashboardCard>
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm line-clamp-1">
            {task.title || 'Untitled Task'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">Task #{task.chain_task_id}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs ${getStatusColor(task.status)}`}>
          {formatStatus(task.status)}
        </Badge>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {truncateText(task.description, 120)}
        </p>
      )}

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="size-3.5 opacity-70" strokeWidth={1.5} />
          <span className="font-medium text-foreground">{formatBounty(task.bounty_amount)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Send className="size-3.5 opacity-70" strokeWidth={1.5} />
          <span>
            {task.submission_count} submission{task.submission_count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-3.5 opacity-70" strokeWidth={1.5} />
          <span>{formatTimeAgo(task.created_at)}</span>
        </div>
        {task.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-3.5 opacity-70" strokeWidth={1.5} />
            <span>Due {formatTimeAgo(task.deadline)}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 font-normal">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-muted-foreground ml-1">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <CardDivider />

      {/* Links Section */}
      <div className="flex flex-wrap gap-2">
        <LinkButton href={getBaseScanUrl(task.creator_address)} title="View creator on BaseScan">
          <User className="size-3.5" strokeWidth={1.5} />
          Creator
        </LinkButton>
        {task.winner_address && (
          <LinkButton href={getBaseScanUrl(task.winner_address)} title="View winner on BaseScan">
            <Trophy className="size-3.5" strokeWidth={1.5} />
            Winner
          </LinkButton>
        )}
        <LinkButton href={getIpfsUrl(task.specification_cid)} title="View task spec on IPFS">
          <FileText className="size-3.5" strokeWidth={1.5} />
          Spec
        </LinkButton>
      </div>
    </DashboardCard>
  );
}

function StatusBreakdown({ stats }: { stats: PlatformStatistics }) {
  const statuses = [
    { label: 'Open', count: stats.openTasks, color: 'green' as const },
    { label: 'Completed', count: stats.completedTasks, color: 'blue' as const },
    { label: 'Disputed', count: stats.activeDisputes, color: 'red' as const },
    { label: 'Refunded', count: stats.refundedTasks, color: 'gray' as const },
  ];

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  const colorMap = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
    gray: 'text-muted-foreground',
  };

  const bgColorMap = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  };

  return (
    <SidebarCard>
      <SectionHeader icon={<CircleDot className="size-4" strokeWidth={1.5} />} title="Status Breakdown" />
      <div className="space-y-3">
        {statuses.map(({ label, count, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CircleDot className={`size-3.5 ${colorMap[color]}`} strokeWidth={2} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">{count}</span>
          </div>
        ))}
      </div>
      {total > 0 && (
        <>
          <CardDivider />
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {statuses.map(({ label, count, color }) => {
              const width = (count / total) * 100;
              if (width === 0) return null;
              return (
                <div
                  key={label}
                  className={`${bgColorMap[color]} h-full first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
        </>
      )}
    </SidebarCard>
  );
}

const tagIcons: Record<string, string> = {
  'smart-contract': '📜',
  solidity: '⛓️',
  frontend: '🎨',
  backend: '⚙️',
  'data-analysis': '📊',
  api: '🔌',
  security: '🔒',
  testing: '🧪',
  documentation: '📝',
  design: '🖼️',
  devops: '🚀',
  blockchain: '⛓️',
  defi: '💰',
  nft: '🖼️',
  web3: '🌐',
};

function getTagIcon(tag: string): string {
  const lowerTag = tag.toLowerCase();
  return tagIcons[lowerTag] ?? '🏷️';
}

function PopularCategories({ tags }: { tags: TagStatistic[] }) {
  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <SidebarCard>
      <SectionHeader icon={<Tag className="size-4" strokeWidth={1.5} />} title="Popular Categories" />
      <div className="space-y-3">
        {tags.slice(0, 5).map(({ tag, count }) => {
          const percentage = (count / maxCount) * 100;
          return (
            <div key={tag}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getTagIcon(tag)}</span>
                  <span className="text-sm text-muted-foreground">{tag}</span>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums">{count}</span>
              </div>
              <ProgressBar value={percentage} colorClass="bg-foreground/20 hover:bg-foreground/30" />
            </div>
          );
        })}
      </div>
    </SidebarCard>
  );
}

export function TasksTab({ tasks, stats, tagStats }: TasksTabProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-12" strokeWidth={1} />}
        title="No tasks yet"
        description="Tasks will appear here once created"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Task Cards - 2 columns on large screens */}
      <div className="lg:col-span-2 space-y-4">
        {tasks.map((task) => (
          <TaskDetailCard key={task.id} task={task} />
        ))}
      </div>

      {/* Sidebar - Stats and Categories */}
      <div className="space-y-4">
        <StatusBreakdown stats={stats} />
        <PopularCategories tags={tagStats} />
      </div>
    </div>
  );
}
