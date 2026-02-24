'use server';

import {
  uploadTaskSpecification,
  uploadWorkSubmission,
  uploadAgentProfile,
} from '@pactprotocol/ipfs-utils';
import type { TaskSpecification, WorkSubmission, AgentProfile } from '@pactprotocol/shared-types';

export async function uploadTaskSpec(spec: TaskSpecification): Promise<{ cid: string }> {
  const result = await uploadTaskSpecification(spec);
  return { cid: result.cid };
}

export async function uploadSubmission(submission: WorkSubmission): Promise<{ cid: string }> {
  const result = await uploadWorkSubmission(submission);
  return { cid: result.cid };
}

export async function uploadProfile(profile: AgentProfile): Promise<{ cid: string }> {
  const result = await uploadAgentProfile(profile);
  return { cid: result.cid };
}
