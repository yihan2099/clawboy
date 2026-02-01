import { z } from 'zod';
import { uploadVerificationFeedback } from '@porternetwork/ipfs-utils';
import { createVerdict, getClaimById, updateClaim } from '@porternetwork/database';
import { getTaskHandler } from '../../services/task-service';

export const submitVerdictSchema = z.object({
  taskId: z.string().min(1),
  claimId: z.string().min(1),
  outcome: z.enum(['approved', 'rejected', 'revision_requested']),
  score: z.number().min(0).max(100),
  feedback: z.string().min(1),
  recommendations: z.array(z.string()).optional(),
  txHash: z.string().optional(),
});

export type SubmitVerdictInput = z.infer<typeof submitVerdictSchema>;

export const submitVerdictTool = {
  name: 'submit_verdict',
  description: 'Submit verification verdict for completed work. Only available for Elite tier agents.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID',
      },
      claimId: {
        type: 'string',
        description: 'The claim ID being verified',
      },
      outcome: {
        type: 'string',
        enum: ['approved', 'rejected', 'revision_requested'],
        description: 'Verification outcome',
      },
      score: {
        type: 'number',
        description: 'Overall score (0-100)',
      },
      feedback: {
        type: 'string',
        description: 'Detailed feedback',
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Recommendations for improvement',
      },
      txHash: {
        type: 'string',
        description: 'On-chain transaction hash (optional, if already submitted)',
      },
    },
    required: ['taskId', 'claimId', 'outcome', 'score', 'feedback'],
  },
  handler: async (args: unknown, context: { callerAddress: `0x${string}`; isVerifier: boolean }) => {
    if (!context.isVerifier) {
      throw new Error('Only Elite tier agents can submit verifications');
    }

    const input = submitVerdictSchema.parse(args);

    // Verify task exists and is in submitted state
    const task = await getTaskHandler({ taskId: input.taskId });
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    if (task.status !== 'submitted') {
      throw new Error(`Task is not pending verification: status is ${task.status}`);
    }

    // Verify claim exists
    const claim = await getClaimById(input.claimId);
    if (!claim) {
      throw new Error(`Claim not found: ${input.claimId}`);
    }

    if (claim.task_id !== input.taskId) {
      throw new Error(`Claim ${input.claimId} does not belong to task ${input.taskId}`);
    }

    // Create and upload feedback
    const verifiedAt = new Date().toISOString();
    const feedbackDoc = {
      version: '1.0' as const,
      taskId: input.taskId,
      claimId: input.claimId,
      verdict: input.outcome,
      score: input.score,
      feedback: input.feedback,
      recommendations: input.recommendations,
      verifiedAt,
    };

    const uploadResult = await uploadVerificationFeedback(feedbackDoc);

    // Create verdict record in database
    const verdict = await createVerdict({
      task_id: input.taskId,
      claim_id: input.claimId,
      verifier_address: context.callerAddress,
      outcome: input.outcome,
      score: input.score,
      feedback_cid: uploadResult.cid,
      tx_hash: input.txHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
      verified_at: verifiedAt,
    });

    // Update claim status based on outcome
    const newClaimStatus = input.outcome === 'approved'
      ? 'approved'
      : input.outcome === 'rejected'
        ? 'rejected'
        : 'active'; // revision_requested goes back to active

    await updateClaim(input.claimId, {
      status: newClaimStatus,
      verdict_id: verdict.id,
    });

    return {
      message: 'Verification verdict recorded',
      verdictId: verdict.id,
      taskId: input.taskId,
      claimId: input.claimId,
      outcome: input.outcome,
      score: input.score,
      feedbackCid: uploadResult.cid,
      nextStep: input.txHash
        ? 'Verdict recorded with on-chain confirmation'
        : 'Call the VerificationHub contract to submit verdict on-chain',
    };
  },
};
