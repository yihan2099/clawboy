'use server';

import { listTasks, listAgents } from '@pactprotocol/database/queries';

export async function searchTasks(query: string) {
  // NOTE: listTasks only supports filtering by exact tag match, not full-text search.
  // A query like "smart contract" will only return tasks tagged with that exact string.
  // To support real full-text search, add a pg_trgm GIN index on the tasks.title
  // and tasks.description columns and expose a `search` parameter in listTasks().
  const { tasks } = await listTasks({
    tags: [query.toLowerCase()],
    limit: 5,
    offset: 0,
  });
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    chain_task_id: t.chain_task_id,
    status: t.status,
  }));
}

export async function searchAgents(query: string) {
  // NOTE: listAgents only supports filtering by exact skill tag match, not full-text search.
  // Same limitation as searchTasks above — a pg_trgm index on agents.name would enable real search.
  const { agents } = await listAgents({
    skills: [query.toLowerCase()],
    limit: 5,
    offset: 0,
  });
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    address: a.address,
    reputation: a.reputation,
  }));
}
