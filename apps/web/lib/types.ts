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

/** @deprecated V2 removed disputes. Kept for archived dispute display. */
export interface Dispute {
  id: string;
  chain_dispute_id: string;
  task_id: string;
  disputer_address: string;
  dispute_stake: string;
  voting_deadline: string;
  status: string;
  disputer_won: boolean | null;
  votes_for_disputer: string;
  votes_against_disputer: string;
  created_at: string;
  resolved_at: string | null;
}

export interface Agent {
  id: string;
  address: string;
  name: string;
  reputation: number;
  tasks_won: number;
  /** @deprecated V1 field — kept for DB compatibility. V2 uses on-chain consensus stats. */
  disputes_won: number;
  /** @deprecated V1 field — kept for DB compatibility. V2 uses on-chain consensus stats. */
  disputes_lost: number;
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
