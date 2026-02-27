import {
  getAgentId,
  getAgentReputationSummary,
  getFeedbackSummary,
  getFeedbackClients,
  getAllFeedback,
} from '@pactprotocol/web3-utils';
import { cacheThrough, TTL_CONFIG } from '@pactprotocol/cache';

export async function getReputationHandler(
  targetAddress: `0x${string}`,
  chainId: number,
  tag1?: string,
  tag2?: string
) {
  // Get agent ID (not cached - quick on-chain read needed to check registration)
  const agentId = await getAgentId(targetAddress, chainId);

  if (agentId === 0n) {
    return {
      success: false,
      message: 'Agent not registered',
      walletAddress: targetAddress,
    };
  }

  const cacheKey = `agent:reputation:${targetAddress.toLowerCase()}:${tag1 || ''}:${tag2 || ''}`;

  const { data } = await cacheThrough(
    cacheKey,
    async () => {
      // Get overall reputation summary from adapter
      const summary = await getAgentReputationSummary(targetAddress, chainId);

      // Build result
      const result: Record<string, unknown> = {
        success: true,
        walletAddress: targetAddress,
        agentId: agentId.toString(),
        reputation: {
          taskWins: summary.taskWins.toString(),
          disputeWins: summary.disputeWins.toString(),
          disputeLosses: summary.disputeLosses.toString(),
          totalReputation: summary.totalReputation.toString(),
        },
      };

      // If tags are specified, get filtered summary
      if (tag1 || tag2) {
        const filteredSummary = await getFeedbackSummary(
          agentId,
          tag1 || '',
          tag2 || '',
          [],
          chainId
        );

        result.filteredFeedback = {
          tag1: tag1 || '*',
          tag2: tag2 || '*',
          count: filteredSummary.count.toString(),
          summaryValue: filteredSummary.summaryValue.toString(),
          summaryValueDecimals: filteredSummary.summaryValueDecimals,
        };
      }

      return result;
    },
    { ttl: TTL_CONFIG.REPUTATION, tags: ['agent'] }
  );

  return data;
}

export async function getFeedbackHistoryHandler(
  targetAddress: `0x${string}`,
  chainId: number,
  limit: number
) {
  // Get agent ID (not cached - quick on-chain read needed to check registration)
  const agentId = await getAgentId(targetAddress, chainId);

  if (agentId === 0n) {
    return {
      success: false,
      message: 'Agent not registered',
      walletAddress: targetAddress,
    };
  }

  const cacheKey = `agent:feedback:${targetAddress.toLowerCase()}:${limit}`;

  const { data } = await cacheThrough(
    cacheKey,
    async () => {
      // Get feedback clients
      const clients = await getFeedbackClients(agentId, chainId);

      // Get all feedback entries
      const feedbackEntries = await getAllFeedback(agentId, limit, chainId);

      // Format feedback entries for output
      const formattedFeedback = feedbackEntries
        .filter((entry) => !entry.isRevoked)
        .map((entry) => ({
          clientAddress: entry.clientAddress,
          feedbackIndex: entry.feedbackIndex.toString(),
          tag1: entry.tag1,
          tag2: entry.tag2,
          value: entry.value.toString(),
          valueDecimals: entry.valueDecimals,
          isRevoked: entry.isRevoked,
        }));

      return {
        success: true as const,
        walletAddress: targetAddress,
        agentId: agentId.toString(),
        totalClients: clients.length,
        feedbackCount: formattedFeedback.length,
        feedback: formattedFeedback,
      };
    },
    { ttl: TTL_CONFIG.FEEDBACK_HISTORY, tags: ['agent'] }
  );

  return data;
}
