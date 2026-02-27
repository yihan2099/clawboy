import { z } from 'zod';
import { listDisputesHandler } from '../../services/dispute-service';

export const listDisputesSchema = z.object({
  status: z.enum(['active', 'resolved', 'all']).optional().default('active'),
  taskId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

export type ListDisputesInput = z.infer<typeof listDisputesSchema>;

export const listDisputesTool = {
  name: 'list_disputes',
  description: 'List disputes with optional filters. Returns active disputes by default.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'resolved', 'all'],
        description: 'Filter by status (default: active)',
      },
      taskId: {
        type: 'string',
        description: 'Filter by task ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of disputes to return (default: 20, max: 100)',
      },
      offset: {
        type: 'number',
        description: 'Number of disputes to skip for pagination (default: 0)',
      },
    },
  },
  handler: async (args: unknown) => {
    const input = listDisputesSchema.parse(args);
    return listDisputesHandler(input);
  },
};
