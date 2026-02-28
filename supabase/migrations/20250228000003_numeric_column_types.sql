-- Migration: Convert numeric TEXT columns to NUMERIC type
-- Fixes #013: TEXT columns for bounty_amount, reputation, vote_weight prevent
-- proper database-level comparison and validation.
--
-- RATIONALE: These values are uint256/int256 from Solidity contracts. NUMERIC in
-- PostgreSQL can store arbitrary precision integers without precision loss.
-- The TEXT representation is preserved in application types (TypeScript) as
-- strings to avoid JS number precision issues, but the DB column type enables
-- proper comparison operators and aggregate functions.

-- Convert tasks.bounty_amount from TEXT to NUMERIC
ALTER TABLE tasks ALTER COLUMN bounty_amount TYPE NUMERIC
  USING bounty_amount::NUMERIC;

ALTER TABLE tasks ALTER COLUMN bounty_amount SET DEFAULT 0;

-- Convert agents.reputation from TEXT to NUMERIC
ALTER TABLE agents ALTER COLUMN reputation TYPE NUMERIC
  USING reputation::NUMERIC;

ALTER TABLE agents ALTER COLUMN reputation SET DEFAULT 0;

-- Convert disputes.dispute_stake from TEXT to NUMERIC
ALTER TABLE disputes ALTER COLUMN dispute_stake TYPE NUMERIC
  USING dispute_stake::NUMERIC;

-- Convert disputes.votes_for_disputer and votes_against_disputer from TEXT to NUMERIC
ALTER TABLE disputes ALTER COLUMN votes_for_disputer TYPE NUMERIC
  USING votes_for_disputer::NUMERIC;

ALTER TABLE disputes ALTER COLUMN votes_for_disputer SET DEFAULT 0;

ALTER TABLE disputes ALTER COLUMN votes_against_disputer TYPE NUMERIC
  USING votes_against_disputer::NUMERIC;

ALTER TABLE disputes ALTER COLUMN votes_against_disputer SET DEFAULT 0;

-- Convert votes.vote_weight from TEXT to NUMERIC (if votes table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'votes' AND column_name = 'vote_weight') THEN
    EXECUTE 'ALTER TABLE votes ALTER COLUMN vote_weight TYPE NUMERIC USING vote_weight::NUMERIC';
    EXECUTE 'ALTER TABLE votes ALTER COLUMN vote_weight SET DEFAULT 0';
  END IF;
END
$$;

-- Drop the functional index that used explicit ::numeric cast (no longer needed now that
-- the column is native NUMERIC). IF EXISTS makes this idempotent and safe to re-run.
-- TODO(#124): If this migration is ever rolled back, the functional index
-- idx_tasks_bounty_amount_numeric should be recreated manually, as DOWN migrations are
-- not currently implemented. Add a rollback script or document the restore procedure.
DROP INDEX IF EXISTS idx_tasks_bounty_amount_numeric;

-- Recreate index on the now-native NUMERIC column
CREATE INDEX IF NOT EXISTS idx_tasks_bounty_amount ON tasks(bounty_amount DESC);
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation DESC);
