import { z } from 'zod';
import { getDisputeHandler } from '../../services/dispute-service';

export const getDisputeSchema = z.object({
  disputeId: z.string().min(1),
});

export type GetDisputeInput = z.infer<typeof getDisputeSchema>;

export const getDisputeTool = {
  name: 'get_dispute',
  description: 'Get detailed information about a specific dispute including votes',
  inputSchema: {
    type: 'object' as const,
    properties: {
      disputeId: {
        type: 'string',
        description: 'The on-chain dispute ID',
      },
    },
    required: ['disputeId'],
  },
  handler: async (args: unknown) => {
    const input = getDisputeSchema.parse(args);
    return getDisputeHandler(input);
  },
};
