import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { TaskPhase } from '@pactprotocol/shared-types';
import { setupViemMock } from '../helpers/mock-viem';

const viemMock = setupViemMock();

mock.module('@pactprotocol/contracts', () => ({
  TaskManagerABI: [],
  EscrowVaultABI: [],
  PactAgentAdapterABI: [],
  ERC8004IdentityRegistryABI: [],
  ERC8004ReputationRegistryABI: [],
  getContractAddresses: mock(() => ({
    taskManager: '0xTaskManager' as `0x${string}`,
    escrowVault: '0xEscrowVault' as `0x${string}`,
    agentAdapter: '0xAgentAdapter' as `0x${string}`,
    identityRegistry: '0xIdentityRegistry' as `0x${string}`,
    reputationRegistry: '0xReputationRegistry' as `0x${string}`,
  })),
}));

const { getTaskManagerAddress, getTaskCount, getTask, contractPhaseToTaskPhase } =
  await import('../../contracts/task-manager');

describe('task-manager contract', () => {
  beforeEach(() => {
    viemMock.reset();
    process.env.CHAIN_ID = '84532';
  });

  describe('getTaskManagerAddress', () => {
    test('returns task manager address', () => {
      const addr = getTaskManagerAddress();
      expect(addr).toBe('0xTaskManager');
    });

    test('accepts custom chainId', () => {
      const addr = getTaskManagerAddress(31337);
      expect(addr).toBe('0xTaskManager');
    });
  });

  describe('getTaskCount', () => {
    test('returns task count from contract', async () => {
      viemMock.setReadContractResult(5n);
      const count = await getTaskCount();
      expect(count).toBe(5n);
    });

    test('returns 0 when no tasks', async () => {
      viemMock.setReadContractResult(0n);
      const count = await getTaskCount();
      expect(count).toBe(0n);
    });

    test('accepts custom chainId', async () => {
      viemMock.setReadContractResult(3n);
      const count = await getTaskCount(31337);
      expect(count).toBe(3n);
    });
  });

  describe('getTask', () => {
    test('returns parsed task data (V2 struct)', async () => {
      const taskStruct = {
        creator: '0xCreator',
        specCid: 'QmSpec123',
        bounty: 1000000000000000000n,
        bountyToken: '0x0000000000000000000000000000000000000000',
        requiredWorkers: 3,
        requiredJudges: 2,
        workDeadline: 100n,
        judgeDeadline: 200n,
        phase: 0,
        submissionCount: 0,
        judgmentCount: 0,
      };
      viemMock.setReadContractResult(taskStruct);

      const task = await getTask(1n);
      expect(task.creator).toBe('0xCreator');
      expect(task.specCid).toBe('QmSpec123');
      expect(task.bounty).toBe(1000000000000000000n);
      expect(task.phase).toBe(0);
      expect(task.requiredWorkers).toBe(3);
      expect(task.requiredJudges).toBe(2);
    });
  });

  describe('contractPhaseToTaskPhase', () => {
    test('maps 0 to open', () => {
      expect(contractPhaseToTaskPhase(0)).toBe('open' as TaskPhase);
    });

    test('maps 1 to work_phase', () => {
      expect(contractPhaseToTaskPhase(1)).toBe('work_phase' as TaskPhase);
    });

    test('maps 2 to judge_phase', () => {
      expect(contractPhaseToTaskPhase(2)).toBe('judge_phase' as TaskPhase);
    });

    test('maps 3 to resolved', () => {
      expect(contractPhaseToTaskPhase(3)).toBe('resolved' as TaskPhase);
    });

    test('maps 4 to cancelled', () => {
      expect(contractPhaseToTaskPhase(4)).toBe('cancelled' as TaskPhase);
    });

    test('maps 5 to failed', () => {
      expect(contractPhaseToTaskPhase(5)).toBe('failed' as TaskPhase);
    });

    test('throws on unknown phase', () => {
      expect(() => contractPhaseToTaskPhase(99)).toThrow('Unknown contract task phase: 99');
    });
  });
});
