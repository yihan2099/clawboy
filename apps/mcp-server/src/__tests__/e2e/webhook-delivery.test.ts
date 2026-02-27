/**
 * End-to-End Webhook Delivery Tests (Anvil Only)
 *
 * Tests the webhook notification system that the indexer uses to notify agents
 * about blockchain events. Verifies:
 * 1. Webhook fires on task creation (TaskCreated event)
 * 2. HMAC-SHA256 signature verification
 * 3. Webhook fires on work submission (WorkSubmitted event to creator)
 *
 * Architecture:
 * - A local Bun HTTP server acts as the webhook receiver
 * - Webhook URLs are set directly in the DB (bypassing HTTPS validation)
 * - The indexer picks up on-chain events and delivers webhooks to registered agents
 *
 * Prerequisites:
 * - Local Anvil node running (chainId 31337)
 * - Indexer running with Anvil config
 * - MCP server running with Anvil config
 * - E2E_CREATOR_PRIVATE_KEY and E2E_AGENT_PRIVATE_KEY set
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createHmac } from 'crypto';
import {
  createTestWallet,
  authenticateWallet,
  registerAgentOnChain,
  checkAgentRegistered,
  createTaskOnChain,
  submitWorkOnChain,
  waitForTaskInDB,
  sleep,
  resetClients,
  isLocalAnvil,
  gasTracker,
  type TestWallet,
} from './test-utils';
import { registerAgentTool } from '../../tools/agent/register-agent';
import { createTaskTool } from '../../tools/task/create-task';
import { submitWorkTool } from '../../tools/agent/submit-work';
import { getSupabaseAdminClient } from '@pactprotocol/database';

// Test configuration
const TEST_BOUNTY_ETH = '0.001';
const INDEXER_SYNC_WAIT_MS = 15000;
const TEST_TIMEOUT = 60000;
const WEBHOOK_WAIT_MS = 20000; // Max time to wait for webhook delivery
const WEBHOOK_POLL_MS = 500;
const WEBHOOK_SECRET = 'test-webhook-secret-e2e';

// Environment variables
const CREATOR_PRIVATE_KEY = process.env.E2E_CREATOR_PRIVATE_KEY as `0x${string}` | undefined;
const AGENT_PRIVATE_KEY = process.env.E2E_AGENT_PRIVATE_KEY as `0x${string}` | undefined;

// Check if webhook DB schema exists (webhook_secret column on agents table)
async function checkWebhookSchemaExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('agents')
      .select('webhook_secret')
      .limit(0);
    return !error;
  } catch {
    return false;
  }
}

// Pre-check schema synchronously via top-level await
const webhookSchemaExists = await checkWebhookSchemaExists();

const shouldSkipTests =
  !CREATOR_PRIVATE_KEY ||
  !AGENT_PRIVATE_KEY ||
  !CREATOR_PRIVATE_KEY.startsWith('0x') ||
  !AGENT_PRIVATE_KEY.startsWith('0x') ||
  !isLocalAnvil() ||
  !webhookSchemaExists;

/**
 * Recorded webhook request
 */
interface ReceivedWebhook {
  headers: Record<string, string>;
  body: string;
  parsedBody: {
    event?: string;
    taskId?: string;
    timestamp?: string;
    data?: Record<string, unknown>;
  };
  receivedAt: Date;
}

/**
 * Set webhook URL and secret for an agent directly in the DB.
 * Bypasses the HTTPS validation in the update_profile MCP tool.
 */
async function setAgentWebhookInDB(
  address: string,
  webhookUrl: string,
  webhookSecret: string | null
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Try setting both webhook_url and webhook_secret; fall back to just webhook_url
  // if the webhook_secret column doesn't exist (migration not yet applied)
  const updateData: Record<string, string | null> = { webhook_url: webhookUrl };

  // Attempt to set webhook_secret if column exists
  const { error: testError } = await supabase
    .from('agents')
    .update({ webhook_url: webhookUrl, webhook_secret: webhookSecret })
    .eq('address', address.toLowerCase());

  if (testError?.message?.includes('webhook_secret')) {
    // Column doesn't exist, update only webhook_url
    console.warn('webhook_secret column not found, setting only webhook_url');
    const { error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('address', address.toLowerCase());
    if (error) {
      throw new Error(`Failed to set webhook URL in DB: ${error.message}`);
    }
  } else if (testError) {
    throw new Error(`Failed to set webhook URL in DB: ${testError.message}`);
  }
}

/**
 * Wait for webhook(s) to arrive, polling the received array.
 */
async function waitForWebhooks(
  webhooks: ReceivedWebhook[],
  minCount: number,
  maxWaitMs: number = WEBHOOK_WAIT_MS,
  pollMs: number = WEBHOOK_POLL_MS
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (webhooks.length >= minCount) return;
    await sleep(pollMs);
  }
  // Don't throw -- let the test assertion handle the failure with a clear message
}

if (shouldSkipTests && !webhookSchemaExists) {
  console.log('Skipping webhook tests: webhook DB schema not found (webhook_secret column missing from agents table)');
}

describe.skipIf(shouldSkipTests)('E2E: Webhook Delivery (Anvil Only)', () => {
  let creatorWallet: TestWallet;
  let agentWallet: TestWallet;
  let server: ReturnType<typeof Bun.serve>;
  let webhookPort: number;
  const receivedWebhooks: ReceivedWebhook[] = [];

  beforeAll(async () => {
    console.log('\n========================================');
    console.log('E2E Webhook Delivery Test - Local Anvil');
    console.log('========================================\n');

    resetClients();

    // Start mock webhook server
    server = Bun.serve({
      port: 0, // Random available port
      async fetch(req) {
        const body = await req.text();
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // Not JSON, store raw
        }
        const headerRecord: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headerRecord[key] = value;
        });
        receivedWebhooks.push({
          headers: headerRecord,
          body,
          parsedBody: parsedBody as ReceivedWebhook['parsedBody'],
          receivedAt: new Date(),
        });
        return new Response('OK', { status: 200 });
      },
    });
    webhookPort = server.port;
    console.log(`Mock webhook server started on port ${webhookPort}`);

    // Create wallets
    creatorWallet = createTestWallet(CREATOR_PRIVATE_KEY!);
    agentWallet = createTestWallet(AGENT_PRIVATE_KEY!);
    console.log(`Creator wallet: ${creatorWallet.address}`);
    console.log(`Agent wallet: ${agentWallet.address}`);

    // Authenticate both wallets
    await authenticateWallet(creatorWallet);
    await authenticateWallet(agentWallet);
    console.log('Both wallets authenticated');

    // Register agent if needed
    const isAgentRegistered = await checkAgentRegistered(agentWallet.address);
    if (!isAgentRegistered) {
      console.log('Registering agent...');
      const profileResult = await registerAgentTool.handler(
        {
          name: `Webhook Test Agent ${Date.now()}`,
          description: 'Agent for webhook delivery E2E tests',
          skills: ['testing'],
          preferredTaskTypes: ['code'],
        },
        { callerAddress: agentWallet.address }
      );
      await registerAgentOnChain(agentWallet, profileResult.agentURI);
      console.log('Agent registered');
    }

    // Register creator as agent too (so they can receive webhooks)
    const isCreatorRegistered = await checkAgentRegistered(creatorWallet.address);
    if (!isCreatorRegistered) {
      console.log('Registering creator as agent...');
      const profileResult = await registerAgentTool.handler(
        {
          name: `Webhook Test Creator ${Date.now()}`,
          description: 'Creator for webhook delivery E2E tests',
          skills: ['creating'],
          preferredTaskTypes: ['code'],
        },
        { callerAddress: creatorWallet.address }
      );
      await registerAgentOnChain(creatorWallet, profileResult.agentURI);
      console.log('Creator registered as agent');
    }

    // Wait for registration to sync to DB
    await sleep(5000);

    // Set webhook URL for agent in DB (bypasses HTTPS validation)
    const webhookUrl = `http://localhost:${webhookPort}/webhook`;
    await setAgentWebhookInDB(agentWallet.address, webhookUrl, WEBHOOK_SECRET);
    console.log(`Agent webhook URL set: ${webhookUrl}`);

    console.log('Setup complete\n');
  }, TEST_TIMEOUT * 2);

  afterAll(() => {
    server?.stop();
    console.log('Mock webhook server stopped');
    gasTracker.printReport();
  });

  test(
    'Test 1: Webhook fires on task creation',
    async () => {
      console.log('\n--- Test 1: Webhook fires on task creation ---\n');

      // Record starting count so we can detect new webhooks
      const startCount = receivedWebhooks.length;

      // Create a task via MCP
      const taskResult = await createTaskTool.handler(
        {
          title: `Webhook Test Task ${Date.now()}`,
          description: 'Task to test webhook delivery on creation',
          deliverables: [
            {
              type: 'code' as const,
              description: 'Test output',
              format: 'text',
            },
          ],
          bountyAmount: TEST_BOUNTY_ETH,
          tags: ['test', 'webhook'],
        },
        { callerAddress: creatorWallet.address }
      );

      // Create on-chain
      console.log('Creating task on-chain...');
      const { taskId: chainTaskId } = await createTaskOnChain(
        creatorWallet,
        taskResult.specificationCid,
        TEST_BOUNTY_ETH
      );
      console.log(`Chain task ID: ${chainTaskId}`);

      // Wait for indexer to process + webhook delivery
      console.log('Waiting for indexer sync and webhook delivery...');
      await waitForTaskInDB(chainTaskId, INDEXER_SYNC_WAIT_MS, 2000, creatorWallet.address);

      // Wait for webhook to arrive
      await waitForWebhooks(receivedWebhooks, startCount + 1);

      // Verify webhook was received
      const newWebhooks = receivedWebhooks.slice(startCount);
      console.log(`Received ${newWebhooks.length} webhook(s) since task creation`);

      expect(newWebhooks.length).toBeGreaterThanOrEqual(1);

      // Find the TaskCreated webhook
      const taskCreatedWebhook = newWebhooks.find(
        (w) => w.parsedBody.event === 'TaskCreated'
      );
      expect(taskCreatedWebhook).toBeDefined();

      if (taskCreatedWebhook) {
        // Verify headers
        expect(taskCreatedWebhook.headers['x-pact-event']).toBe('TaskCreated');
        expect(taskCreatedWebhook.headers['content-type']).toContain('application/json');
        expect(taskCreatedWebhook.headers['user-agent']).toBe('Pact-Webhook/1.0');

        // Verify payload structure
        expect(taskCreatedWebhook.parsedBody.event).toBe('TaskCreated');
        expect(taskCreatedWebhook.parsedBody.taskId).toBe(chainTaskId.toString());
        expect(taskCreatedWebhook.parsedBody.timestamp).toBeDefined();
        expect(taskCreatedWebhook.parsedBody.data).toBeDefined();

        // Verify payload data
        const data = taskCreatedWebhook.parsedBody.data!;
        expect(data.creator).toBe(creatorWallet.address.toLowerCase());
        expect(data.bountyAmount).toBeDefined();

        console.log(`Event: ${taskCreatedWebhook.parsedBody.event}`);
        console.log(`Task ID: ${taskCreatedWebhook.parsedBody.taskId}`);
        console.log(`Creator: ${data.creator}`);
        console.log(`Bounty: ${data.bountyAmount}`);
      }

      console.log('Webhook delivery on task creation verified');
    },
    TEST_TIMEOUT * 2
  );

  test(
    'Test 2: HMAC signature verification',
    async () => {
      console.log('\n--- Test 2: HMAC signature verification ---\n');

      const startCount = receivedWebhooks.length;

      // Create another task to trigger a webhook
      const taskResult = await createTaskTool.handler(
        {
          title: `HMAC Verify Task ${Date.now()}`,
          description: 'Task to verify HMAC signature on webhook',
          deliverables: [
            {
              type: 'code' as const,
              description: 'Test output',
              format: 'text',
            },
          ],
          bountyAmount: TEST_BOUNTY_ETH,
          tags: ['test', 'hmac'],
        },
        { callerAddress: creatorWallet.address }
      );

      console.log('Creating task on-chain...');
      const { taskId: chainTaskId } = await createTaskOnChain(
        creatorWallet,
        taskResult.specificationCid,
        TEST_BOUNTY_ETH
      );
      console.log(`Chain task ID: ${chainTaskId}`);

      // Wait for indexer + webhook
      await waitForTaskInDB(chainTaskId, INDEXER_SYNC_WAIT_MS, 2000, creatorWallet.address);
      await waitForWebhooks(receivedWebhooks, startCount + 1);

      const newWebhooks = receivedWebhooks.slice(startCount);
      console.log(`Received ${newWebhooks.length} webhook(s)`);

      expect(newWebhooks.length).toBeGreaterThanOrEqual(1);

      // Find the TaskCreated webhook with signature
      const signedWebhook = newWebhooks.find(
        (w) =>
          w.parsedBody.event === 'TaskCreated' &&
          w.headers['x-pact-signature'] !== undefined
      );
      expect(signedWebhook).toBeDefined();

      if (signedWebhook) {
        // Verify HMAC signature
        const signatureHeader = signedWebhook.headers['x-pact-signature'];
        expect(signatureHeader).toBeDefined();
        expect(signatureHeader).toMatch(/^sha256=[0-9a-f]+$/);

        const headerSignature = signatureHeader.replace('sha256=', '');
        const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
          .update(signedWebhook.body)
          .digest('hex');

        console.log(`Header signature: ${headerSignature.substring(0, 16)}...`);
        console.log(`Expected signature: ${expectedSignature.substring(0, 16)}...`);
        console.log(`Match: ${headerSignature === expectedSignature}`);

        expect(headerSignature).toBe(expectedSignature);
      }

      console.log('HMAC signature verification passed');
    },
    TEST_TIMEOUT * 2
  );

  test(
    'Test 3: Webhook fires on work submission (to creator)',
    async () => {
      console.log('\n--- Test 3: Webhook fires on work submission ---\n');

      // Set webhook URL for creator so they receive WorkSubmitted notifications
      const creatorWebhookUrl = `http://localhost:${webhookPort}/webhook`;
      await setAgentWebhookInDB(creatorWallet.address, creatorWebhookUrl, WEBHOOK_SECRET);
      console.log(`Creator webhook URL set: ${creatorWebhookUrl}`);

      // Create a task
      const taskResult = await createTaskTool.handler(
        {
          title: `Work Submission Webhook Test ${Date.now()}`,
          description: 'Task to test webhook on work submission',
          deliverables: [
            {
              type: 'code' as const,
              description: 'Test output',
              format: 'text',
            },
          ],
          bountyAmount: TEST_BOUNTY_ETH,
          tags: ['test', 'submission-webhook'],
        },
        { callerAddress: creatorWallet.address }
      );

      console.log('Creating task on-chain...');
      const { taskId: chainTaskId } = await createTaskOnChain(
        creatorWallet,
        taskResult.specificationCid,
        TEST_BOUNTY_ETH
      );
      console.log(`Chain task ID: ${chainTaskId}`);

      // Wait for indexer to sync the task
      const dbTask = await waitForTaskInDB(
        chainTaskId,
        INDEXER_SYNC_WAIT_MS,
        2000,
        creatorWallet.address
      );
      console.log(`DB task ID: ${dbTask!.id}`);

      // Record count after task creation webhooks settle
      await sleep(3000);
      const startCount = receivedWebhooks.length;

      // Submit work as agent
      console.log('Agent submitting work via MCP...');
      const submitResult = await submitWorkTool.handler(
        {
          taskId: dbTask!.id,
          summary: 'Webhook test submission',
          description: 'Work submitted to test webhook delivery on submission',
          deliverables: [
            {
              type: 'code' as const,
              description: 'Test output',
              url: 'https://example.com/test-output',
            },
          ],
        },
        { callerAddress: agentWallet.address }
      );

      console.log('Submitting work on-chain...');
      await submitWorkOnChain(agentWallet, chainTaskId, submitResult.submissionCid);
      console.log('Work submitted on-chain');

      // Wait for indexer + webhook
      console.log('Waiting for WorkSubmitted webhook...');
      await waitForWebhooks(receivedWebhooks, startCount + 1);

      const newWebhooks = receivedWebhooks.slice(startCount);
      console.log(`Received ${newWebhooks.length} webhook(s) since submission`);

      expect(newWebhooks.length).toBeGreaterThanOrEqual(1);

      // Find the WorkSubmitted webhook
      const workSubmittedWebhook = newWebhooks.find(
        (w) => w.parsedBody.event === 'WorkSubmitted'
      );
      expect(workSubmittedWebhook).toBeDefined();

      if (workSubmittedWebhook) {
        // Verify headers
        expect(workSubmittedWebhook.headers['x-pact-event']).toBe('WorkSubmitted');
        expect(workSubmittedWebhook.headers['content-type']).toContain('application/json');
        expect(workSubmittedWebhook.headers['user-agent']).toBe('Pact-Webhook/1.0');

        // Verify payload
        expect(workSubmittedWebhook.parsedBody.event).toBe('WorkSubmitted');
        expect(workSubmittedWebhook.parsedBody.taskId).toBe(chainTaskId.toString());
        expect(workSubmittedWebhook.parsedBody.data).toBeDefined();
        expect(workSubmittedWebhook.parsedBody.data!.agent).toBe(
          agentWallet.address.toLowerCase()
        );

        console.log(`Event: ${workSubmittedWebhook.parsedBody.event}`);
        console.log(`Task ID: ${workSubmittedWebhook.parsedBody.taskId}`);
        console.log(`Agent: ${workSubmittedWebhook.parsedBody.data!.agent}`);
      }

      console.log('Webhook delivery on work submission verified');
    },
    TEST_TIMEOUT * 2
  );

  test('Final summary', () => {
    console.log('\n========================================');
    console.log('Webhook Delivery Tests Complete!');
    console.log(`Total webhooks received: ${receivedWebhooks.length}`);
    console.log('========================================\n');
  });
});
