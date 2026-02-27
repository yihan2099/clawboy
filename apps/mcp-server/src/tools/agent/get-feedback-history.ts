import { z } from 'zod';
import { getFeedbackHistoryHandler } from '../../services/reputation-service';
import { getChainId } from '../../config/chain';

export const getFeedbackHistorySchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export type GetFeedbackHistoryInput = z.infer<typeof getFeedbackHistorySchema>;

export const getFeedbackHistoryTool = {
  name: 'get_feedback_history',
  description:
    'Get all feedback history for an agent from the ERC-8004 reputation registry. Returns individual feedback entries with tags, values, and client information.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      walletAddress: {
        type: 'string',
        description: 'Wallet address to query (defaults to your own if authenticated)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of feedback entries to return (default: 50, max: 100)',
      },
    },
  },
  handler: async (args: unknown, context: { callerAddress?: `0x${string}` }) => {
    const input = getFeedbackHistorySchema.parse(args);

    // Determine which wallet to query
    const targetAddress = (input.walletAddress || context.callerAddress) as `0x${string}`;

    if (!targetAddress) {
      throw new Error('walletAddress is required when not authenticated');
    }

    const chainId = getChainId();
    return getFeedbackHistoryHandler(targetAddress, chainId, input.limit);
  },
};
