-- Clawboy Competitive Model Schema Update
-- Adds submissions table and updates tasks table for competitive task model

-- Add new columns to tasks table for competitive model
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS winner_address TEXT,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenge_deadline TIMESTAMPTZ;

-- Drop old claim-related columns if they exist (we're moving to competitive model)
-- Note: keeping claimed_by and claimed_at for backwards compatibility, they'll just be unused

-- Submissions table for competitive model (multiple submissions per task)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_address TEXT NOT NULL,
  submission_cid TEXT NOT NULL,
  submission_index INTEGER NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, agent_address)
);

-- Disputes table for challenge mechanism
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_dispute_id TEXT UNIQUE NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  disputer_address TEXT NOT NULL,
  dispute_stake TEXT NOT NULL,
  voting_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  disputer_won BOOLEAN,
  votes_for_disputer TEXT NOT NULL DEFAULT '0',
  votes_against_disputer TEXT NOT NULL DEFAULT '0',
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Dispute votes table
CREATE TABLE IF NOT EXISTS dispute_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  supports_disputer BOOLEAN NOT NULL,
  vote_weight TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dispute_id, voter_address)
);

-- Indexes for submissions
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_agent ON submissions(agent_address);
CREATE INDEX IF NOT EXISTS idx_submissions_winner ON submissions(is_winner) WHERE is_winner = true;
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- Indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_disputer ON disputes(disputer_address);

-- Indexes for dispute votes
CREATE INDEX IF NOT EXISTS idx_dispute_votes_dispute_id ON dispute_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_voter ON dispute_votes(voter_address);

-- Indexes for tasks new columns
CREATE INDEX IF NOT EXISTS idx_tasks_winner ON tasks(winner_address);

-- Function to update submission count on task
CREATE OR REPLACE FUNCTION update_task_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks SET submission_count = submission_count + 1, updated_at = NOW()
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET submission_count = submission_count - 1, updated_at = NOW()
    WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update submission count
DROP TRIGGER IF EXISTS trigger_update_submission_count ON submissions;
CREATE TRIGGER trigger_update_submission_count
  AFTER INSERT OR DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_task_submission_count();

-- RLS policies for submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions are publicly readable"
  ON submissions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Submissions are insertable by service role"
  ON submissions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Submissions are updatable by service role"
  ON submissions FOR UPDATE
  TO service_role
  USING (true);

-- RLS policies for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disputes are publicly readable"
  ON disputes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Disputes are insertable by service role"
  ON disputes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Disputes are updatable by service role"
  ON disputes FOR UPDATE
  TO service_role
  USING (true);

-- RLS policies for dispute_votes
ALTER TABLE dispute_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute votes are publicly readable"
  ON dispute_votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Dispute votes are insertable by service role"
  ON dispute_votes FOR INSERT
  TO service_role
  WITH CHECK (true);
