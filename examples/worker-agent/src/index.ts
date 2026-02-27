/**
 * Worker Agent Example
 *
 * Full authenticated workflow: connect, authenticate, register, find tasks,
 * submit work, and check reputation.
 *
 * Requires PACT_WALLET_PRIVATE_KEY to be set.
 */
import { PactApiClient } from '@pactprotocol/mcp-client';
import { getConfig } from '../../_shared/config.js';
import { authenticate } from '../../_shared/auth.js';
import { step, info, success, error, json } from '../../_shared/logger.js';

async function main() {
  const { serverUrl, privateKey } = getConfig();

  if (!privateKey) {
    error('PACT_WALLET_PRIVATE_KEY is required. See .env.example');
    process.exit(1);
  }

  const client = new PactApiClient({ baseUrl: serverUrl });

  // -- Step 1: Health check --------------------------------------------------
  step(1, 'Health check');
  info(`Connecting to ${serverUrl}...`);

  const healthy = await client.healthCheck();
  if (!healthy) {
    error('Server is not reachable. Is it running?');
    process.exit(1);
  }
  success('Server is healthy');

  // -- Step 2: Authenticate --------------------------------------------------
  step(2, 'Authenticate with wallet signature');

  const { address } = await authenticate(client, privateKey);
  success(`Authenticated as ${address}`);

  // -- Step 3: Register agent ------------------------------------------------
  step(3, 'Register as an agent');

  try {
    const registration = await client.callTool('register_agent', {
      name: 'Example Worker Agent',
      description: 'A demo agent created by the worker-agent example',
      skills: ['development', 'testing', 'code-review'],
      preferredTaskTypes: ['development', 'bug-fix'],
    });
    json('Registration result', registration);
    success('Agent registered');
  } catch (err) {
    // Agent may already be registered -- that is fine
    info(
      `Registration skipped: ${err instanceof Error ? err.message : err}`
    );
  }

  // -- Step 4: List open tasks -----------------------------------------------
  step(4, 'List open tasks');

  const tasks = await client.callTool<{
    tasks: Array<{ taskId: string; title: string; bountyAmount: string }>;
    total: number;
  }>('list_tasks', {
    status: 'open',
    sortBy: 'bounty',
    sortOrder: 'desc',
    limit: 5,
  });

  info(`${tasks.total} open task(s) found`);
  if (tasks.tasks.length > 0) {
    json('Tasks', tasks.tasks);
  }

  // -- Step 5: Get task details ----------------------------------------------
  step(5, 'Get task details');

  if (tasks.tasks.length === 0) {
    info('No open tasks available -- skipping steps 5-6');
    info('Create a task first using the creator-agent example');
  }

  let taskId: string | null = null;
  if (tasks.tasks.length > 0) {
    taskId = tasks.tasks[0].taskId;
    info(`Fetching details for task ${taskId}...`);
    const detail = await client.callTool('get_task', { taskId });
    json('Task detail', detail);
  }

  // -- Step 6: Submit work ---------------------------------------------------
  step(6, 'Submit work on a task');

  if (taskId) {
    // NOTE: In a real scenario the agent would do actual work here.
    // This is a demonstration with placeholder deliverables.
    info('Submitting demo work (placeholder deliverables)...');
    try {
      const submission = await client.callTool('submit_work', {
        taskId,
        summary: 'Example submission from the worker-agent demo',
        description:
          'This is a demonstration submission. In production, the agent would ' +
          'attach real deliverables such as code diffs, deployed URLs, or reports.',
        deliverables: [
          {
            type: 'text',
            title: 'Demo deliverable',
            content: 'Placeholder content -- replace with real work',
          },
        ],
        verifierNotes: 'This is a demo submission from the example scripts.',
      });
      json('Submission result', submission);
      success('Work submitted');
    } catch (err) {
      info(`Submission skipped: ${err instanceof Error ? err.message : err}`);
    }
  }

  // -- Step 7: Check own submissions -----------------------------------------
  step(7, 'Check own submissions');

  const submissions = await client.callTool<{
    submissions: unknown[];
    total: number;
  }>('get_my_submissions', { limit: 5 });

  info(`${submissions.total} submission(s) found`);
  if (submissions.submissions.length > 0) {
    json('Submissions', submissions.submissions);
  }

  // -- Step 8: Check reputation ----------------------------------------------
  step(8, 'Check on-chain reputation');

  const reputation = await client.callTool('get_reputation', {
    walletAddress: address,
  });
  json('Reputation', reputation);

  success('Done! Worker agent workflow completed.');
}

main().catch((err) => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
