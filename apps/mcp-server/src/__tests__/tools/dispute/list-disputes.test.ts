import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockListDisputesHandler = mock(() =>
  Promise.resolve({
    disputes: [
      {
        id: 'dispute-uuid',
        chainDisputeId: '1',
        taskId: 'task-1',
        disputerAddress: '0xDisputer',
        disputeStake: '10000000000000000',
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
        disputerWon: null,
        votesForDisputer: 10,
        votesAgainstDisputer: 5,
        createdAt: '2024-01-01T00:00:00Z',
        canBeResolved: false,
      },
    ],
    pagination: {
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
    },
    readyForResolutionCount: 0,
  })
);

mock.module('../../../services/dispute-service', () => ({
  listDisputesHandler: mockListDisputesHandler,
}));

import { listDisputesTool, listDisputesSchema } from '../../../tools/dispute/list-disputes';

describe('list_disputes tool', () => {
  beforeEach(() => {
    mockListDisputesHandler.mockReset();
    mockListDisputesHandler.mockResolvedValue({
      disputes: [
        {
          id: 'dispute-uuid',
          chainDisputeId: '1',
          taskId: 'task-1',
          disputerAddress: '0xDisputer',
          disputeStake: '10000000000000000',
          votingDeadline: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
          disputerWon: null,
          votesForDisputer: 10,
          votesAgainstDisputer: 5,
          createdAt: '2024-01-01T00:00:00Z',
          canBeResolved: false,
        },
      ],
      pagination: {
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
      readyForResolutionCount: 0,
    });
  });

  test('should have correct tool metadata', () => {
    expect(listDisputesTool.name).toBe('list_disputes');
  });

  test('should default to active status filter', () => {
    const parsed = listDisputesSchema.parse({});
    expect(parsed.status).toBe('active');
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  test('should accept valid status values', () => {
    const parsed = listDisputesSchema.parse({ status: 'resolved' });
    expect(parsed.status).toBe('resolved');
  });

  test('should reject invalid status', () => {
    expect(() => listDisputesSchema.parse({ status: 'invalid' })).toThrow();
  });

  test('should reject limit above 100', () => {
    expect(() => listDisputesSchema.parse({ limit: 101 })).toThrow();
  });

  test('should call handler and return result', async () => {
    const result = await listDisputesTool.handler({});

    expect(mockListDisputesHandler).toHaveBeenCalled();
    expect(result.disputes).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
