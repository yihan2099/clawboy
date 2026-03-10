import { z } from 'zod';
import { getTaskHandler } from '../../services/task-service';
import { hasJudgedTask } from '@pactprotocol/database';

export const submitJudgmentSchema = z.object({
  taskId: z.string().min(1).max(100),
  ranking: z
    .array(z.number().int().min(0))
    .min(2)
    .max(255),
});

export type SubmitJudgmentInput = z.infer<typeof submitJudgmentSchema>;

export const submitJudgmentTool = {
  name: 'submit_judgment',
  description:
    'Submit a ranking of submissions for a task in judge phase. Provide an array where ranking[i] = position of submission i (0 = best). All submissions must be ranked.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to judge',
      },
      ranking: {
        type: 'array',
        items: { type: 'number' },
        description:
          'Ranking array: ranking[i] = position of submission i (0 = best). Must include all submissions.',
      },
    },
    required: ['taskId', 'ranking'],
  },
  handler: async (args: unknown, context: { callerAddress: `0x${string}` }) => {
    const input = submitJudgmentSchema.parse(args);

    // Verify task exists
    const task = await getTaskHandler({ taskId: input.taskId });
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    // V2: Check phase (must be judge_phase)
    if (task.phase !== 'judge_phase') {
      throw new Error(
        `Cannot submit judgment for task in phase: ${task.phase}. Task must be in judge_phase.`
      );
    }

    // Check judge deadline
    const judgeDeadline = task.judgeDeadline;
    if (judgeDeadline && new Date(judgeDeadline) < new Date()) {
      throw new Error(
        `Judge deadline has passed (deadline: ${judgeDeadline}). Judgments are no longer accepted.`
      );
    }

    // Check if already judged
    const alreadyJudged = await hasJudgedTask(input.taskId, context.callerAddress);
    if (alreadyJudged) {
      throw new Error('You have already submitted a judgment for this task.');
    }

    // Validate ranking covers all submissions
    const submissionCount = task.submissionCount;
    if (submissionCount && input.ranking.length !== submissionCount) {
      throw new Error(
        `Ranking must cover all ${submissionCount} submissions. Got ${input.ranking.length} entries.`
      );
    }

    // Validate ranking is a valid permutation (0 to N-1)
    const sorted = [...input.ranking].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i) {
        throw new Error(
          `Invalid ranking: must be a permutation of [0, 1, ..., ${sorted.length - 1}]. ` +
          `Got duplicate or out-of-range values.`
        );
      }
    }

    // Check if judge slots are full
    const judgmentCount = task.judgmentCount;
    const requiredJudges = task.requiredJudges;
    if (requiredJudges && judgmentCount !== undefined && judgmentCount >= requiredJudges) {
      throw new Error(
        `All ${requiredJudges} judge slots are filled. No more judgments accepted.`
      );
    }

    return {
      message: 'Judgment validated. Submit on-chain to finalize.',
      taskId: input.taskId,
      ranking: input.ranking,
      nextStep: 'Call TaskManagerV2.submitJudgment(taskId, ranking) on-chain to record your judgment.',
    };
  },
};
