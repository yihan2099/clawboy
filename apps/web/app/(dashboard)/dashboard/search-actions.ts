'use server';

import { listTasks, listAgents } from '@pactprotocol/database/queries';

export async function searchTasks(query: string) {
  const { tasks } = await listTasks({
    tags: [query.toLowerCase()],
    limit: 5,
    offset: 0,
  });
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    chain_task_id: t.chain_task_id,
    phase: t.phase,
  }));
}

export async function searchAgents(query: string) {
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
