import { ExternalLink } from 'lucide-react';

/**
 * Shared UI components for the Platform Dashboard
 * Ensures consistent styling across all tabs
 */

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Primary card container used for main content items (tasks, disputes, etc.)
 */
export function DashboardCard({ children, className = '', hover = true }: DashboardCardProps) {
  return (
    <div
      className={`p-5 rounded-xl bg-card border border-border ${
        hover ? 'hover:border-muted-foreground/30 hover:shadow-sm' : ''
      } transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Sidebar/stats card with subtle background
 */
export function SidebarCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`p-5 rounded-xl bg-card border border-border transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Wrapper card for grouped content (like leaderboard)
 */
export function GroupCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div className={`p-5 rounded-xl bg-muted/20 border border-border ${className}`}>{children}</div>
  );
}

// ============================================================================
// SECTION HEADERS
// ============================================================================

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

/**
 * Consistent section header with optional icon and action
 */
export function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      </div>
      {action}
    </div>
  );
}

// ============================================================================
// LINK BUTTON
// ============================================================================

interface LinkButtonProps {
  href: string;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'ghost';
}

/**
 * Consistent external link button
 */
export function LinkButton({ href, title, children, variant = 'default' }: LinkButtonProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 text-xs transition-colors';
  const variantStyles =
    variant === 'default'
      ? 'text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md bg-muted/40 hover:bg-muted border border-transparent hover:border-border'
      : 'text-muted-foreground hover:text-foreground';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${variantStyles}`}
      title={title}
    >
      {children}
      <ExternalLink className="size-3 opacity-60" />
    </a>
  );
}

// ============================================================================
// STAT ROW
// ============================================================================

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
}

/**
 * Consistent stat row for sidebar cards
 */
export function StatRow({ icon, label, value, iconColor = '' }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className={iconColor}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

/**
 * Consistent empty state component
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="mb-4 opacity-40">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs mt-1 opacity-70">{description}</p>}
    </div>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  height?: 'sm' | 'md';
}

/**
 * Consistent progress bar
 */
export function ProgressBar({
  value,
  max = 100,
  colorClass = 'bg-foreground/30',
  height = 'sm',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = height === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`${heightClass} bg-muted rounded-full overflow-hidden`}>
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// ============================================================================
// BADGE / STATUS INDICATOR
// ============================================================================

interface StatusDotProps {
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  pulse?: boolean;
}

/**
 * Status indicator dot
 */
export function StatusDot({ color, pulse = false }: StatusDotProps) {
  const colorMap = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500',
  };

  return (
    <span className="relative flex size-2">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colorMap[color]} opacity-75`}
        />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${colorMap[color]}`} />
    </span>
  );
}

// ============================================================================
// INFO GRID
// ============================================================================

interface InfoGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

/**
 * Grid for displaying key info items
 */
export function InfoGrid({ children, cols = 2 }: InfoGridProps) {
  const colsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return <div className={`grid ${colsClass[cols]} gap-3 text-sm`}>{children}</div>;
}

interface InfoItemProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}

/**
 * Single info item within InfoGrid
 */
export function InfoItem({ icon, children, highlight = false }: InfoItemProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="opacity-70">{icon}</span>
      <span className={highlight ? 'font-medium text-foreground' : ''}>{children}</span>
    </div>
  );
}

// ============================================================================
// DIVIDER
// ============================================================================

export function CardDivider() {
  return <div className="border-t border-border my-4" />;
}
