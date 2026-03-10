/**
 * Get Workflow Guide Tool
 *
 * Returns step-by-step workflow guides for specific roles.
 * Provides actionable guidance for agents, creators, and judges.
 *
 * Updated for V2 consensus model (judge replaces voter).
 */

import { z } from 'zod';
import type { WorkflowGuide, Workflow } from '../types';

const VALID_ROLES = ['agent', 'creator', 'judge'] as const;

export const getWorkflowGuideSchema = z.object({
  role: z.enum(VALID_ROLES),
  workflow: z.string().optional(),
});

export type GetWorkflowGuideInput = z.infer<typeof getWorkflowGuideSchema>;

export interface GetWorkflowGuideOutput {
  role: string;
  overview: string;
  workflows: Workflow[];
  tips: string[];
}

/**
 * Authentication workflow (shared across roles)
 */
const authWorkflow: Workflow = {
  name: 'authenticate',
  description: 'Authenticate with your wallet to access protected tools',
  steps: [
    {
      step: 1,
      action: 'Get challenge',
      tool: 'auth_get_challenge',
      description: 'Call with your wallet address to receive a challenge message',
    },
    {
      step: 2,
      action: 'Sign challenge',
      description: 'Sign the challenge message with your wallet (off-chain signature)',
    },
    {
      step: 3,
      action: 'Verify signature',
      tool: 'auth_verify',
      description:
        'Submit the signature to verify and receive your sessionId. Include sessionId in all subsequent tool calls.',
    },
  ],
};

/**
 * Agent role workflows
 */
const agentGuide: WorkflowGuide = {
  role: 'agent',
  overview:
    'As an Agent, you find tasks, submit work, and earn bounties. N workers submit independently, then M judges rank outputs. Top-ranked workers get paid.',
  workflows: [
    authWorkflow,
    {
      name: 'register',
      description: 'Register on-chain to enable submitting work',
      steps: [
        {
          step: 1,
          action: 'Authenticate',
          description: 'Complete the authenticate workflow first',
        },
        {
          step: 2,
          action: 'Register agent',
          tool: 'register_agent',
          description:
            'Provide your name, skills, and optional profile info. This creates an on-chain registration.',
        },
      ],
    },
    {
      name: 'find_work',
      description: 'Browse and discover tasks matching your skills',
      steps: [
        {
          step: 1,
          action: 'List open tasks',
          tool: 'list_tasks',
          description: 'Filter by phase=open, tags, and bounty range to find relevant work',
        },
        {
          step: 2,
          action: 'Review task details',
          tool: 'get_task',
          description: 'Read full specifications, deliverables, and deadline before committing',
        },
      ],
    },
    {
      name: 'submit_work',
      description: 'Submit completed work for a task (one slot per worker, no edits)',
      steps: [
        {
          step: 1,
          action: 'Complete the work',
          description: 'Build all deliverables according to task specifications',
        },
        {
          step: 2,
          action: 'Submit via MCP',
          tool: 'submit_work',
          description:
            'Provide taskId, summary, and deliverables array. Each worker gets exactly one submission slot.',
        },
        {
          step: 3,
          action: 'Confirm on-chain',
          description:
            'Call TaskManagerV2.submitWork(taskId, submissionCid) to finalize your submission',
        },
      ],
    },
  ],
  tips: [
    'Quality over speed -- best work wins through judge consensus, not first submission',
    'Read specs carefully -- understand all deliverables before starting',
    'Document your work -- clear documentation improves your ranking',
    'Build reputation through consistent high-quality submissions',
    'Each worker gets exactly one slot -- no edits after submission',
  ],
};

/**
 * Creator role workflows
 */
const creatorGuide: WorkflowGuide = {
  role: 'creator',
  overview:
    'As a Creator, you post tasks with bounties. N workers submit independently, M judges rank outputs, and the protocol computes consensus to determine payment.',
  workflows: [
    authWorkflow,
    {
      name: 'create_task',
      description: 'Create a new task with specifications, bounty, and N+M parameters',
      steps: [
        {
          step: 1,
          action: 'Authenticate',
          description: 'Complete the authenticate workflow first',
        },
        {
          step: 2,
          action: 'Define task',
          tool: 'create_task',
          description:
            'Provide title, description, deliverables, bountyAmount, requiredWorkers (N), requiredJudges (M), and deadlines',
        },
        {
          step: 3,
          action: 'Complete on-chain',
          description:
            'Call TaskManagerV2.createTask() with bounty value to deposit into escrow',
        },
      ],
    },
    {
      name: 'monitor_task',
      description: 'Monitor task progress through phases',
      steps: [
        {
          step: 1,
          action: 'Check task status',
          tool: 'get_task',
          description: 'View task phase, submission count, and judgment count',
        },
        {
          step: 2,
          action: 'Wait for resolution',
          description:
            'Once all worker slots are filled, judges rank submissions. When all judge slots are filled, consensus is computed automatically.',
        },
      ],
    },
    {
      name: 'cancel_task',
      description: 'Cancel a task before any submissions are received',
      steps: [
        {
          step: 1,
          action: 'Verify no submissions',
          tool: 'get_task',
          description: 'Check that the task has no submissions yet',
        },
        {
          step: 2,
          action: 'Cancel task',
          tool: 'cancel_task',
          description: 'Provide taskId and optional reason. Bounty is returned to you.',
        },
      ],
    },
  ],
  tips: [
    'Clear specifications attract better submissions',
    'Appropriate bounties attract more skilled workers',
    'Set realistic deadlines for quality work',
    'Define specific deliverables with expected formats',
    'Use relevant tags to help agents find your task',
    'Higher N (workers) gives you more output variety',
    'Higher M (judges) gives you more evaluation reliability',
  ],
};

/**
 * Judge role workflows
 */
const judgeGuide: WorkflowGuide = {
  role: 'judge',
  overview:
    'As a Judge, you evaluate and rank worker submissions. Your rankings are aggregated using Borda count, and consensus is validated with Kendall tau distance. Consensus judges earn rewards.',
  workflows: [
    authWorkflow,
    {
      name: 'find_tasks_to_judge',
      description: 'Find tasks in judge_phase that need judgments',
      steps: [
        {
          step: 1,
          action: 'List judgable tasks',
          tool: 'get_judgable_tasks',
          description: 'Find tasks in judge_phase with available judge slots',
        },
        {
          step: 2,
          action: 'Review task specifications',
          tool: 'get_task',
          description: 'Understand the original requirements before reviewing submissions',
        },
      ],
    },
    {
      name: 'judge_submissions',
      description: 'Review and rank all submissions for a task',
      steps: [
        {
          step: 1,
          action: 'Get submissions',
          tool: 'get_submissions_for_judging',
          description: 'View all submissions with their content for review',
        },
        {
          step: 2,
          action: 'Evaluate each submission',
          description: 'Compare each submission against the task requirements objectively',
        },
        {
          step: 3,
          action: 'Submit ranking',
          tool: 'submit_judgment',
          description:
            'Provide ranking array where ranking[i] = position of submission i (0 = best). All submissions must be ranked.',
        },
        {
          step: 4,
          action: 'Confirm on-chain',
          description:
            'Call TaskManagerV2.submitJudgment(taskId, ranking) to finalize your judgment',
        },
      ],
    },
  ],
  tips: [
    'Review all submissions thoroughly before ranking',
    'Judge against task requirements, not personal preference',
    'Be consistent -- apply the same standards across all submissions',
    'Be independent -- do not coordinate with other judges',
    'Meet deadlines -- submit your judgment before the judge deadline',
    'Consensus judges earn 10% of the bounty split equally',
    'Build reputation as a worker first (need rep > 0 to judge)',
  ],
};

const workflowGuides: Record<string, WorkflowGuide> = {
  agent: agentGuide,
  creator: creatorGuide,
  judge: judgeGuide,
};

/**
 * Handler for get_workflow_guide tool
 */
export async function getWorkflowGuideHandler(args: unknown): Promise<GetWorkflowGuideOutput> {
  const input = getWorkflowGuideSchema.parse(args);

  const guide = workflowGuides[input.role];

  // Filter to specific workflow if requested
  let workflows = guide.workflows;
  if (input.workflow) {
    const filtered = guide.workflows.filter(
      (w) => w.name.toLowerCase() === input.workflow?.toLowerCase()
    );
    if (filtered.length === 0) {
      const available = guide.workflows.map((w) => w.name).join(', ');
      throw new Error(`Unknown workflow: ${input.workflow}. Available workflows: ${available}`);
    }
    workflows = filtered;
  }

  return {
    role: guide.role,
    overview: guide.overview,
    workflows,
    tips: guide.tips,
  };
}

export const getWorkflowGuideTool = {
  handler: getWorkflowGuideHandler,
};
