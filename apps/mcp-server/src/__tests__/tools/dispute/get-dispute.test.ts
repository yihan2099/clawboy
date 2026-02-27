import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockGetDisputeHandler = mock(() =>
  Promise.resolve({
    dispute: {
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
      resolvedAt: null,
    },
    votes: [
      {
        voterAddress: '0xVoter1',
        supportsDisputer: true,
        weight: 5,
        votedAt: '2024-01-02T00:00:00Z',
      },
    ],
    summary: {
      totalVotes: 1,
      totalWeightFor: 10,
      totalWeightAgainst: 5,
      isActive: true,
      timeRemainingMs: 86400000,
      canBeResolved: false,
    },
  })
);

mock.module('../../../services/dispute-service', () => ({
  getDisputeHandler: mockGetDisputeHandler,
}));

import { getDisputeTool } from '../../../tools/dispute/get-dispute';

describe('get_dispute tool', () => {
  beforeEach(() => {
    mockGetDisputeHandler.mockReset();
    mockGetDisputeHandler.mockResolvedValue({
      dispute: {
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
        resolvedAt: null,
      },
      votes: [
        {
          voterAddress: '0xVoter1',
          supportsDisputer: true,
          weight: 5,
          votedAt: '2024-01-02T00:00:00Z',
        },
      ],
      summary: {
        totalVotes: 1,
        totalWeightFor: 10,
        totalWeightAgainst: 5,
        isActive: true,
        timeRemainingMs: 86400000,
        canBeResolved: false,
      },
    } as any);
  });

  test('should return dispute with votes and summary', async () => {
    const result = await getDisputeTool.handler({ disputeId: '1' });

    expect(result.dispute.chainDisputeId).toBe('1');
    expect(result.dispute.status).toBe('active' as any);
    expect(result.votes).toHaveLength(1);
    expect(result.votes[0].voterAddress).toBe('0xVoter1');
    expect(result.summary.totalVotes).toBe(1);
    expect(result.summary.isActive).toBe(true);
  });

  test('should throw when dispute not found', async () => {
    mockGetDisputeHandler.mockRejectedValue(new Error('Dispute not found: 99'));

    await expect(getDisputeTool.handler({ disputeId: '99' })).rejects.toThrow('Dispute not found');
  });

  test('should compute canBeResolved correctly', async () => {
    // Active but deadline not passed
    const result = await getDisputeTool.handler({ disputeId: '1' });
    expect(result.summary.canBeResolved).toBe(false);
  });

  test('should show canBeResolved when deadline passed and active', async () => {
    mockGetDisputeHandler.mockResolvedValue({
      dispute: {
        id: 'dispute-uuid',
        chainDisputeId: '1',
        taskId: 'task-1',
        disputerAddress: '0xDisputer',
        disputeStake: '10000000000000000',
        votingDeadline: new Date(Date.now() - 86400000).toISOString(),
        status: 'active',
        disputerWon: null,
        votesForDisputer: 10,
        votesAgainstDisputer: 5,
        createdAt: '2024-01-01T00:00:00Z',
        resolvedAt: null,
      },
      votes: [],
      summary: {
        totalVotes: 0,
        totalWeightFor: 10,
        totalWeightAgainst: 5,
        isActive: true,
        timeRemainingMs: 0,
        canBeResolved: true,
      },
    } as any);

    const result = await getDisputeTool.handler({ disputeId: '1' });
    expect(result.summary.canBeResolved).toBe(true);
    expect(result.summary.timeRemainingMs).toBe(0);
  });
});
