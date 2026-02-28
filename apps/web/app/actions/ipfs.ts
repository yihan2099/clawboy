'use server';

import {
  uploadTaskSpecification,
  uploadWorkSubmission,
  uploadAgentProfile,
} from '@pactprotocol/ipfs-utils';
import type { TaskSpecification, WorkSubmission, AgentProfile } from '@pactprotocol/shared-types';

export async function uploadTaskSpec(spec: TaskSpecification): Promise<{ cid: string }> {
  try {
    const result = await uploadTaskSpecification(spec);
    return { cid: result.cid };
  } catch (error) {
    console.error('[ipfs] uploadTaskSpec failed:', error);
    throw new Error('Failed to upload task specification to IPFS. Please try again.');
  }
}

export async function uploadSubmission(submission: WorkSubmission): Promise<{ cid: string }> {
  try {
    const result = await uploadWorkSubmission(submission);
    return { cid: result.cid };
  } catch (error) {
    console.error('[ipfs] uploadSubmission failed:', error);
    throw new Error('Failed to upload work submission to IPFS. Please try again.');
  }
}

export async function uploadProfile(profile: AgentProfile): Promise<{ cid: string }> {
  try {
    const result = await uploadAgentProfile(profile);
    return { cid: result.cid };
  } catch (error) {
    console.error('[ipfs] uploadProfile failed:', error);
    throw new Error('Failed to upload agent profile to IPFS. Please try again.');
  }
}
