import { uploadWorkSubmission, fetchWorkSubmission } from '@porternetwork/ipfs-utils';
import {
  createClaim,
  getClaimsByAgent,
  getClaimByTaskAndAgent,
  updateClaim,
  getTaskById,
} from '@porternetwork/database';
import type { SubmitWorkInput, ClaimTaskInput } from '@porternetwork/shared-types';

/**
 * Prepare a task claim
 * Creates a claim record in the database
 * Note: Actual on-chain claim should be verified separately
 */
export async function prepareClaimHandler(
  input: ClaimTaskInput,
  agentAddress: `0x${string}`
): Promise<{
  claimId: string;
  taskId: string;
  agentAddress: `0x${string}`;
  message?: string;
}> {
  // Check if agent already has an active claim on this task
  const existingClaim = await getClaimByTaskAndAgent(input.taskId, agentAddress);
  if (existingClaim && ['active', 'submitted', 'under_verification'].includes(existingClaim.status)) {
    throw new Error(`You already have an active claim on this task: ${existingClaim.id}`);
  }

  // Create claim record
  const claim = await createClaim({
    task_id: input.taskId,
    agent_address: agentAddress,
    status: 'active',
    claimed_at: new Date().toISOString(),
  });

  return {
    claimId: claim.id,
    taskId: input.taskId,
    agentAddress,
    message: input.message,
  };
}

/**
 * Prepare work submission
 * Uploads submission to IPFS and updates claim record
 */
export async function prepareSubmitWorkHandler(
  input: SubmitWorkInput,
  agentAddress: `0x${string}`
): Promise<{
  taskId: string;
  claimId: string;
  submissionCid: string;
}> {
  // Find the active claim for this task/agent
  const claim = await getClaimByTaskAndAgent(input.taskId, agentAddress);
  if (!claim) {
    throw new Error(`No claim found for task ${input.taskId}`);
  }

  if (claim.status !== 'active') {
    throw new Error(`Claim is not active: status is ${claim.status}`);
  }

  // Create work submission
  const submission = {
    version: '1.0' as const,
    taskId: input.taskId,
    summary: input.summary,
    description: input.description,
    deliverables: input.deliverables.map((d) => ({
      type: d.type as 'code' | 'document' | 'data' | 'file' | 'other',
      description: d.description,
      cid: d.cid,
      url: d.url,
    })),
    verifierNotes: input.verifierNotes,
    submittedAt: new Date().toISOString(),
  };

  // Upload to IPFS
  const uploadResult = await uploadWorkSubmission(submission);

  // Update claim with submission info
  await updateClaim(claim.id, {
    status: 'submitted',
    submission_cid: uploadResult.cid,
    submitted_at: new Date().toISOString(),
  });

  return {
    taskId: input.taskId,
    claimId: claim.id,
    submissionCid: uploadResult.cid,
  };
}

/**
 * Get claims for an agent
 */
export async function getAgentClaimsHandler(
  agentAddress: `0x${string}`,
  status?: string,
  limit?: number
): Promise<{
  claims: Array<{
    claimId: string;
    taskId: string;
    taskTitle: string;
    status: string;
    claimedAt: string;
    deadline: string | null;
    bountyAmount: string;
  }>;
  total: number;
}> {
  // Get claims from database
  const claimRows = await getClaimsByAgent(agentAddress, { status, limit });

  // Enrich claims with task data
  const claims = await Promise.all(
    claimRows.map(async (claim) => {
      const task = await getTaskById(claim.task_id);
      return {
        claimId: claim.id,
        taskId: claim.task_id,
        taskTitle: task?.title ?? 'Unknown Task',
        status: claim.status,
        claimedAt: claim.claimed_at,
        deadline: claim.deadline,
        bountyAmount: task?.bounty_amount ?? '0',
      };
    })
  );

  return {
    claims,
    total: claims.length,
  };
}
