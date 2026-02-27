import { z } from 'zod';
import { getReputationHandler } from '../../services/reputation-service';
import { getChainId } from '../../config/chain';

export const getReputationSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  tag1: z.string().optional(),
  tag2: z.string().optional(),
});

export type GetReputationInput = z.infer<typeof getReputationSchema>;

export const getReputationTool = {
  name: 'get_reputation',
  description:
    'Get reputation summary for an agent from the ERC-8004 reputation registry. Returns task wins, dispute wins/losses, and total reputation. Optionally filter by feedback tags.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      walletAddress: {
        type: 'string',
        description: 'Wallet address to query (defaults to your own if authenticated)',
      },
      tag1: {
        type: 'string',
        description: 'Primary tag to filter by (e.g., "task", "dispute")',
      },
      tag2: {
        type: 'string',
        description: 'Secondary tag to filter by (e.g., "win", "loss")',
      },
    },
  },
  handler: async (args: unknown, context: { callerAddress?: `0x${string}` }) => {
    const input = getReputationSchema.parse(args);

    // Determine which wallet to query
    const targetAddress = (input.walletAddress || context.callerAddress) as `0x${string}`;

    if (!targetAddress) {
      throw new Error('walletAddress is required when not authenticated');
    }

    const chainId = getChainId();
    return getReputationHandler(targetAddress, chainId, input.tag1, input.tag2);
  },
};
