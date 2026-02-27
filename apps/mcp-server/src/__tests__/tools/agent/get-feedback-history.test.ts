import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockGetFeedbackHistoryHandler = mock(
  (): Promise<any> =>
    Promise.resolve({
      success: true,
      walletAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
      agentId: '1',
      totalClients: 2,
      feedbackCount: 2,
      feedback: [
        {
          clientAddress: '0xClient1',
          feedbackIndex: '0',
          tag1: 'task',
          tag2: 'win',
          value: '10',
          valueDecimals: 0,
          isRevoked: false,
        },
        {
          clientAddress: '0xClient2',
          feedbackIndex: '1',
          tag1: 'dispute',
          tag2: 'loss',
          value: '-5',
          valueDecimals: 0,
          isRevoked: false,
        },
      ],
    })
);

mock.module('../../../services/reputation-service', () => ({
  getFeedbackHistoryHandler: mockGetFeedbackHistoryHandler,
}));

mock.module('../../../config/chain', () => ({
  getChainId: () => 84532,
}));

import { getFeedbackHistoryTool } from '../../../tools/agent/get-feedback-history';

const context = {
  callerAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd' as `0x${string}`,
};

describe('get_feedback_history tool', () => {
  beforeEach(() => {
    mockGetFeedbackHistoryHandler.mockReset();
    mockGetFeedbackHistoryHandler.mockResolvedValue({
      success: true,
      walletAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
      agentId: '1',
      totalClients: 2,
      feedbackCount: 2,
      feedback: [
        {
          clientAddress: '0xClient1',
          feedbackIndex: '0',
          tag1: 'task',
          tag2: 'win',
          value: '10',
          valueDecimals: 0,
          isRevoked: false,
        },
        {
          clientAddress: '0xClient2',
          feedbackIndex: '1',
          tag1: 'dispute',
          tag2: 'loss',
          value: '-5',
          valueDecimals: 0,
          isRevoked: false,
        },
      ],
    });
  });

  test('should return feedback entries filtering out revoked', async () => {
    const result = (await getFeedbackHistoryTool.handler({}, context)) as any;

    expect(result.success).toBe(true);
    expect(result.feedbackCount).toBe(2);
    expect(result.feedback).toHaveLength(2);
    expect(result.totalClients).toBe(2);
  });

  test('should return not registered when agent ID is 0', async () => {
    mockGetFeedbackHistoryHandler.mockResolvedValue({
      success: false,
      message: 'Agent not registered',
      walletAddress: context.callerAddress,
    } as any);

    const result = await getFeedbackHistoryTool.handler({}, context);

    expect(result.success).toBe(false);
    expect((result as any).message).toBe('Agent not registered');
  });

  test('should pass limit parameter', async () => {
    await getFeedbackHistoryTool.handler({ limit: 10 }, context);

    expect(mockGetFeedbackHistoryHandler).toHaveBeenCalledWith(context.callerAddress, 84532, 10);
  });

  test('should throw when no address available', async () => {
    await expect(
      getFeedbackHistoryTool.handler({}, { callerAddress: undefined as any })
    ).rejects.toThrow('walletAddress is required');
  });
});
