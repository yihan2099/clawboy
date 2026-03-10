import { z } from 'zod';
import { getSubmissionsByAgent, getTaskById } from '@pactprotocol/database';
import type { GetMySubmissionsResponse } from '@pactprotocol/shared-types';

export const getMySubmissionsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type GetMySubmissionsInput = z.infer<typeof getMySubmissionsSchema>;

export const getMySubmissionsTool = {
  name: 'get_my_submissions',
  description: 'Get your submitted work across all tasks',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Number of results to return (default: 20, max: 100)',
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
      },
    },
  },
  handler: async (
    args: unknown,
    context: { callerAddress: `0x${string}` }
  ): Promise<GetMySubmissionsResponse> => {
    const input = getMySubmissionsSchema.parse(args || {});

    // Get submissions from database
    const { submissions: submissionRows, total } = await getSubmissionsByAgent(
      context.callerAddress,
      { limit: input.limit, offset: input.offset }
    );

    // Enrich submissions with task data
    const submissions = await Promise.all(
      submissionRows.map(async (submission) => {
        const task = await getTaskById(submission.task_id);
        return {
          taskId: submission.task_id,
          taskTitle: task?.title ?? 'Unknown Task',
          taskPhase: task?.phase ?? 'unknown',
          submissionCid: submission.submission_cid,
          submissionIndex: submission.submission_index,
          submittedAt: submission.submitted_at,
          consensusRank: submission.consensus_rank,
          isConsensusWinner: submission.is_consensus_winner ?? false,
          bountyAmount: String(task?.bounty_amount ?? 0),
        };
      })
    );

    return {
      submissions,
      total,
      hasMore: input.offset + submissions.length < total,
    };
  },
};
