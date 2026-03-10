import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { createIpfsUtilsMock, createDatabaseMock } from '../../helpers/mock-deps';

const ipfsMock = createIpfsUtilsMock();
const dbMock = createDatabaseMock();

const mockGetTaskHandler = mock(() =>
  Promise.resolve({
    id: 'task-1',
    phase: 'open',
    workDeadline: null as string | null,
    submissionCount: 0,
    requiredWorkers: 3,
  })
);

mock.module('../../../services/task-service', () => ({
  getTaskHandler: mockGetTaskHandler,
}));

mock.module('@pactprotocol/ipfs-utils', () => ipfsMock);
mock.module('@pactprotocol/database', () => dbMock);

import { submitWorkTool, submitWorkSchema } from '../../../tools/agent/submit-work';

const context = {
  callerAddress: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd' as `0x${string}`,
};

const validInput = {
  taskId: 'task-1',
  summary: 'Completed the widget',
  deliverables: [{ type: 'code' as const, description: 'Source code' }],
};

describe('submit_work tool', () => {
  beforeEach(() => {
    mockGetTaskHandler.mockReset();
    mockGetTaskHandler.mockResolvedValue({
      id: 'task-1',
      phase: 'open',
      workDeadline: null,
      submissionCount: 0,
      requiredWorkers: 3,
    });
    ipfsMock.uploadWorkSubmission.mockReset();
    ipfsMock.uploadWorkSubmission.mockResolvedValue({ cid: 'QmWorkCid123' });
    dbMock.getSubmissionByTaskAndAgent.mockReset();
    dbMock.getSubmissionByTaskAndAgent.mockResolvedValue(null);
    dbMock.createSubmission.mockReset();
  });

  test('should have correct tool metadata', () => {
    expect(submitWorkTool.name).toBe('submit_work');
    expect(submitWorkTool.inputSchema.required).toContain('taskId');
    expect(submitWorkTool.inputSchema.required).toContain('summary');
    expect(submitWorkTool.inputSchema.required).toContain('deliverables');
  });

  test('should submit new work and upload to IPFS', async () => {
    const result = await submitWorkTool.handler(validInput, context);

    expect(ipfsMock.uploadWorkSubmission).toHaveBeenCalled();
    expect(dbMock.createSubmission).toHaveBeenCalled();
    expect(result.submissionCid).toBe('QmWorkCid123');
    expect(result.message).toContain('submitted');
  });

  test('should throw when already submitted (V2: no edits)', async () => {
    dbMock.getSubmissionByTaskAndAgent.mockResolvedValue({
      id: 'sub-1',
      task_id: 'task-1',
      agent_address: context.callerAddress,
      submission_cid: 'QmOldCid',
    } as any);

    await expect(submitWorkTool.handler(validInput, context)).rejects.toThrow(
      'already submitted'
    );
  });

  test('should throw when task not found', async () => {
    mockGetTaskHandler.mockResolvedValue(null as any);

    await expect(submitWorkTool.handler(validInput, context)).rejects.toThrow('Task not found');
  });

  test('should throw when task is not in open or work_phase', async () => {
    mockGetTaskHandler.mockResolvedValue({
      id: 'task-1',
      phase: 'judge_phase',
      workDeadline: null,
      submissionCount: 3,
      requiredWorkers: 3,
    });

    await expect(submitWorkTool.handler(validInput, context)).rejects.toThrow(
      'Cannot submit work for task in phase'
    );
  });

  test('should throw when work deadline has passed', async () => {
    mockGetTaskHandler.mockResolvedValue({
      id: 'task-1',
      phase: 'open',
      workDeadline: '2020-01-01T00:00:00Z',
      submissionCount: 0,
      requiredWorkers: 3,
    });

    await expect(submitWorkTool.handler(validInput, context)).rejects.toThrow(
      'deadline has passed'
    );
  });

  test('should reject empty deliverables', () => {
    expect(() => submitWorkSchema.parse({ ...validInput, deliverables: [] })).toThrow();
  });

  test('should reject invalid CID format', () => {
    expect(() =>
      submitWorkSchema.parse({
        ...validInput,
        deliverables: [{ type: 'code', description: 'src', cid: 'invalid-cid' }],
      })
    ).toThrow();
  });

  test('should accept valid CID format', () => {
    const parsed = submitWorkSchema.parse({
      ...validInput,
      deliverables: [
        { type: 'code', description: 'src', cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG' },
      ],
    });
    expect(parsed.deliverables[0].cid).toBeDefined();
  });
});
