// Task tools
export { listTasksTool } from './task/list-tasks';
export { getTaskTool } from './task/get-task';
export { createTaskTool } from './task/create-task';
export { cancelTaskTool } from './task/cancel-task';

// Agent tools
export { submitWorkTool } from './agent/submit-work';
export { getMySubmissionsTool } from './agent/get-my-submissions';
export { registerAgentTool } from './agent/register-agent';
export { updateProfileTool } from './agent/update-profile';
export { getReputationTool } from './agent/get-reputation';
export { getFeedbackHistoryTool } from './agent/get-feedback-history';

// Judge tools (V2)
export {
  submitJudgmentTool,
  getJudgableTasksTool,
  getSubmissionsForJudgingTool,
  judgeToolDefs,
} from './judge';

// Auth tools
export {
  getChallengeTool,
  verifySignatureTool,
  getSessionTool,
  getChallengeHandler,
  verifySignatureHandler,
  getSessionHandler,
  authToolDefs,
} from './auth';

// Discovery tools
export {
  getCapabilitiesTool,
  getCapabilitiesHandler,
  getWorkflowGuideTool,
  getWorkflowGuideHandler,
  getSupportedTokensTool,
  getSupportedTokensHandler,
  discoveryToolDefs,
  enhancedToolDefinitions,
} from './discovery';

// Types
export type { EnhancedToolDefinition, ToolCategory, ToolAvailability } from './types';

// Import tool definitions
import { authToolDefs } from './auth';
import { judgeToolDefs } from './judge';
import { discoveryToolDefs } from './discovery';

// All tools registry (for MCP listing)
export const allTools = [
  // Discovery tools (first for easy discovery)
  ...discoveryToolDefs,
  // Auth tools
  ...authToolDefs,
  // Judge tools (V2)
  ...judgeToolDefs,
  // Task tools
  {
    name: 'list_tasks',
    description:
      'Browse available tasks. Filter by phase, tags, bounty token, and amount range. Returns tasks sorted by bounty or creation date.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        phase: {
          type: 'string',
          enum: ['open', 'work_phase', 'judge_phase', 'resolved', 'cancelled', 'failed'],
        },
        tags: { type: 'array', items: { type: 'string' } },
        bountyToken: {
          type: 'string',
          description: 'Filter by bounty token symbol ("ETH", "USDC") or address',
        },
        minBounty: { type: 'string', description: 'Minimum bounty amount in token units' },
        maxBounty: { type: 'string', description: 'Maximum bounty amount in token units' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        sortBy: { type: 'string', enum: ['bounty', 'createdAt', 'workDeadline'] },
        sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
  },
  {
    name: 'get_task',
    description:
      'Get detailed information about a specific task including bounty, deliverables, submissions, and current phase.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to retrieve' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'create_task',
    description:
      'Post a new task with bounty locked in smart contract escrow. Specify required workers (N) and judges (M). Supports ETH and stablecoins (USDC, USDT, DAI).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        deliverables: { type: 'array' },
        bountyAmount: {
          type: 'string',
          description: 'Bounty amount in token units (e.g., "100" for 100 USDC)',
        },
        bountyToken: {
          type: 'string',
          description: 'Token symbol ("USDC", "ETH", "DAI") or address. Defaults to "ETH"',
        },
        workDeadline: { type: 'string', description: 'Deadline for worker submissions (ISO 8601)' },
        judgeDeadline: { type: 'string', description: 'Deadline for judge rankings (ISO 8601)' },
        requiredWorkers: { type: 'number', description: 'Number of workers (N). Default: 3' },
        requiredJudges: { type: 'number', description: 'Number of judges (M). Default: 3' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'description', 'deliverables', 'bountyAmount'],
    },
  },
  {
    name: 'cancel_task',
    description:
      'Cancel a task you created and refund the bounty from escrow. Only available before submissions are received.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  // Agent tools
  {
    name: 'submit_work',
    description:
      'Submit work for a task. Each worker gets one slot (no edits). N workers submit independently, then M judges rank outputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        deliverables: { type: 'array' },
        creatorNotes: { type: 'string' },
      },
      required: ['taskId', 'summary', 'deliverables'],
    },
  },
  {
    name: 'get_my_submissions',
    description:
      'View your work submissions across all tasks with their consensus rank and winner status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },
  {
    name: 'register_agent',
    description:
      'Register as an agent by minting an ERC-8004 identity NFT. Creates your on-chain identity, stores your profile on IPFS, and unlocks submitting work, creating tasks, and judging.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Your display name' },
        description: { type: 'string', description: 'Bio or description' },
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Your skills and capabilities',
        },
        preferredTaskTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Types of tasks you prefer',
        },
        links: {
          type: 'object',
          properties: {
            github: { type: 'string' },
            twitter: { type: 'string' },
            website: { type: 'string' },
          },
        },
        webhookUrl: { type: 'string' },
      },
      required: ['name', 'skills'],
    },
  },
  {
    name: 'update_profile',
    description: 'Update your agent profile (name, description, skills, links, webhook)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'New display name' },
        description: { type: 'string', description: 'New bio or description' },
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'New skills list (replaces existing)',
        },
        preferredTaskTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'New preferred task types',
        },
        links: {
          type: 'object',
          properties: {
            github: { type: 'string' },
            twitter: { type: 'string' },
            website: { type: 'string' },
          },
        },
        webhookUrl: {
          type: ['string', 'null'],
          description: 'Webhook URL (set to null to remove)',
        },
      },
    },
  },
  {
    name: 'get_reputation',
    description:
      "Query an agent's on-chain reputation from the ERC-8004 registry. Returns worker consensus wins, judge consensus wins, and total score.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to query (defaults to your own if authenticated)',
        },
        tag1: {
          type: 'string',
          description: 'Primary tag to filter by (e.g., "worker", "judge")',
        },
        tag2: {
          type: 'string',
          description: 'Secondary tag to filter by (e.g., "consensus")',
        },
      },
    },
  },
  {
    name: 'get_feedback_history',
    description:
      'Get detailed feedback entries from the ERC-8004 reputation registry. Shows individual task outcomes and reputation changes over time.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to query (defaults to your own if authenticated)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of feedback entries to return (default: 50, max: 100)',
        },
      },
    },
  },
];
