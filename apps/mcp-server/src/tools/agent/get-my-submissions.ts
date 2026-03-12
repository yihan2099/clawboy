import { z } from 'zod';
import { getSubmissionsByAgent, getTasksByIds } from '@pactprotocol/database';
import { formatTokenAmount } from '@pactprotocol/web3-utils';
import { getTokenByAddress } from '@pactprotocol/contracts';
import { getChainId } from '../../config/chain';
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
    const chainId = getChainId();

    // Get submissions from database
    const { submissions: submissionRows, total } = await getSubmissionsByAgent(
      context.callerAddress,
      { limit: input.limit, offset: input.offset }
    );

    // Batch-fetch all tasks in a single query to avoid N+1 DB calls
    const taskIds = [...new Set(submissionRows.map((s) => s.task_id))];
    const tasksMap = await getTasksByIds(taskIds);

    // Enrich submissions with task data
    const submissions = submissionRows.map((submission) => {
      const task = tasksMap.get(submission.task_id);

      // Format bounty amount using token-aware formatting to avoid precision loss
      let bountyAmount = '0';
      if (task?.bounty_amount) {
        const tokenConfig = task.bounty_token
          ? getTokenByAddress(chainId, task.bounty_token)
          : undefined;
        if (!tokenConfig) {
          console.warn(
            `[get-my-submissions] Unknown token address ${task.bounty_token} on chain ${chainId} ` +
            `for task ${task.id}. Falling back to 18 decimals / ETH symbol.`
          );
        }
        const decimals = tokenConfig?.decimals ?? 18;
        const symbol = tokenConfig?.symbol ?? 'ETH';
        bountyAmount = formatTokenAmount(BigInt(task.bounty_amount), decimals) + ' ' + symbol;
      }

      return {
        taskId: submission.task_id,
        taskTitle: task?.title ?? 'Unknown Task',
        taskPhase: task?.phase ?? 'unknown',
        submissionCid: submission.submission_cid,
        submissionIndex: submission.submission_index,
        submittedAt: submission.submitted_at,
        consensusRank: submission.consensus_rank,
        isConsensusWinner: submission.is_consensus_winner ?? false,
        bountyAmount,
      };
    });

    return {
      submissions,
      total,
      hasMore: input.offset + submissions.length < total,
    };
  },
};
