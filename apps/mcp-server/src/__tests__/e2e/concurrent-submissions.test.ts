/**
 * End-to-End Concurrent Submission Tests (Anvil Only)
 *
 * Tests concurrent and conflicting submission scenarios:
 * 1. Multiple agents submit simultaneously (both succeed)
 * 2. Same agent double-submit reverts
 * 3. Submit after winner selection reverts
 * 4. Concurrent submission + winner selection race condition
 *
 * Prerequisites:
 * - Local Anvil node running (chainId 31337)
 * - Three funded wallets (Anvil default accounts)
 * - MCP server running (bun run dev:mcp)
 * - Indexer running (bun run dev:indexer)
 *
 * Environment Variables:
 * - E2E_CREATOR_PRIVATE_KEY: Private key for task creator wallet (Account #0)
 * - E2E_AGENT_PRIVATE_KEY: Private key for agent1 wallet (Account #1)
 * - E2E_VOTER_PRIVATE_KEY: Private key for agent2 wallet (Account #2)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import {
  createTestWallet,
  authenticateWallet,
  registerAgentOnChain,
  checkAgentRegistered,
  createTaskOnChain,
  submitWorkOnChain,
  selectWinnerOnChain,
  waitForTaskInDB,
  sleep,
  resetClients,
  isLocalAnvil,
  TaskStatus,
  taskStatusToString,
  gasTracker,
  getTaskFromChain,
  type TestWallet,
} from './test-utils';
import { registerAgentTool } from '../../tools/agent/register-agent';
import { createTaskTool } from '../../tools/task/create-task';
import { submitWorkTool } from '../../tools/agent/submit-work';

// Test configuration
const TEST_BOUNTY_ETH = '0.001';
const TEST_TIMEOUT = 60000;

// Environment variables
const CREATOR_PRIVATE_KEY = process.env.E2E_CREATOR_PRIVATE_KEY as `0x${string}` | undefined;
const AGENT_PRIVATE_KEY = process.env.E2E_AGENT_PRIVATE_KEY as `0x${string}` | undefined;
const VOTER_PRIVATE_KEY = process.env.E2E_VOTER_PRIVATE_KEY as `0x${string}` | undefined;

// Only run on local Anvil with all 3 wallets available
const shouldSkipTests =
  !CREATOR_PRIVATE_KEY ||
  !AGENT_PRIVATE_KEY ||
  !VOTER_PRIVATE_KEY ||
  !isLocalAnvil();

describe.skipIf(shouldSkipTests)('E2E: Concurrent Submissions (Anvil Only)', () => {
  let creatorWallet: TestWallet;
  let agent1Wallet: TestWallet;
  let agent2Wallet: TestWallet;

  beforeAll(async () => {
    console.log('\n========================================');
    console.log('E2E Concurrent Submissions Test - Anvil');
    console.log('========================================\n');

    resetClients();

    // Create wallets
    creatorWallet = createTestWallet(CREATOR_PRIVATE_KEY!);
    agent1Wallet = createTestWallet(AGENT_PRIVATE_KEY!);
    agent2Wallet = createTestWallet(VOTER_PRIVATE_KEY!);

    console.log(`Creator: ${creatorWallet.address}`);
    console.log(`Agent1:  ${agent1Wallet.address}`);
    console.log(`Agent2:  ${agent2Wallet.address}`);
    console.log('');

    // Authenticate all wallets
    await authenticateWallet(creatorWallet);
    await authenticateWallet(agent1Wallet);
    await authenticateWallet(agent2Wallet);
    console.log('All wallets authenticated');

    // Ensure all agents are registered on-chain
    for (const [name, wallet] of [
      ['Agent1', agent1Wallet],
      ['Agent2', agent2Wallet],
    ] as const) {
      const isRegistered = await checkAgentRegistered(wallet.address);
      if (!isRegistered) {
        console.log(`Registering ${name}...`);
        const profileResult = await registerAgentTool.handler(
          {
            name: `E2E ${name} ${Date.now()}`,
            description: `Test agent for concurrent submissions`,
            skills: ['testing'],
            preferredTaskTypes: ['code'],
          },
          { callerAddress: wallet.address }
        );
        await registerAgentOnChain(wallet, profileResult.agentURI);
        await sleep(3000);
      }
      expect(await checkAgentRegistered(wallet.address)).toBe(true);
      console.log(`${name} registered: true`);
    }

    console.log('');
  });

  afterAll(() => {
    gasTracker.printReport();
  });

  /**
   * Helper: create a fresh task and wait for indexer sync.
   * Returns both the chain task ID and the database task record.
   */
  async function createFreshTask(label: string) {
    const taskResult = await createTaskTool.handler(
      {
        title: `Concurrent Test: ${label} ${Date.now()}`,
        description: `Task for concurrent submission test: ${label}`,
        deliverables: [
          {
            type: 'document' as const,
            description: 'Test deliverable',
            format: 'text',
          },
        ],
        bountyAmount: TEST_BOUNTY_ETH,
        tags: ['test', 'concurrent'],
      },
      { callerAddress: creatorWallet.address }
    );

    const { taskId: chainTaskId } = await createTaskOnChain(
      creatorWallet,
      taskResult.specificationCid,
      TEST_BOUNTY_ETH
    );

    await sleep(3000);
    const dbTask = await waitForTaskInDB(chainTaskId, 15000);
    console.log(`  Task created: chain=${chainTaskId}, db=${dbTask.id}`);
    return { chainTaskId, dbTask };
  }

  /**
   * Helper: prepare a submission CID via the MCP tool (uploads to IPFS).
   */
  async function prepareSubmission(
    wallet: TestWallet,
    dbTaskId: string,
    label: string
  ) {
    const result = await submitWorkTool.handler(
      {
        taskId: dbTaskId,
        summary: `Submission from ${label}`,
        description: `Concurrent submission test: ${label}`,
        deliverables: [
          {
            type: 'document' as const,
            description: `Deliverable from ${label}`,
            url: `https://example.com/${label}`,
          },
        ],
      },
      { callerAddress: wallet.address }
    );
    return result.submissionCid;
  }

  // --------------------------------------------------------------------------
  // Test 1: Multiple agents submit simultaneously — both should succeed
  // --------------------------------------------------------------------------
  test(
    'multiple agents submit simultaneously',
    async () => {
      console.log('\n--- Test 1: Multiple agents submit simultaneously ---\n');

      const { chainTaskId, dbTask } = await createFreshTask('simultaneous');

      // Prepare submission CIDs (IPFS uploads) sequentially
      const cid1 = await prepareSubmission(agent1Wallet, dbTask.id, 'agent1');
      const cid2 = await prepareSubmission(agent2Wallet, dbTask.id, 'agent2');

      // Submit both on-chain simultaneously
      const [result1, result2] = await Promise.all([
        submitWorkOnChain(agent1Wallet, chainTaskId, cid1),
        submitWorkOnChain(agent2Wallet, chainTaskId, cid2),
      ]);

      console.log(`  Agent1 tx: ${result1}`);
      console.log(`  Agent2 tx: ${result2}`);

      // Both transactions should have succeeded (returned tx hashes)
      expect(result1).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(result2).toMatch(/^0x[0-9a-fA-F]{64}$/);

      // Verify on-chain: task should still be open with submissions recorded
      const onChainTask = await getTaskFromChain(chainTaskId);
      console.log(`  Task status: ${taskStatusToString(onChainTask.status)}`);
      expect(onChainTask.status).toBe(TaskStatus.Open);
    },
    TEST_TIMEOUT
  );

  // --------------------------------------------------------------------------
  // Test 2: Same agent double-submit should revert
  // --------------------------------------------------------------------------
  test(
    'same agent double-submit reverts',
    async () => {
      console.log('\n--- Test 2: Same agent double-submit reverts ---\n');

      const { chainTaskId, dbTask } = await createFreshTask('double-submit');

      // First submission succeeds
      const cid1 = await prepareSubmission(agent1Wallet, dbTask.id, 'agent1-first');
      const tx = await submitWorkOnChain(agent1Wallet, chainTaskId, cid1);
      console.log(`  First submission tx: ${tx}`);

      // Second submission from same agent should revert
      const cid2 = await prepareSubmission(agent1Wallet, dbTask.id, 'agent1-second');
      try {
        await submitWorkOnChain(agent1Wallet, chainTaskId, cid2);
        expect(true).toBe(false); // Should not reach here
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`  Expected revert: ${msg.substring(0, 120)}`);
        expect(msg.includes('revert') || msg.includes('AlreadySubmitted')).toBe(true);
      }
    },
    TEST_TIMEOUT
  );

  // --------------------------------------------------------------------------
  // Test 3: Submit after winner selection should revert
  // --------------------------------------------------------------------------
  test(
    'submit after winner selection reverts',
    async () => {
      console.log('\n--- Test 3: Submit after winner selection reverts ---\n');

      const { chainTaskId, dbTask } = await createFreshTask('post-winner');

      // Agent1 submits work
      const cid1 = await prepareSubmission(agent1Wallet, dbTask.id, 'agent1');
      await submitWorkOnChain(agent1Wallet, chainTaskId, cid1);
      console.log('  Agent1 submitted');

      // Creator selects agent1 as winner (moves task to InReview)
      await selectWinnerOnChain(creatorWallet, chainTaskId, agent1Wallet.address);
      console.log('  Winner selected');

      // Verify task is in InReview
      const taskAfterWinner = await getTaskFromChain(chainTaskId);
      console.log(`  Task status: ${taskStatusToString(taskAfterWinner.status)}`);
      expect(taskAfterWinner.status).toBe(TaskStatus.InReview);

      // Agent2 tries to submit — should revert because task is not Open
      const cid2 = await prepareSubmission(agent2Wallet, dbTask.id, 'agent2-late');
      try {
        await submitWorkOnChain(agent2Wallet, chainTaskId, cid2);
        expect(true).toBe(false); // Should not reach here
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`  Expected revert: ${msg.substring(0, 120)}`);
        expect(msg.includes('revert') || msg.includes('TaskNotOpen')).toBe(true);
      }
    },
    TEST_TIMEOUT
  );

  // --------------------------------------------------------------------------
  // Test 4: Concurrent submission + winner selection race
  // --------------------------------------------------------------------------
  test(
    'concurrent submission and winner selection race',
    async () => {
      console.log('\n--- Test 4: Concurrent submission + winner selection race ---\n');

      const { chainTaskId, dbTask } = await createFreshTask('race');

      // Agent1 submits first (must succeed before winner can be selected)
      const cid1 = await prepareSubmission(agent1Wallet, dbTask.id, 'agent1');
      await submitWorkOnChain(agent1Wallet, chainTaskId, cid1);
      console.log('  Agent1 submitted');

      // Prepare agent2's submission CID
      const cid2 = await prepareSubmission(agent2Wallet, dbTask.id, 'agent2');

      // Race: agent2 submits AND creator selects agent1 as winner simultaneously
      const results = await Promise.allSettled([
        submitWorkOnChain(agent2Wallet, chainTaskId, cid2),
        selectWinnerOnChain(creatorWallet, chainTaskId, agent1Wallet.address),
      ]);

      const [submitResult, selectResult] = results;
      console.log(`  Agent2 submit: ${submitResult.status}`);
      console.log(`  Winner select: ${selectResult.status}`);

      // At least one should succeed; final state must be consistent
      const hasSuccess = results.some((r) => r.status === 'fulfilled');
      expect(hasSuccess).toBe(true);

      // Verify consistent final state
      const finalTask = await getTaskFromChain(chainTaskId);
      const finalStatus = finalTask.status;
      console.log(`  Final task status: ${taskStatusToString(finalStatus)}`);

      if (selectResult.status === 'fulfilled') {
        // Winner selection went through — task should be InReview
        expect(finalStatus).toBe(TaskStatus.InReview);
        expect(finalTask.selectedWinner.toLowerCase()).toBe(
          agent1Wallet.address.toLowerCase()
        );
        console.log('  Outcome: winner selected, task in review');
      } else {
        // Winner selection failed (agent2 submit may have been first) — task stays Open
        expect(finalStatus).toBe(TaskStatus.Open);
        console.log('  Outcome: task still open (submit won the race)');
      }
    },
    TEST_TIMEOUT
  );
});
