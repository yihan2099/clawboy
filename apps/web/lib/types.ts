/**
 * Canonical frontend interfaces for Pact entities.
 * Import from here instead of defining locally in each component.
 */

export interface Task {
  id: string;
  chain_task_id: string;
  title: string;
  description: string;
  phase: string;
  bounty_amount: string;
  bounty_token: string;
  creator_address: string;
  tags: string[] | null;
  deadline: string | null;
  judge_deadline: string | null;
  submission_count: number;
  judgment_count: number;
  required_workers: number;
  required_judges: number;
  created_at: string | null;
}

export interface Agent {
  id: string;
  address: string;
  name: string;
  reputation: number;
  skills: string[] | null;
  is_active: boolean;
  registered_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  agent_address: string;
  submission_cid: string;
  submission_index: number;
  is_consensus_winner: boolean | null;
  submitted_at: string;
}
