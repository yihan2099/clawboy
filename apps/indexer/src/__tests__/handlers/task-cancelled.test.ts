import { describe, test, expect, beforeEach } from 'bun:test';
import { createMockDatabase, createMockCache } from '../helpers/mock-deps';

const mockDb = createMockDatabase();
const mockCache = createMockCache();

mockDb.setupMock();
mockCache.setupMock();

const { handleTaskCancelled } = await import('../../handlers/task-cancelled');
import type { IndexerEvent } from '../../listener';

function makeEvent(overrides: Record<string, unknown> = {}): IndexerEvent {
  return {
    name: 'TaskCancelled',
    chainId: 84532,
    blockNumber: 500n,
    transactionHash: '0xcancel',
    logIndex: 0,
    args: {
      taskId: 1n,
      creator: '0xCreator',
      ...overrides,
    },
  };
}

describe('handleTaskCancelled', () => {
  beforeEach(() => {
    mockDb.resetAll();
    mockCache.resetAll();
    mockDb.getTaskByChainId.mockImplementation(() =>
      Promise.resolve({ id: 'db-task-1', phase: 'open', chain_task_id: '1' })
    );
  });

  test('updates task phase to cancelled', async () => {
    await handleTaskCancelled(makeEvent());
    expect(mockDb.updateTaskPhase).toHaveBeenCalledWith('db-task-1', 'cancelled');
  });

  test('throws when task is not found', async () => {
    mockDb.getTaskByChainId.mockImplementation(() => Promise.resolve(null));
    await expect(handleTaskCancelled(makeEvent())).rejects.toThrow('not found in database');
  });

  test('invalidates task caches', async () => {
    await handleTaskCancelled(makeEvent());
    expect(mockCache.invalidateTaskCaches).toHaveBeenCalledWith('db-task-1');
  });

  test('invalidates phase caches', async () => {
    await handleTaskCancelled(makeEvent());
    expect(mockCache.invalidatePhaseCaches).toHaveBeenCalled();
  });
});
