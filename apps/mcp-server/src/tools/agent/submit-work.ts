import { z } from 'zod';
import { getTaskHandler } from '../../services/task-service';
import { uploadWorkSubmission } from '@pactprotocol/ipfs-utils';
import {
  getSubmissionByTaskAndAgent,
  createSubmission,
} from '@pactprotocol/database';
import type { WorkSubmission } from '@pactprotocol/shared-types';

// SECURITY: IPFS CID v0 and v1 format validation
const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/;

export const submitWorkSchema = z.object({
  taskId: z.string().min(1).max(100), // SECURITY: Limit task ID length
  summary: z.string().min(1).max(1000), // SECURITY: Limit summary length
  description: z.string().max(50000).optional(), // SECURITY: Limit description length
  deliverables: z
    .array(
      z.object({
        type: z.enum(['code', 'document', 'data', 'file', 'other']),
        description: z.string().min(1).max(2000), // SECURITY: Limit description
        // SECURITY: Validate CID format if provided
        cid: z.string().regex(cidRegex, 'Invalid IPFS CID format').optional(),
        // SECURITY: Validate URL format (zod already validates)
        url: z.string().url().max(2000).optional(),
      })
    )
    .min(1)
    .max(20), // SECURITY: Limit number of deliverables
  creatorNotes: z.string().max(5000).optional(), // SECURITY: Limit notes length
});

export type SubmitWorkInput = z.infer<typeof submitWorkSchema>;

export const submitWorkTool = {
  name: 'submit_work',
  description:
    'Submit work for a task. In V2, each worker gets exactly one slot (no edits). N workers submit independently, then M judges rank the outputs.',
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

    // Verify task exists
    const task = await getTaskHandler({ taskId: input.taskId });
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    // V2: Check phase (must be open or work_phase)
    if (task.phase !== 'open' && task.phase !== 'work_phase') {
      throw new Error(
        `Cannot submit work for task in phase: ${task.phase}. Task must be in open or work_phase.`
      );
    }

    // Check if work deadline has passed (server-side pre-validation)
    if (task.workDeadline && new Date(task.workDeadline) < new Date()) {
      throw new Error(
        `Work deadline has passed (deadline: ${task.workDeadline}). Submissions are no longer accepted.`
      );
    }

    // V2: Check if worker already submitted (no edits in V2)
    const existingSubmission = await getSubmissionByTaskAndAgent(
      input.taskId,
      context.callerAddress
    );
    if (existingSubmission) {
      throw new Error(
        'You have already submitted work for this task. In V2, each worker gets exactly one submission slot (no edits).'
      );
    }

    // Check if slots are full
    const submissionCount = task.submissionCount;
    const requiredWorkers = task.requiredWorkers;
    if (requiredWorkers && submissionCount !== undefined && submissionCount >= requiredWorkers) {
      throw new Error(
        `All ${requiredWorkers} worker slots are filled. No more submissions accepted.`
      );
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

    // Create new submission with a temporary submission_index=0 placeholder.
    // The indexer's WorkSubmitted handler will update this with the real on-chain index.
    await createSubmission({
      task_id: input.taskId,
      agent_address: context.callerAddress,
      submission_cid: uploadResult.cid,
      submission_index: 0, // Temporary placeholder; corrected by indexer on WorkSubmitted event
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return {
      message: 'Work submitted successfully',
      taskId: input.taskId,
      submissionCid: uploadResult.cid,
      slotsRemaining: requiredWorkers
        ? requiredWorkers - (submissionCount ?? 0) - 1
        : undefined,
      nextStep: 'Call the TaskManagerV2 contract to submit the work on-chain with this CID',
    };
  },
};
