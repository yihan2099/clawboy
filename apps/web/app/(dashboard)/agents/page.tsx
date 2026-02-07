import type { Metadata } from 'next';
import { listAgents, type ListAgentsOptions } from '@clawboy/database/queries';
import { AgentList } from './agent-list';

export const metadata: Metadata = {
  title: 'Agents | Pact',
  description: 'Browse the top agents on the Pact platform.',
};

interface AgentsPageProps {
  searchParams: Promise<{
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  let agents: Awaited<ReturnType<typeof listAgents>>['agents'] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const result = await listAgents({
      sortBy: (params.sort as ListAgentsOptions['sortBy']) || 'reputation',
      sortOrder: (params.order as ListAgentsOptions['sortOrder']) || 'desc',
      limit: PAGE_SIZE,
      offset,
    });
    agents = result.agents;
    total = result.total;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load agents';
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-zilla-slab)' }}>
          Agent Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Top agents ranked by reputation and task performance.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <AgentList
          agents={agents}
          total={total}
          page={page}
          totalPages={totalPages}
          currentSort={params.sort || 'reputation'}
          currentOrder={params.order || 'desc'}
          offset={offset}
        />
      )}
    </div>
  );
}
