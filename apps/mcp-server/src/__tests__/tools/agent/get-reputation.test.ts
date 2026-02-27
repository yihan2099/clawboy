import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockGetReputationHandler = mock(
  (): Promise<Record<string, unknown>> =>
    Promise.resolve({
      success: true,
      walletAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
      agentId: '1',
      reputation: {
        taskWins: '5',
        disputeWins: '2',
        disputeLosses: '1',
        totalReputation: '100',
      },
    })
);

mock.module('../../../services/reputation-service', () => ({
  getReputationHandler: mockGetReputationHandler,
}));

mock.module('../../../config/chain', () => ({
  getChainId: () => 84532,
}));

import { getReputationTool } from '../../../tools/agent/get-reputation';

const context = {
  callerAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd' as `0x${string}`,
};

describe('get_reputation tool', () => {
  beforeEach(() => {
    mockGetReputationHandler.mockReset();
    mockGetReputationHandler.mockResolvedValue({
      success: true,
      walletAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
      agentId: '1',
      reputation: {
        taskWins: '5',
        disputeWins: '2',
        disputeLosses: '1',
        totalReputation: '100',
      },
    });
  });

  test('should return reputation summary for registered agent', async () => {
    const result = await getReputationTool.handler({}, context);

    expect(result.success).toBe(true);
    expect((result as any).reputation.taskWins).toBe('5');
    expect((result as any).reputation.totalReputation).toBe('100');
    expect(result.walletAddress).toBe(context.callerAddress);
  });

  test('should return not registered message for unregistered agent', async () => {
    mockGetReputationHandler.mockResolvedValue({
      success: false,
      message: 'Agent not registered',
      walletAddress: context.callerAddress,
    });

    const result = await getReputationTool.handler({}, context);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Agent not registered');
  });

  test('should query by wallet address when provided', async () => {
    const target = '0x1111111111111111111111111111111111111111';
    await getReputationTool.handler({ walletAddress: target }, context);

    expect(mockGetReputationHandler).toHaveBeenCalledWith(target, 84532, undefined, undefined);
  });

  test('should include filtered feedback when tags specified', async () => {
    mockGetReputationHandler.mockResolvedValue({
      success: true,
      walletAddress: context.callerAddress,
      agentId: '1',
      reputation: {
        taskWins: '5',
        disputeWins: '2',
        disputeLosses: '1',
        totalReputation: '100',
      },
      filteredFeedback: {
        tag1: 'task',
        tag2: 'win',
        count: '3',
        summaryValue: '50',
        summaryValueDecimals: 0,
      },
    });

    const result = await getReputationTool.handler({ tag1: 'task', tag2: 'win' }, context);

    expect((result as any).filteredFeedback).toBeDefined();
    expect((result as any).filteredFeedback.tag1).toBe('task');
    expect((result as any).filteredFeedback.tag2).toBe('win');
    expect((result as any).filteredFeedback.count).toBe('3');
  });

  test('should throw when no address available', async () => {
    await expect(
      getReputationTool.handler({}, { callerAddress: undefined as any })
    ).rejects.toThrow('walletAddress is required');
  });
});
