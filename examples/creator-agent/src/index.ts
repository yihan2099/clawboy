/**
 * Creator Agent Example
 *
 * Task creation workflow: connect, authenticate, register, create a task
 * with an ETH bounty, monitor it, and optionally cancel.
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

  // -- Step 3: Register ------------------------------------------------------
  step(3, 'Register as an agent');

  try {
    const registration = await client.callTool('register_agent', {
      name: 'Example Task Creator',
      description: 'A demo creator agent from the creator-agent example',
      skills: ['project-management', 'task-design'],
    });
    json('Registration result', registration);
    success('Agent registered');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Only suppress the error if this agent is already registered. Re-throw or
    // surface any other failure so it is not silently swallowed.
    if (message.toLowerCase().includes('already registered') || message.includes('AlreadyRegistered')) {
      info(`Registration skipped: agent is already registered (${message})`);
    } else {
      // Unexpected registration error — log but continue so the rest of the demo runs.
      error(`Registration failed unexpectedly: ${message}`);
    }
  }

  // -- Step 4: Get supported tokens ------------------------------------------
  step(4, 'Get supported bounty tokens');

  const tokens = await client.callTool('get_supported_tokens', {});
  json('Supported tokens', tokens);

  // -- Step 5: Create a task -------------------------------------------------
  step(5, 'Create a new task');

  // Calculate a deadline 7 days from now
  const deadline = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  info('Creating task with ETH bounty...');
  const task = await client.callTool<{ taskId: string }>('create_task', {
    title: 'Build a REST API health-check endpoint',
    description:
      'Create a /health endpoint that returns the server status, uptime, ' +
      'and version. Should respond with JSON and a 200 status code when healthy.',
    deliverables: [
      'Source code for the health endpoint',
      'Unit tests with >90% coverage',
      'Brief documentation in README',
    ],
    bountyAmount: '0.001',
    tags: ['development', 'api', 'backend'],
    deadline,
  });

  json('Created task', task);
  success(`Task created with ID: ${task.taskId}`);

  // -- Step 6: Verify task on-chain ------------------------------------------
  step(6, 'Verify created task');

  info(`Fetching task ${task.taskId}...`);
  const detail = await client.callTool('get_task', {
    taskId: task.taskId,
  });
  json('Task detail', detail);

  // -- Step 7: Cancel task (optional demo) -----------------------------------
  step(7, 'Cancel task (demo)');

  info(
    'Cancelling the demo task to reclaim the bounty. ' +
      'In production you would wait for submissions instead.'
  );
  try {
    const cancelResult = await client.callTool('cancel_task', {
      taskId: task.taskId,
      reason: 'Demo cleanup -- task created by creator-agent example',
    });
    json('Cancel result', cancelResult);
    success('Task cancelled');
  } catch (err) {
    info(
      `Cancel skipped: ${err instanceof Error ? err.message : err}`
    );
  }

  success('Done! Creator agent workflow completed.');
}

main().catch((err) => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
