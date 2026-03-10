import { describe, test, expect, beforeEach } from 'bun:test';
import { createMockDatabase } from '../helpers/mock-deps';

const mockDb = createMockDatabase();

mockDb.setupMock();

// Import the real webhook-dispatch (which imports the real webhook-notifier).
// Both use @pactprotocol/database which is mocked above.
const { dispatchWebhookNotifications } = await import('../../services/webhook-dispatch');
import type { IndexerEvent } from '../../listener';

function makeEvent(name: string, args: Record<string, unknown> = {}): IndexerEvent {
  return {
    name,
    chainId: 84532,
    blockNumber: 100n,
    transactionHash: '0xabc',
    logIndex: 0,
    args,
  };
}

describe('dispatchWebhookNotifications', () => {
  beforeEach(() => {
    mockDb.resetAll();
    mockDb.getTaskByChainId.mockImplementation(() =>
      Promise.resolve({
        id: 'db-task-1',
        title: 'My Task',
        tags: ['dev'],
        creator_address: '0xcreator',
      })
    );
    // Return empty arrays so no real fetch calls happen
    mockDb.getAgentsWithWebhooks.mockImplementation(() => Promise.resolve([]));
    mockDb.getAgentWebhookInfo.mockImplementation(() => Promise.resolve(null));
    mockDb.getAgentsWebhookInfoByAddresses.mockImplementation(() => Promise.resolve([]));
    mockDb.getSubmissionsByTaskId.mockImplementation(() =>
      Promise.resolve({ submissions: [], total: 0 })
    );
  });

  test('dispatches TaskCreated webhook: looks up task and fetches agents', async () => {
    dispatchWebhookNotifications(
      makeEvent('TaskCreated', {
        taskId: 1n,
        creator: '0xCreator',
        bounty: 1000n,
        specCid: 'QmTest',
      })
    );
    await new Promise((r) => setTimeout(r, 50));
    // dispatch calls getTaskByChainId for title/tags, then notifyTaskCreated calls getAgentsWithWebhooks
    expect(mockDb.getTaskByChainId).toHaveBeenCalledWith('1', 84532);
    expect(mockDb.getAgentsWithWebhooks).toHaveBeenCalledTimes(1);
  });

  test('dispatches WorkSubmitted webhook: looks up task creator webhook', async () => {
    dispatchWebhookNotifications(makeEvent('WorkSubmitted', { taskId: 1n, worker: '0xWorker' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDb.getTaskByChainId).toHaveBeenCalledWith('1', 84532);
    // notifyWorkSubmitted looks up creator's webhook info
    expect(mockDb.getAgentWebhookInfo).toHaveBeenCalledWith('0xcreator');
  });

  test('dispatches JudgmentSubmitted webhook: looks up task creator webhook', async () => {
    dispatchWebhookNotifications(
      makeEvent('JudgmentSubmitted', {
        taskId: 1n,
        judge: '0xJudge',
        judgmentIndex: 0,
      })
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDb.getTaskByChainId).toHaveBeenCalledWith('1', 84532);
    expect(mockDb.getAgentWebhookInfo).toHaveBeenCalledWith('0xcreator');
  });

  test('dispatches TaskResolved webhook: notifies submitters and judges', async () => {
    dispatchWebhookNotifications(
      makeEvent('TaskResolved', {
        taskId: 1n,
        winningWorkers: ['0xWorker1', '0xWorker2'],
        consensusJudges: ['0xJudge1'],
      })
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDb.getTaskByChainId).toHaveBeenCalledWith('1', 84532);
    expect(mockDb.getSubmissionsByTaskId).toHaveBeenCalledWith('db-task-1');
  });

  test('does not dispatch for events without webhook support', async () => {
    const noWebhookEvents = [
      'PhaseChanged',
      'TaskFailed',
      'TaskCancelled',
      'AgentRegistered',
      'AgentProfileUpdated',
    ];
    for (const eventName of noWebhookEvents) {
      dispatchWebhookNotifications(makeEvent(eventName, { taskId: 1n }));
    }
    await new Promise((r) => setTimeout(r, 50));
    // None of the notifier functions should have triggered DB lookups for webhooks
    expect(mockDb.getAgentsWithWebhooks).not.toHaveBeenCalled();
    expect(mockDb.getAgentWebhookInfo).not.toHaveBeenCalled();
  });

  test('does not throw on internal errors', async () => {
    mockDb.getTaskByChainId.mockImplementation(() => Promise.reject(new Error('DB error')));
    expect(() =>
      dispatchWebhookNotifications(
        makeEvent('TaskCreated', {
          taskId: 1n,
          creator: '0xCreator',
          bounty: 1000n,
        })
      )
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
  });

  test('handles unknown event types silently', () => {
    expect(() => dispatchWebhookNotifications(makeEvent('SomeRandomEvent'))).not.toThrow();
  });
});
