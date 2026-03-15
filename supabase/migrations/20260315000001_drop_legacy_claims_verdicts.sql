-- Drop legacy claims and verdicts tables
--
-- These tables were part of the V1 optimistic selection model. The V2 consensus
-- model (migration 20260310000001_v2_consensus_model.sql) replaced them with
-- the submissions + judgments tables. No application code references these tables.
--
-- The archived_disputes and archived_dispute_votes tables (created by the V2
-- migration) are also dropped here since the original dispute tables were
-- already archived and no code references the archives.

-- Drop indexes first (implicit with table drop, but explicit for clarity)
DROP INDEX IF EXISTS idx_claims_task_id;
DROP INDEX IF EXISTS idx_claims_agent;
DROP INDEX IF EXISTS idx_claims_status;
DROP INDEX IF EXISTS idx_verdicts_task_id;
DROP INDEX IF EXISTS idx_verdicts_verifier;

-- Drop the circular FK before dropping tables
ALTER TABLE claims DROP CONSTRAINT IF EXISTS fk_verdict;

-- Drop tables
DROP TABLE IF EXISTS verdicts CASCADE;
DROP TABLE IF EXISTS claims CASCADE;

-- Drop archived dispute tables (created by V2 migration, no longer needed)
DROP TABLE IF EXISTS archived_dispute_votes CASCADE;
DROP TABLE IF EXISTS archived_disputes CASCADE;
