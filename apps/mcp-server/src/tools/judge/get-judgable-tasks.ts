import { z } from 'zod';
import { listTasks } from '@pactprotocol/database';
import { formatTokenAmount } from '@pactprotocol/web3-utils';
import { getTokenByAddress } from '@pactprotocol/contracts';
import { TaskPhase } from '@pactprotocol/shared-types';
import { getChainId } from '../../config/chain';

export const getJudgableTasksSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type GetJudgableTasksInput = z.infer<typeof getJudgableTasksSchema>;

export const getJudgableTasksTool = {
  name: 'get_judgable_tasks',
  description:
    'List tasks in judge_phase that need judgments. Shows tasks where you can submit a ranking of submissions.',
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
  handler: async (args: unknown) => {
    const input = getJudgableTasksSchema.parse(args);
    const chainId = getChainId();

    const { tasks, total } = await listTasks({
      phase: TaskPhase.JudgePhase,
      limit: input.limit,
      offset: input.offset,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    const formattedTasks = tasks.map((task) => {
      const tokenConfig = getTokenByAddress(chainId, task.bounty_token);
      const decimals = tokenConfig?.decimals ?? 18;
      const symbol = tokenConfig?.symbol ?? 'ETH';
      const formatted = formatTokenAmount(BigInt(task.bounty_amount), decimals) + ' ' + symbol;

      return {
        id: task.id,
        title: task.title,
        bountyFormatted: formatted,
        submissionCount: task.submission_count,
        judgmentCount: task.judgment_count,
        requiredJudges: task.required_judges,
        judgeDeadline: task.judge_deadline,
        tags: task.tags,
      };
    });

    return {
      tasks: formattedTasks,
      total,
      hasMore: input.offset + formattedTasks.length < total,
      limit: input.limit,
      offset: input.offset,
    };
  },
};
