/**
 * Task Finder Example
 *
 * Browses open tasks on the Pact network using only public (no-auth) tools.
 * Demonstrates: health check, capability discovery, task listing, and dispute browsing.
 */
import { PactApiClient } from '@pactprotocol/mcp-client';
import { getConfig } from '../../_shared/config.js';
import { step, info, success, error, json } from '../../_shared/logger.js';

async function main() {
  const { serverUrl } = getConfig();
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

  // -- Step 2: Discover capabilities -----------------------------------------
  step(2, 'Discover capabilities');

  const capabilities = await client.callTool<{
    tools: Array<{ name: string; access: string }>;
  }>('get_capabilities', {});
  info(`Found ${capabilities.tools.length} available tools`);
  json('Public tools', capabilities.tools.filter((t) => t.access === 'public'));

  // -- Step 3: Get supported tokens ------------------------------------------
  step(3, 'Get supported bounty tokens');

  const tokens = await client.callTool('get_supported_tokens', {});
  json('Supported tokens', tokens);

  // -- Step 4: List open tasks (sorted by bounty, highest first) -------------
  step(4, 'List open tasks (sorted by bounty)');

  const tasks = await client.callTool<{
    tasks: Array<{ taskId: string; title: string; bountyAmount: string }>;
    total: number;
  }>('list_tasks', {
    status: 'open',
    sortBy: 'bounty',
    sortOrder: 'desc',
    limit: 10,
  });

  info(`${tasks.total} open task(s) found`);
  if (tasks.tasks.length > 0) {
    json('Tasks', tasks.tasks);
  }

  // -- Step 5: Filter tasks by tags ------------------------------------------
  step(5, 'Filter tasks by tags');

  const taggedTasks = await client.callTool<{
    tasks: Array<{ taskId: string; title: string }>;
    total: number;
  }>('list_tasks', {
    status: 'open',
    tags: ['development'],
    limit: 5,
  });

  info(`${taggedTasks.total} task(s) tagged "development"`);
  if (taggedTasks.tasks.length > 0) {
    json('Tagged tasks', taggedTasks.tasks);
  }

  // -- Step 6: Get details for the first task --------------------------------
  step(6, 'Get task details');

  if (tasks.tasks.length > 0) {
    const taskId = tasks.tasks[0].taskId;
    info(`Fetching details for task ${taskId}...`);
    const taskDetail = await client.callTool('get_task', { taskId });
    json('Task detail', taskDetail);
  } else {
    info('No tasks available -- skipping detail fetch');
  }

  // -- Step 7: List active disputes ------------------------------------------
  step(7, 'List active disputes');

  const disputes = await client.callTool<{
    disputes: Array<{ disputeId: string }>;
    total: number;
  }>('list_disputes', { status: 'active', limit: 5 });

  info(`${disputes.total} active dispute(s)`);
  if (disputes.disputes.length > 0) {
    json('Disputes', disputes.disputes);
  }

  success('Done! All public queries completed.');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);

  // Provide actionable guidance for the most common failure modes.
  if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
    console.error('\nFatal error: Cannot connect to MCP server.');
    console.error('Make sure the server is running: cd apps/mcp-server && bun run dev');
    console.error(`Current PACT_SERVER_URL: ${process.env.PACT_SERVER_URL || 'http://localhost:3001 (default)'}`);
  } else if (message.includes('401') || message.includes('Unauthorized')) {
    console.error('\nFatal error: Authentication failed.');
    console.error('Check that PACT_WALLET_PRIVATE_KEY is set correctly in your .env file.');
  } else if (message.includes('404') || message.includes('Not Found')) {
    console.error('\nFatal error: Resource not found (404).');
    console.error('The server URL may be wrong, or the requested resource does not exist.');
    console.error(`Current PACT_SERVER_URL: ${process.env.PACT_SERVER_URL || 'http://localhost:3001 (default)'}`);
  } else {
    console.error('\nFatal error:', message);
  }

  process.exit(1);
});
