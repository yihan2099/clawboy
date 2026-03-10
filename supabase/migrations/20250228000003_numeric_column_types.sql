-- Migration: Convert numeric TEXT columns to NUMERIC type
-- Fixes #013: TEXT columns for bounty_amount, reputation, vote_weight prevent
-- proper database-level comparison and validation.
--
-- RATIONALE: These values are uint256/int256 from Solidity contracts. NUMERIC in
-- PostgreSQL can store arbitrary precision integers without precision loss.
-- The TEXT representation is preserved in application types (TypeScript) as
-- strings to avoid JS number precision issues, but the DB column type enables
-- proper comparison operators and aggregate functions.

-- NOTE: bounty_amount is intentionally kept as TEXT (not converted to NUMERIC).
-- Wei values (e.g. 1 ETH = 1e18) exceed JavaScript's Number.MAX_SAFE_INTEGER,
-- and storing as NUMERIC would cause the generated TypeScript types to use `number`,
-- leading to silent precision loss in the application layer. The RPC functions
-- already cast bounty_amount::NUMERIC for comparison and aggregation, so keeping
-- the column as TEXT preserves full precision while still enabling proper queries.

-- Convert agents.reputation from TEXT to NUMERIC
ALTER TABLE agents ALTER COLUMN reputation DROP DEFAULT;
ALTER TABLE agents ALTER COLUMN reputation TYPE NUMERIC
  USING reputation::NUMERIC;
ALTER TABLE agents ALTER COLUMN reputation SET DEFAULT 0;

-- Convert disputes.dispute_stake from TEXT to NUMERIC
ALTER TABLE disputes ALTER COLUMN dispute_stake DROP DEFAULT;
ALTER TABLE disputes ALTER COLUMN dispute_stake TYPE NUMERIC
  USING dispute_stake::NUMERIC;

-- Convert disputes.votes_for_disputer and votes_against_disputer from TEXT to NUMERIC
ALTER TABLE disputes ALTER COLUMN votes_for_disputer DROP DEFAULT;
ALTER TABLE disputes ALTER COLUMN votes_for_disputer TYPE NUMERIC
  USING votes_for_disputer::NUMERIC;
ALTER TABLE disputes ALTER COLUMN votes_for_disputer SET DEFAULT 0;

ALTER TABLE disputes ALTER COLUMN votes_against_disputer DROP DEFAULT;
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

-- bounty_amount stays TEXT so keep the functional index for numeric comparisons
-- (created in 20250201000003_bounty_numeric_comparison.sql as idx_tasks_bounty_numeric)
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation DESC);
