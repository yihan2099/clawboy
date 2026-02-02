-- Migration: Competitive Task System
-- This migration updates the schema for the competitive task model with optimistic verification
-- Run with: supabase db push

-- =============================================================================
-- STEP 1: Update agents table (remove tiers, add dispute tracking)
-- =============================================================================

-- Drop old indexes related to tier
DROP INDEX IF EXISTS idx_agents_tier;

-- Remove tier-related columns and add new ones
ALTER TABLE agents
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS staked_amount,
  DROP COLUMN IF EXISTS tasks_completed,
  DROP COLUMN IF EXISTS tasks_failed;

-- Add new columns for competitive model
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS tasks_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputes_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputes_lost INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- STEP 2: Update tasks table for competitive model
-- =============================================================================

-- Remove claim-related columns (no more single claiming)
ALTER TABLE tasks
  DROP COLUMN IF EXISTS claimed_by,
  DROP COLUMN IF EXISTS claimed_at,
  DROP COLUMN IF EXISTS submission_cid,
  DROP COLUMN IF EXISTS submitted_at;

-- Add winner selection columns
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS winner_address TEXT,
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenge_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

-- Drop old index
DROP INDEX IF EXISTS idx_tasks_claimed_by;

-- Add new index for winner
CREATE INDEX IF NOT EXISTS idx_tasks_winner ON tasks(winner_address);

-- =============================================================================
-- STEP 3: Create submissions table (replaces old claims concept)
-- =============================================================================

-- Drop old claims table (no longer used in competitive model)
DROP TABLE IF EXISTS claims CASCADE;

-- Drop old verdicts table (replaced by dispute system)
DROP TABLE IF EXISTS verdicts CASCADE;

-- Create submissions table for competitive model
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_address TEXT NOT NULL,
  submission_cid TEXT NOT NULL,
  submission_index INTEGER NOT NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, agent_address),
  UNIQUE(task_id, submission_index)
);

-- Indexes for submissions
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_agent ON submissions(agent_address);
CREATE INDEX IF NOT EXISTS idx_submissions_winner ON submissions(task_id, is_winner) WHERE is_winner = true;

-- =============================================================================
-- STEP 4: Create disputes table
-- =============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_dispute_id TEXT UNIQUE NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  disputer_address TEXT NOT NULL,
  dispute_stake TEXT NOT NULL,
  voting_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'cancelled'
  disputer_won BOOLEAN,
  votes_for_disputer TEXT NOT NULL DEFAULT '0',
  votes_against_disputer TEXT NOT NULL DEFAULT '0',
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(task_id) -- Only one dispute per task
);

-- Indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_disputer ON disputes(disputer_address);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- =============================================================================
-- STEP 5: Create dispute_votes table
-- =============================================================================

CREATE TABLE IF NOT EXISTS dispute_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  supports_disputer BOOLEAN NOT NULL,
  weight INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, voter_address)
);

-- Indexes for dispute votes
CREATE INDEX IF NOT EXISTS idx_dispute_votes_dispute_id ON dispute_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_voter ON dispute_votes(voter_address);

-- =============================================================================
-- STEP 6: Update helper functions
-- =============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS increment_tasks_completed(TEXT);

-- Create new helper functions
CREATE OR REPLACE FUNCTION increment_tasks_won(agent_addr TEXT)
RETURNS void AS $$
BEGIN
  UPDATE agents
  SET
    tasks_won = tasks_won + 1,
    updated_at = NOW()
  WHERE address = agent_addr;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_disputes_won(agent_addr TEXT)
RETURNS void AS $$
BEGIN
  UPDATE agents
  SET
    disputes_won = disputes_won + 1,
    updated_at = NOW()
  WHERE address = agent_addr;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_disputes_lost(agent_addr TEXT)
RETURNS void AS $$
BEGIN
  UPDATE agents
  SET
    disputes_lost = disputes_lost + 1,
    updated_at = NOW()
  WHERE address = agent_addr;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_agent_reputation(agent_addr TEXT, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE agents
  SET
    reputation = GREATEST(0, CAST(reputation AS INTEGER) + delta)::TEXT,
    updated_at = NOW()
  WHERE address = agent_addr;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 7: Add trigger for submission count
-- =============================================================================

CREATE OR REPLACE FUNCTION update_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks SET submission_count = submission_count + 1 WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET submission_count = submission_count - 1 WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_submission_count ON submissions;
CREATE TRIGGER trigger_update_submission_count
  AFTER INSERT OR DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_count();
