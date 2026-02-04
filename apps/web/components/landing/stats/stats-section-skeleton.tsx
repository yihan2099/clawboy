import { Skeleton } from '@/components/ui/skeleton';

function StatCardSkeleton() {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6">
      <Skeleton className="size-6 mb-3" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

function FeedColumnSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <Skeleton className="size-4" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/30">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSectionSkeleton() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <div className="flex justify-center mb-4">
          <Skeleton className="h-10 w-64" />
        </div>

        {/* Hero stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Secondary stats skeleton */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-12">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Activity feed skeleton - mobile tabs */}
        <div className="flex md:hidden justify-center gap-2 mb-4">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>

        {/* Activity feed skeleton - mobile */}
        <div className="md:hidden">
          <FeedColumnSkeleton />
        </div>

        {/* Activity feed skeleton - desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <FeedColumnSkeleton />
          <FeedColumnSkeleton />
          <FeedColumnSkeleton />
        </div>
      </div>
    </section>
  );
}
