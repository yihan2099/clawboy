'use server';

import {
  getAgentByAddress,
  getSubmissionsByAgent,
  listTasks,
} from '@pactprotocol/database/queries';

export async function fetchAgentProfile(address: string) {
  const agent = await getAgentByAddress(address);
  if (!agent) return null;
  return agent;
}

export async function fetchMyCreatedTasks(address: string, limit = 10, offset = 0) {
  return listTasks({
    creatorAddress: address,
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit,
    offset,
  });
}

export async function fetchMySubmissions(address: string, limit = 10, offset = 0) {
  return getSubmissionsByAgent(address, { limit, offset });
}

// TODO: V2 uses consensus-based multi-winner model. This needs a dedicated query
// to find tasks where the given address is a consensus winner (is_consensus_winner=true
// in submissions table). For now, returns the agent's submissions as a proxy.
export async function fetchWonTasks(address: string, limit = 10, offset = 0) {
  const result = await getSubmissionsByAgent(address, { limit, offset });
  return { tasks: [], total: 0 };
}
