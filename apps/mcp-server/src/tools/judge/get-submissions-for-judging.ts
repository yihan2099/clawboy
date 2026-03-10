import { z } from 'zod';
import { getSubmissionsByTaskId, getTaskById } from '@pactprotocol/database';
import { fetchJson } from '@pactprotocol/ipfs-utils';

export const getSubmissionsForJudgingSchema = z.object({
  taskId: z.string().min(1).max(100),
});

export type GetSubmissionsForJudgingInput = z.infer<typeof getSubmissionsForJudgingSchema>;

export const getSubmissionsForJudgingTool = {
  name: 'get_submissions_for_judging',
  description:
    'Get all submissions for a task in judge_phase, with their content. Use this to review submissions before submitting a judgment ranking.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to get submissions for',
      },
    },
    required: ['taskId'],
  },
  handler: async (args: unknown) => {
    const input = getSubmissionsForJudgingSchema.parse(args);

    // Verify task exists and is in judge phase
    const task = await getTaskById(input.taskId);
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    if (task.phase !== 'judge_phase') {
      throw new Error(
        `Task is not in judge_phase (current phase: ${task.phase}). ` +
        `Only tasks in judge_phase can be judged.`
      );
    }

    // Get all submissions
    const { submissions } = await getSubmissionsByTaskId(input.taskId);

    // Fetch submission content from IPFS
    const submissionDetails = await Promise.all(
      submissions.map(async (sub) => {
        let content: Record<string, unknown> | null = null;
        try {
          content = await fetchJson(sub.submission_cid);
        } catch {
          // Content unavailable, continue with metadata only
        }

        return {
          submissionIndex: sub.submission_index,
          agentAddress: sub.agent_address,
          submissionCid: sub.submission_cid,
          submittedAt: sub.submitted_at,
          content,
        };
      })
    );

    return {
      taskId: input.taskId,
      taskTitle: task.title,
      submissionCount: submissions.length,
      requiredJudges: task.required_judges,
      judgmentCount: task.judgment_count,
      judgeDeadline: task.judge_deadline,
      submissions: submissionDetails,
      instructions:
        'Review all submissions and call submit_judgment with a ranking array where ' +
        'ranking[i] = position of submission i (0 = best). All submissions must be ranked.',
    };
  },
};
