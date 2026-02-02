import { z } from 'zod';
import { getTaskHandler } from '../../services/task-service';
import { uploadWorkSubmission } from '@porternetwork/ipfs-utils';
import {
  getSubmissionByTaskAndAgent,
  createSubmission,
  updateSubmission,
} from '@porternetwork/database';
import type { WorkSubmission } from '@porternetwork/shared-types';

export const submitWorkSchema = z.object({
  taskId: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional(),
  deliverables: z.array(
    z.object({
      type: z.enum(['code', 'document', 'data', 'file', 'other']),
      description: z.string().min(1),
      cid: z.string().optional(),
      url: z.string().url().optional(),
    })
  ).min(1),
  creatorNotes: z.string().optional(),
});

export type SubmitWorkInput = z.infer<typeof submitWorkSchema>;

export const submitWorkTool = {
  name: 'submit_work',
  description: 'Submit work for an open task. In the competitive model, any registered agent can submit work. You can update your submission before the deadline.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID',
      },
      summary: {
        type: 'string',
        description: 'Summary of work completed',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the work',
      },
      deliverables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['code', 'document', 'data', 'file', 'other'],
            },
            description: { type: 'string' },
            cid: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['type', 'description'],
        },
        description: 'Submitted deliverables with CIDs or URLs',
      },
      creatorNotes: {
        type: 'string',
        description: 'Notes for the task creator',
      },
    },
    required: ['taskId', 'summary', 'deliverables'],
  },
  handler: async (args: unknown, context: { callerAddress: `0x${string}` }) => {
    const input = submitWorkSchema.parse(args);

    // Verify task exists and is open
    const task = await getTaskHandler({ taskId: input.taskId });
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    if (task.status !== 'open') {
      throw new Error(`Cannot submit work for task with status: ${task.status}. Task must be open.`);
    }

    // Check if deadline has passed
    if (task.deadline && new Date(task.deadline) < new Date()) {
      throw new Error('Task deadline has passed');
    }

    // Create work submission for IPFS
    const submission: WorkSubmission = {
      version: '1.0',
      taskId: input.taskId,
      summary: input.summary,
      description: input.description,
      deliverables: input.deliverables.map((d) => ({
        type: d.type,
        description: d.description,
        cid: d.cid,
        url: d.url,
      })),
      creatorNotes: input.creatorNotes,
      submittedAt: new Date().toISOString(),
    };

    // Upload to IPFS
    const uploadResult = await uploadWorkSubmission(submission);

    // Check if this is an update to an existing submission
    const existingSubmission = await getSubmissionByTaskAndAgent(
      input.taskId,
      context.callerAddress
    );

    let isUpdate = false;

    if (existingSubmission) {
      // Update existing submission
      await updateSubmission(existingSubmission.id, {
        submission_cid: uploadResult.cid,
        updated_at: new Date().toISOString(),
      });
      isUpdate = true;
    } else {
      // Create new submission
      await createSubmission({
        task_id: input.taskId,
        agent_address: context.callerAddress,
        submission_cid: uploadResult.cid,
        submission_index: 0, // Will be updated by indexer from chain event
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return {
      message: isUpdate ? 'Submission updated successfully' : 'Work submitted successfully',
      taskId: input.taskId,
      submissionCid: uploadResult.cid,
      isUpdate,
      nextStep: 'Call the TaskManager contract to submit the work on-chain with this CID',
    };
  },
};
