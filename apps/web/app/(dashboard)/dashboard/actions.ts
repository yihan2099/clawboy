'use server';

import {
  getAgentByAddress,
  getSubmissionsByAgent,
  listTasks,
  calculateVoteWeight,
} from '@clawboy/database/queries';

export async function fetchAgentProfile(address: string) {
  const agent = await getAgentByAddress(address);
  if (!agent) return null;
  return {
    ...agent,
    voteWeight: calculateVoteWeight(agent.reputation),
  };
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

export async function fetchWonTasks(address: string, limit = 10, offset = 0) {
  return listTasks({
    winnerAddress: address,
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit,
    offset,
  });
}
