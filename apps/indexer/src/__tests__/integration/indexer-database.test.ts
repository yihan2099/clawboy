import { describe, test, expect, beforeEach } from 'bun:test';
import {
  createMockDatabase,
  createMockIpfsUtils,
  createMockCache,
  createMockSharedTypes,
  createMockRetry,
} from '../helpers/mock-deps';

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

const { handleTaskCreated } = await import('../../handlers/task-created');
const { handleWorkSubmitted } = await import('../../handlers/work-submitted');
const { handleAgentRegistered } = await import('../../handlers/agent-registered');
import type { IndexerEvent } from '../../listener';

function makeEvent(name: string, args: Record<string, unknown>): IndexerEvent {
  return {
    name,
    chainId: 84532,
    blockNumber: 500n,
    transactionHash: '0x1234567890abcdef' as `0x${string}`,
    logIndex: 0,
    args,
  };
}

describe('Indexer-Database Integration', () => {
  beforeEach(() => {
    mockDb.resetAll();
    mockIpfs.resetAll();
    mockCache.resetAll();
    mockTypes.resetAll();
    mockRetry.resetAll();

    mockRetry.withRetryResult.mockImplementation((fn: () => Promise<unknown>) =>
      fn().then(
        (data) => ({ success: true, data, attempts: 1 }),
        (error: Error) => ({ success: false, error: error.message, attempts: 1 })
      )
    );
    mockIpfs.fetchTaskSpecification.mockImplementation(() =>
      Promise.resolve({ title: 'Test Task', description: 'Description', tags: ['dev', 'test'] })
    );
    mockIpfs.fetchJson.mockImplementation(() =>
      Promise.resolve({ name: 'Test Agent', skills: ['coding'] })
    );
    mockDb.getTaskByChainId.mockImplementation(() =>
      Promise.resolve({
        id: 'task-uuid-1',
        chain_task_id: '1',
        chain_id: 84532,
        status: 'open',
        creator_address: '0xcreator',
      })
    );
    mockDb.getSubmissionByTaskAndAgent.mockImplementation(() => Promise.resolve(null));
  });

  test('TaskCreated event creates task in database with correct fields', async () => {
    const event = makeEvent('TaskCreated', {
      taskId: 10n,
      creator: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12' as `0x${string}`,
      bounty: 2000000000000000000n,
      bountyToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      specCid: 'QmTaskSpec456',
      requiredWorkers: 3,
      requiredJudges: 2,
      workDeadline: 1700000000n,
      judgeDeadline: 1700100000n,
    });

    await handleTaskCreated(event);

    expect(mockDb.createTask).toHaveBeenCalledTimes(1);
    const args = mockDb.createTask.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.chain_id).toBe(84532);
    expect(args.chain_task_id).toBe('10');
    expect(args.creator_address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(args.status).toBe('open');
    expect(args.bounty_amount).toBe('2000000000000000000');
    expect(args.specification_cid).toBe('QmTaskSpec456');
    expect(args.title).toBe('Test Task');
    expect(args.description).toBe('Description');
    expect(args.tags).toEqual(['dev', 'test']);
    expect(args.created_at_block).toBe('500');
  });

  test('WorkSubmitted event creates submission in database', async () => {
    const event = makeEvent('WorkSubmitted', {
      taskId: 1n,
      agent: '0xAgentAddress' as `0x${string}`,
      submissionCid: 'QmSubmissionCid',
      submissionIndex: 0n,
    });

    await handleWorkSubmitted(event);

    expect(mockDb.getTaskByChainId).toHaveBeenCalledWith('1', 84532);
    expect(mockDb.createSubmission).toHaveBeenCalledTimes(1);
    const args = mockDb.createSubmission.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.task_id).toBe('task-uuid-1');
    expect(args.agent_address).toBe('0xagentaddress');
    expect(args.submission_cid).toBe('QmSubmissionCid');
    expect(args.submission_index).toBe(0);
  });

  test('WorkSubmitted updates existing submission instead of creating new', async () => {
    mockDb.getSubmissionByTaskAndAgent.mockImplementation(() =>
      Promise.resolve({
        id: 'existing-sub-1',
        task_id: 'task-uuid-1',
        agent_address: '0xagent',
        submission_cid: 'QmOldCid',
      })
    );

    const event = makeEvent('WorkSubmitted', {
      taskId: 1n,
      agent: '0xAgent' as `0x${string}`,
      submissionCid: 'QmNewCid',
      submissionIndex: 0n,
    });

    await handleWorkSubmitted(event);

    expect(mockDb.createSubmission).not.toHaveBeenCalled();
    expect(mockDb.updateSubmission).toHaveBeenCalledTimes(1);
    const updateArgs = mockDb.updateSubmission.mock.calls[0] as unknown[];
    expect(updateArgs[0]).toBe('existing-sub-1');
    expect((updateArgs[1] as Record<string, unknown>).submission_cid).toBe('QmNewCid');
  });

  test('AgentRegistered event creates agent in database', async () => {
    const event = makeEvent('AgentRegistered', {
      wallet: '0xNewAgentWallet' as `0x${string}`,
      agentId: 42n,
      agentURI: 'ipfs://QmAgentProfileCid',
    });

    await handleAgentRegistered(event);

    expect(mockDb.upsertAgent).toHaveBeenCalledTimes(1);
    const args = mockDb.upsertAgent.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.address).toBe('0xnewagentwallet');
    expect(args.agent_id).toBe('42');
    expect(args.agent_uri).toBe('ipfs://QmAgentProfileCid');
    expect(args.profile_cid).toBe('QmAgentProfileCid');
    expect(args.name).toBe('Test Agent');
    expect(args.skills).toEqual(['coding']);
  });

  test('WorkSubmitted throws if task not found in DB', async () => {
    mockDb.getTaskByChainId.mockImplementation(() => Promise.resolve(null));

    const event = makeEvent('WorkSubmitted', {
      taskId: 999n,
      agent: '0xAgent' as `0x${string}`,
      submissionCid: 'QmCid',
      submissionIndex: 0n,
    });

    await expect(handleWorkSubmitted(event)).rejects.toThrow('not found in database');
  });

  test('TaskCreated handles IPFS fetch failure gracefully', async () => {
    mockIpfs.fetchTaskSpecification.mockImplementation(() =>
      Promise.reject(new Error('IPFS gateway timeout'))
    );

    const event = makeEvent('TaskCreated', {
      taskId: 20n,
      creator: '0xCreator' as `0x${string}`,
      bounty: 1000n,
      bountyToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      specCid: 'QmBadCid',
      requiredWorkers: 1,
      requiredJudges: 1,
      workDeadline: 0n,
      judgeDeadline: 0n,
    });

    await handleTaskCreated(event);

    expect(mockDb.createTask).toHaveBeenCalledTimes(1);
    const args = mockDb.createTask.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.title).toBe('Untitled Task');
    expect(args.ipfs_fetch_failed).toBe(true);
  });
});
