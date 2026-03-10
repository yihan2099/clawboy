import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import {
  createMockDatabase,
  createMockIpfsUtils,
  createMockCache,
  createMockSharedTypes,
  createMockRetry,
} from './helpers/mock-deps';

const mockDb = createMockDatabase();
const mockIpfs = createMockIpfsUtils();
const mockCache = createMockCache();
const mockTypes = createMockSharedTypes();
const mockRetry = createMockRetry();

mockDb.setupMock();
mockIpfs.setupMock();
mockCache.setupMock();
mockTypes.setupMock();
mockRetry.setupMock();

// We do NOT mock webhook-dispatch here. The real dispatch function runs
// fire-and-forget with database mocked (empty agent lists = no fetch calls).
// Webhook dispatch behaviour is tested in webhook-dispatch.test.ts.

const { processEvent } = await import('../processor');
import type { IndexerEvent } from '../listener';

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

const defaultArgs: Record<string, Record<string, unknown>> = {
  TaskCreated: {
    taskId: 1n,
    creator: '0xCreator',
    bounty: 1000n,
    bountyToken: '0xToken',
    specCid: 'QmTest',
    requiredWorkers: 3,
    requiredJudges: 3,
    workDeadline: 0n,
    judgeDeadline: 0n,
  },
  WorkSubmitted: {
    taskId: 1n,
    worker: '0xWorker',
    submissionCid: 'QmSub',
    slotIndex: 0n,
  },
  JudgmentSubmitted: {
    taskId: 1n,
    judge: '0xJudge',
    judgmentIndex: 0,
  },
  PhaseChanged: {
    taskId: 1n,
    newPhase: 1,
  },
  TaskResolved: {
    taskId: 1n,
    winningWorkers: ['0xWorker1', '0xWorker2'],
    consensusJudges: ['0xJudge1'],
  },
  TaskFailed: {
    taskId: 1n,
  },
  TaskCancelled: {
    taskId: 1n,
    creator: '0xCreator',
  },
  AgentRegistered: {
    wallet: '0xAgent',
    agentId: 1n,
    agentURI: 'ipfs://QmTest',
  },
  AgentProfileUpdated: {
    wallet: '0xAgent',
    agentId: 1n,
    newURI: 'ipfs://QmTest',
  },
};

describe('processEvent', () => {
  beforeEach(() => {
    mockDb.resetAll();
    mockIpfs.resetAll();
    mockCache.resetAll();
    mockTypes.resetAll();
    mockRetry.resetAll();

    // Reset default implementations
    mockRetry.withRetryResult.mockImplementation((fn: () => Promise<unknown>) =>
      fn().then(
        (data) => ({ success: true, data, attempts: 1 }),
        (error: Error) => ({ success: false, error: error.message, attempts: 1 })
      )
    );
    mockDb.getTaskByChainId.mockImplementation(() =>
      Promise.resolve({
        id: 'db-task-1',
        phase: 'open',
        chain_task_id: '1',
        creator_address: '0xcreator',
      })
    );
    mockDb.getSubmissionByTaskAndAgent.mockImplementation(() => Promise.resolve(null));
    mockIpfs.fetchTaskSpecification.mockImplementation(() =>
      Promise.resolve({ title: 'Test Task', description: 'desc', tags: [] })
    );
    mockIpfs.fetchJson.mockImplementation(() => Promise.resolve({ name: 'Agent', skills: [] }));
  });

  test('routes TaskCreated to handleTaskCreated', async () => {
    const event = makeEvent('TaskCreated', defaultArgs.TaskCreated);
    await processEvent(event);
    expect(mockDb.createTask).toHaveBeenCalledTimes(1);
  });

  test('routes WorkSubmitted to handleWorkSubmitted', async () => {
    const event = makeEvent('WorkSubmitted', defaultArgs.WorkSubmitted);
    await processEvent(event);
    expect(mockDb.createSubmission).toHaveBeenCalledTimes(1);
  });

  test('routes JudgmentSubmitted to handleJudgmentSubmitted', async () => {
    const event = makeEvent('JudgmentSubmitted', defaultArgs.JudgmentSubmitted);
    await processEvent(event);
    expect(mockDb.createJudgment).toHaveBeenCalledTimes(1);
  });

  test('routes PhaseChanged to handlePhaseChanged', async () => {
    const event = makeEvent('PhaseChanged', defaultArgs.PhaseChanged);
    await processEvent(event);
    expect(mockDb.updateTaskPhase).toHaveBeenCalledTimes(1);
  });

  test('routes TaskResolved to handleTaskResolved', async () => {
    mockDb.getSubmissionsByTaskId.mockImplementation(() =>
      Promise.resolve({ submissions: [], total: 0 })
    );
    const event = makeEvent('TaskResolved', defaultArgs.TaskResolved);
    await processEvent(event);
    expect(mockDb.updateTaskPhase).toHaveBeenCalledWith('db-task-1', 'resolved');
  });

  test('routes TaskFailed to handleTaskFailed', async () => {
    const event = makeEvent('TaskFailed', defaultArgs.TaskFailed);
    await processEvent(event);
    expect(mockDb.updateTaskPhase).toHaveBeenCalledWith('db-task-1', 'failed');
  });

  test('routes TaskCancelled to handleTaskCancelled', async () => {
    const event = makeEvent('TaskCancelled', defaultArgs.TaskCancelled);
    await processEvent(event);
    expect(mockDb.updateTaskPhase).toHaveBeenCalledWith('db-task-1', 'cancelled');
  });

  test('routes AgentRegistered to handleAgentRegistered', async () => {
    const event = makeEvent('AgentRegistered', defaultArgs.AgentRegistered);
    await processEvent(event);
    expect(mockDb.upsertAgent).toHaveBeenCalledTimes(1);
  });

  test('routes AgentProfileUpdated to handleAgentProfileUpdated', async () => {
    const event = makeEvent('AgentProfileUpdated', defaultArgs.AgentProfileUpdated);
    await processEvent(event);
    expect(mockDb.updateAgent).toHaveBeenCalledTimes(1);
  });

  test('logs warning for unknown event type', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    await processEvent(makeEvent('UnknownEvent'));
    expect(warnSpy).toHaveBeenCalledWith('Unknown event type: UnknownEvent');
    warnSpy.mockRestore();
  });

  test('re-throws handler errors', async () => {
    mockDb.getTaskByChainId.mockImplementation(() => Promise.resolve(null));
    const event = makeEvent('TaskFailed', defaultArgs.TaskFailed);
    await expect(processEvent(event)).rejects.toThrow('not found in database');
  });
});
