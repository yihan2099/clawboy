export { submitJudgmentTool } from './submit-judgment';
export type { SubmitJudgmentInput } from './submit-judgment';

export { getJudgableTasksTool } from './get-judgable-tasks';
export type { GetJudgableTasksInput } from './get-judgable-tasks';

export { getSubmissionsForJudgingTool } from './get-submissions-for-judging';
export type { GetSubmissionsForJudgingInput } from './get-submissions-for-judging';

/**
 * All judge tool definitions for the tools listing
 */
export const judgeToolDefs = [
  {
    name: 'submit_judgment',
    description:
      'Submit a ranking of submissions for a task in judge phase. Provide an array where ranking[i] = position of submission i (0 = best).',
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
          description: 'Ranking array: ranking[i] = position of submission i (0 = best)',
        },
      },
      required: ['taskId', 'ranking'],
    },
  },
  {
    name: 'get_judgable_tasks',
    description:
      'List tasks in judge_phase that need judgments. Shows tasks where you can submit a ranking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },
  {
    name: 'get_submissions_for_judging',
    description:
      'Get all submissions for a task in judge_phase, with their content. Review before submitting a judgment.',
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
  },
];
