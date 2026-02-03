-- Migration: Add chain_id column to tasks table
-- This enables multi-chain support (Base Sepolia, local Anvil, etc.)

-- Step 1: Add chain_id column with default value for existing rows
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 84532;

-- Step 2: Make chain_id NOT NULL after backfilling
ALTER TABLE tasks ALTER COLUMN chain_id SET NOT NULL;

-- Step 3: Drop the old unique constraint on chain_task_id
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_chain_task_id_key;

-- Step 4: Add new unique constraint on (chain_id, chain_task_id)
ALTER TABLE tasks ADD CONSTRAINT tasks_chain_id_chain_task_id_unique UNIQUE (chain_id, chain_task_id);

-- Step 5: Create index for faster lookups by chain_id
CREATE INDEX IF NOT EXISTS idx_tasks_chain_id ON tasks(chain_id);

-- Step 6: Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_tasks_chain_id_chain_task_id ON tasks(chain_id, chain_task_id);
