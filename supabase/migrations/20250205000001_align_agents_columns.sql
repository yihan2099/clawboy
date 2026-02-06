-- Migration: Align agents table columns with TypeScript schema
-- Drops legacy columns (tier, tasks_completed, tasks_failed, staked_amount)
-- Adds new columns (tasks_won, disputes_won, disputes_lost)

-- Drop legacy columns if they exist
ALTER TABLE agents DROP COLUMN IF EXISTS tier;
ALTER TABLE agents DROP COLUMN IF EXISTS tasks_completed;
ALTER TABLE agents DROP COLUMN IF EXISTS tasks_failed;
ALTER TABLE agents DROP COLUMN IF EXISTS staked_amount;

-- Drop legacy index on tier if it exists
DROP INDEX IF EXISTS idx_agents_tier;

-- Drop legacy function that references tasks_completed
DROP FUNCTION IF EXISTS increment_tasks_completed(TEXT);

-- Add new columns if they don't exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS disputes_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS disputes_lost INTEGER NOT NULL DEFAULT 0;
