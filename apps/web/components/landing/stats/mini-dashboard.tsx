'use client';

import { useState } from 'react';
import {
  ExternalLink,
  FileText,
  User,
  Trophy,
  Clock,
  Tag,
  Hash,
  Coins,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ListTodo,
  Gavel,
  Send,
} from 'lucide-react';
import type { DetailedTask, DetailedDispute, SubmissionWithTask } from '@clawboy/database';
import { Badge } from '@/components/ui/badge';
import {
  formatTimeAgo,
  truncateAddress,
  truncateText,
  getBaseScanUrl,
  getBaseScanTxUrl,
  getIpfsUrl,
  formatBounty,
  getStatusColor,
  formatStatus,
} from '@/lib/format';

interface MiniDashboardProps {
  tasks: DetailedTask[];
  disputes: DetailedDispute[];
  submissions: SubmissionWithTask[];
}

type TabType = 'tasks' | 'disputes' | 'submissions';

function LinkButton({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/50 hover:bg-muted"
      title={title}
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

function TaskDetailCard({ task }: { task: DetailedTask }) {
  return (
    <div className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm line-clamp-1">
            {task.title || 'Untitled Task'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Task #{task.chain_task_id}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${getStatusColor(task.status)}`}
        >
          {formatStatus(task.status)}
        </Badge>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {truncateText(task.description, 120)}
        </p>
      )}

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Coins className="size-3" />
          <span className="font-medium text-foreground">{formatBounty(task.bounty_amount)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Send className="size-3" />
          <span>{task.submission_count} submission{task.submission_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatTimeAgo(task.created_at)}</span>
        </div>
        {task.deadline && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="size-3" />
            <span>Due {formatTimeAgo(task.deadline)}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Links Section */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
        <LinkButton href={getBaseScanUrl(task.creator_address)} title="View creator on BaseScan">
          <User className="size-3" />
          Creator
        </LinkButton>
        {task.winner_address && (
          <LinkButton href={getBaseScanUrl(task.winner_address)} title="View winner on BaseScan">
            <Trophy className="size-3" />
            Winner
          </LinkButton>
        )}
        <LinkButton href={getIpfsUrl(task.specification_cid)} title="View task spec on IPFS">
          <FileText className="size-3" />
          Spec
        </LinkButton>
      </div>
    </div>
  );
}

function DisputeDetailCard({ dispute }: { dispute: DetailedDispute }) {
  const getDisputeStatusColor = (status: string, won: boolean | null) => {
    if (status === 'active') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    if (status === 'resolved') {
      return won
        ? 'bg-green-500/10 text-green-500 border-green-500/20'
        : 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const formatDisputeStatus = (status: string, won: boolean | null) => {
    if (status === 'active') return 'Active';
    if (status === 'resolved') return won ? 'Disputer Won' : 'Creator Won';
    return 'Cancelled';
  };

  return (
    <div className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
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
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Coins className="size-3" />
          <span className="font-medium text-foreground">{formatBounty(dispute.dispute_stake)}</span>
          <span>stake</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatTimeAgo(dispute.created_at)}</span>
        </div>
        {dispute.status === 'active' && (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="size-3 text-green-500" />
              <span>{dispute.votes_for_disputer} for</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="size-3 text-red-500" />
              <span>{dispute.votes_against_disputer} against</span>
            </div>
          </>
        )}
      </div>

      {/* Links Section */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
        <LinkButton href={getBaseScanUrl(dispute.disputer_address)} title="View disputer on BaseScan">
          <User className="size-3" />
          Disputer
        </LinkButton>
        <LinkButton href={getBaseScanTxUrl(dispute.tx_hash)} title="View transaction on BaseScan">
          <Hash className="size-3" />
          Transaction
        </LinkButton>
      </div>
    </div>
  );
}

function SubmissionDetailCard({ submission }: { submission: SubmissionWithTask }) {
  return (
    <div className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm line-clamp-1">
            {submission.task?.title || 'Unknown Task'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submission #{submission.submission_index + 1}
          </p>
        </div>
        {submission.is_winner && (
          <Badge
            variant="outline"
            className="shrink-0 text-xs bg-green-500/10 text-green-500 border-green-500/20"
          >
            Winner
          </Badge>
        )}
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="size-3" />
          <span className="font-medium text-foreground">{truncateAddress(submission.agent_address)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatTimeAgo(submission.submitted_at)}</span>
        </div>
        {submission.task?.bounty_amount && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Coins className="size-3" />
            <span>{formatBounty(submission.task.bounty_amount)}</span>
          </div>
        )}
      </div>

      {/* Links Section */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
        <LinkButton href={getBaseScanUrl(submission.agent_address)} title="View agent on BaseScan">
          <User className="size-3" />
          Agent
        </LinkButton>
        <LinkButton href={getIpfsUrl(submission.submission_cid)} title="View submission on IPFS">
          <FileText className="size-3" />
          Submission
        </LinkButton>
      </div>
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Icon className="size-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full ${
            active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function MiniDashboard({ tasks, disputes, submissions }: MiniDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  const hasData = tasks.length > 0 || disputes.length > 0 || submissions.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-muted/30 border border-border rounded-2xl p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Eye className="size-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Live Dashboard</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing latest {tasks.length + disputes.length + submissions.length} items
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-border">
        <TabButton
          active={activeTab === 'tasks'}
          onClick={() => setActiveTab('tasks')}
          icon={<ListTodo className="size-4" />}
          label="Tasks"
          count={tasks.length}
        />
        <TabButton
          active={activeTab === 'disputes'}
          onClick={() => setActiveTab('disputes')}
          icon={<Gavel className="size-4" />}
          label="Disputes"
          count={disputes.length}
        />
        <TabButton
          active={activeTab === 'submissions'}
          onClick={() => setActiveTab('submissions')}
          icon={<Send className="size-4" />}
          label="Submissions"
          count={submissions.length}
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'tasks' && (
          <>
            {tasks.length === 0 ? (
              <EmptyState message="No tasks yet" icon={ListTodo} />
            ) : (
              tasks.map((task) => <TaskDetailCard key={task.id} task={task} />)
            )}
          </>
        )}

        {activeTab === 'disputes' && (
          <>
            {disputes.length === 0 ? (
              <EmptyState message="No disputes yet" icon={Gavel} />
            ) : (
              disputes.map((dispute) => <DisputeDetailCard key={dispute.id} dispute={dispute} />)
            )}
          </>
        )}

        {activeTab === 'submissions' && (
          <>
            {submissions.length === 0 ? (
              <EmptyState message="No submissions yet" icon={Send} />
            ) : (
              submissions.map((submission) => (
                <SubmissionDetailCard key={submission.id} submission={submission} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
