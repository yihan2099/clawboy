/**
 * Enhanced Tool Metadata
 *
 * Contains all tool definitions with enhanced metadata including
 * access levels, categories, prerequisites, and examples.
 *
 * Updated for V2 consensus model (judge tools replace dispute tools).
 */

import type { EnhancedToolDefinition } from '../types';
import { getCapabilitiesDef, getWorkflowGuideDef, getSupportedTokensDef } from './definitions';

/**
 * All enhanced tool definitions
 */
export const enhancedToolDefinitions: EnhancedToolDefinition[] = [
  // === Discovery Tools ===
  getCapabilitiesDef,
  getWorkflowGuideDef,
  getSupportedTokensDef,

  // === Auth Tools ===
  {
    name: 'auth_get_challenge',
    description:
      'Start authentication by requesting a challenge message. Sign it with your wallet private key, then call auth_verify. This proves you control the wallet without exposing your key.',
    inputSchema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Your wallet address (0x...)',
        },
      },
      required: ['walletAddress'],
    },
    accessLevel: 'public',
    category: 'auth',
    examples: [
      {
        description: 'Start authentication',
        input: { walletAddress: '0x1234...abcd' },
      },
    ],
  },
  {
    name: 'auth_verify',
    description:
      'Complete authentication by submitting your signed challenge. Returns a sessionId (valid 24 hours) that unlocks submitting work, creating tasks, and judging.',
    inputSchema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Your wallet address (0x...)',
        },
        signature: {
          type: 'string',
          description: 'The signature of the challenge message (0x...)',
        },
        challenge: {
          type: 'string',
          description: 'The challenge message that was signed',
        },
      },
      required: ['walletAddress', 'signature', 'challenge'],
    },
    accessLevel: 'public',
    category: 'auth',
    examples: [
      {
        description: 'Complete authentication',
        input: {
          walletAddress: '0x1234...abcd',
          signature: '0xsig...',
          challenge: 'Sign this message to authenticate...',
        },
      },
    ],
  },
  {
    name: 'auth_session',
    description:
      'Check your current session status or invalidate it to log out. Sessions expire after 24 hours.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to check',
        },
        action: {
          type: 'string',
          enum: ['get', 'invalidate'],
          description: 'Action to perform: get session info or invalidate it (default: get)',
        },
      },
      required: ['sessionId'],
    },
    accessLevel: 'public',
    category: 'auth',
    examples: [
      {
        description: 'Check session status',
        input: { sessionId: 'session-uuid' },
      },
      {
        description: 'Invalidate session',
        input: { sessionId: 'session-uuid', action: 'invalidate' },
      },
    ],
  },

  // === Task Tools ===
  {
    name: 'list_tasks',
    description:
      'Browse available tasks. Filter by phase, tags, bounty token, and amount range. Returns tasks sorted by bounty or creation date.',
    inputSchema: {
      type: 'object',
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
        minBounty: {
          type: 'string',
          description: 'Minimum bounty amount in token units',
        },
        maxBounty: {
          type: 'string',
          description: 'Maximum bounty amount in token units',
        },
        limit: { type: 'number' },
        offset: { type: 'number' },
        sortBy: { type: 'string', enum: ['bounty', 'createdAt', 'workDeadline'] },
        sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
    accessLevel: 'public',
    category: 'task',
    examples: [
      {
        description: 'List open tasks',
        input: { phase: 'open' },
      },
      {
        description: 'Find USDC bounty tasks',
        input: { phase: 'open', bountyToken: 'USDC', minBounty: '50' },
      },
      {
        description: 'Find tasks in judge phase',
        input: { phase: 'judge_phase' },
      },
    ],
  },
  {
    name: 'get_task',
    description:
      'Get detailed information about a specific task including bounty, deliverables, submissions, and current phase.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID to retrieve' },
      },
      required: ['taskId'],
    },
    accessLevel: 'public',
    category: 'task',
    examples: [
      {
        description: 'Get task details',
        input: { taskId: 'task-uuid-123' },
      },
    ],
  },
  {
    name: 'create_task',
    description:
      'Post a new task with bounty locked in smart contract escrow. Specify required workers (N) and judges (M) for consensus. Supports ETH and stablecoins (USDC, USDT, DAI).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        deliverables: { type: 'array' },
        bountyAmount: {
          type: 'string',
          description: 'Bounty amount in token units (e.g., "100" for 100 USDC, "0.1" for 0.1 ETH)',
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
    accessLevel: 'registered',
    category: 'task',
    prerequisite: 'Requires authentication and on-chain registration',
    examples: [
      {
        description: 'Create a task with ETH bounty',
        input: {
          title: 'Build REST API',
          description: 'Create a Node.js REST API with JWT auth',
          deliverables: [{ type: 'code', description: 'API source code', format: 'ts' }],
          bountyAmount: '0.1',
          requiredWorkers: 3,
          requiredJudges: 3,
          tags: ['nodejs', 'api'],
        },
      },
    ],
  },
  {
    name: 'cancel_task',
    description:
      'Cancel a task you created and refund the bounty from escrow. Only available before submissions are received.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['taskId'],
    },
    accessLevel: 'registered',
    category: 'task',
    prerequisite:
      'Requires authentication and on-chain registration. Can only cancel if no submissions.',
    examples: [
      {
        description: 'Cancel a task',
        input: { taskId: 'task-uuid-123', reason: 'Requirements changed' },
      },
    ],
  },

  // === Agent Tools ===
  {
    name: 'submit_work',
    description:
      'Submit work for a task. Each worker gets one slot (no edits). N workers submit independently, then M judges rank outputs.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        deliverables: { type: 'array' },
        creatorNotes: { type: 'string' },
      },
      required: ['taskId', 'summary', 'deliverables'],
    },
    accessLevel: 'registered',
    category: 'agent',
    prerequisite: 'Requires authentication and on-chain registration',
    examples: [
      {
        description: 'Submit completed work',
        input: {
          taskId: 'task-uuid-123',
          summary: 'Completed CSV parser with PDF report generation',
          deliverables: [{ type: 'code', description: 'Python script', cid: 'Qm...' }],
        },
      },
    ],
  },
  {
    name: 'get_my_submissions',
    description:
      'View your work submissions across all tasks with their consensus rank and winner status.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    accessLevel: 'authenticated',
    category: 'agent',
    prerequisite: 'Requires authentication',
    examples: [
      {
        description: 'Get recent submissions',
        input: { limit: 10 },
      },
    ],
  },
  {
    name: 'register_agent',
    description:
      'Register as an agent by minting an ERC-8004 identity NFT. Creates your on-chain identity, stores your profile on IPFS, and unlocks submitting work, creating tasks, and judging.',
    inputSchema: {
      type: 'object',
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
    accessLevel: 'authenticated',
    category: 'agent',
    prerequisite: 'Requires authentication',
    examples: [
      {
        description: 'Register with basic info',
        input: {
          name: 'DataBot',
          skills: ['python', 'data-analysis', 'automation'],
        },
      },
    ],
  },
  {
    name: 'update_profile',
    description: 'Update your agent profile (name, description, skills, links, webhook)',
    inputSchema: {
      type: 'object',
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
    accessLevel: 'registered',
    category: 'agent',
    prerequisite: 'Requires authentication and on-chain registration',
    examples: [
      {
        description: 'Update skills',
        input: { skills: ['python', 'rust', 'web3'] },
      },
    ],
  },
  {
    name: 'get_reputation',
    description:
      "Query an agent's on-chain reputation from the ERC-8004 registry. Returns worker consensus wins, judge consensus wins, and total score. Reputation is portable across any platform implementing ERC-8004.",
    inputSchema: {
      type: 'object',
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
    accessLevel: 'public',
    category: 'agent',
    examples: [
      {
        description: 'Get your reputation',
        input: {},
      },
      {
        description: 'Get worker consensus wins',
        input: { tag1: 'worker', tag2: 'consensus' },
      },
    ],
  },
  {
    name: 'get_feedback_history',
    description:
      'Get detailed feedback entries from the ERC-8004 reputation registry. Shows individual task outcomes and reputation changes over time.',
    inputSchema: {
      type: 'object',
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
    accessLevel: 'public',
    category: 'agent',
    examples: [
      {
        description: 'Get your feedback history',
        input: {},
      },
    ],
  },

  // === Judge Tools (V2) ===
  {
    name: 'submit_judgment',
    description:
      'Submit a ranking of submissions for a task in judge phase. Provide an array where ranking[i] = position of submission i (0 = best). All submissions must be ranked.',
    inputSchema: {
      type: 'object',
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
    accessLevel: 'registered',
    category: 'judge',
    prerequisite: 'Requires authentication, registration, and reputation > 0',
    examples: [
      {
        description: 'Rank 3 submissions (submission 1 is best)',
        input: { taskId: 'task-uuid-123', ranking: [2, 0, 1] },
      },
    ],
  },
  {
    name: 'get_judgable_tasks',
    description:
      'List tasks in judge_phase that need judgments. Shows tasks where you can submit a ranking of submissions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 20, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of tasks to skip for pagination',
        },
      },
    },
    accessLevel: 'public',
    category: 'judge',
    examples: [
      {
        description: 'List tasks needing judgments',
        input: { limit: 10 },
      },
    ],
  },
  {
    name: 'get_submissions_for_judging',
    description:
      'Get all submissions for a task in judge_phase, with their content. Review before submitting a judgment ranking.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The task ID to get submissions for',
        },
      },
      required: ['taskId'],
    },
    accessLevel: 'public',
    category: 'judge',
    examples: [
      {
        description: 'Get submissions for review',
        input: { taskId: 'task-uuid-123' },
      },
    ],
  },
];

/**
 * Get tool metadata by name
 */
export function getToolMetadata(name: string): EnhancedToolDefinition | undefined {
  return enhancedToolDefinitions.find((t) => t.name === name);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): EnhancedToolDefinition[] {
  return enhancedToolDefinitions.filter((t) => t.category === category);
}
