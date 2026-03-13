-- V2 Consensus Model Migration
-- Transforms from optimistic selection (single winner + disputes) to
-- redundant execution + consensus (N workers + M judges)
--
-- This is a breaking migration. Run against a backed-up database.
--
-- ORDERING REQUIREMENT:
-- This migration MUST run as part of the full migration set (all prior migrations
-- applied first). It replaces statistics functions from 20250203000002 that reference
-- the `status` column which this migration drops. Running migrations out of order or
-- partially will cause function errors referencing non-existent columns.
--
-- ROLLBACK PROCEDURE:
-- Supabase migrations run inside a transaction by default. If any statement
-- fails, the entire migration is rolled back automatically (PostgreSQL DDL
-- is transactional). For manual rollback after a successful migration:
--   1. Restore the `status` column: ALTER TABLE tasks ADD COLUMN status text;
--   2. Restore `winner_address`, `claimed_at`, `claimed_by` columns
--   3. Restore `disputes` and `dispute_votes` tables from `archived_*` copies
--   4. Re-create dropped V1 functions (sum_completed_bounties, count_tasks_by_status, etc.)
--   5. Drop new V2 columns: required_workers, required_judges, judge_deadline, submission_count, judgment_count
-- In practice, restore from the backup taken before running this migration.

-- ============================================================
-- Step 1: Archive old dispute tables
-- ============================================================

CREATE TABLE IF NOT EXISTS archived_disputes AS SELECT * FROM disputes;
CREATE TABLE IF NOT EXISTS archived_dispute_votes AS SELECT * FROM dispute_votes;

-- ============================================================
-- Step 2: Modify tasks table — add V2 columns
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_workers integer NOT NULL DEFAULT 3;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_judges integer NOT NULL DEFAULT 3;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS judge_deadline timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'open';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_count integer NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS judgment_count integer NOT NULL DEFAULT 0;

-- ============================================================
-- Step 3: Migrate existing task data
-- ============================================================

-- Map old status values to new phases for existing rows.
-- NOTE: 'in_review' -> 'resolved' loses review state. The V2 model has no 'in_review'
-- equivalent (it uses judge_phase instead). For testnet data this is acceptable.
-- If migrating production data with active in_review tasks, handle them manually
-- before running this migration (e.g., move to 'open' or resolve them first).
UPDATE tasks SET phase = CASE
  WHEN status = 'open' THEN 'open'
  WHEN status = 'in_review' THEN 'resolved'
  WHEN status = 'completed' THEN 'resolved'
  WHEN status = 'disputed' THEN 'resolved'
  WHEN status = 'refunded' THEN 'failed'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'open'
END
WHERE phase = 'open' AND status IS NOT NULL;

-- Set legacy tasks to N=1, M=0 (pre-consensus model)
UPDATE tasks SET required_workers = 1, required_judges = 0
WHERE phase IN ('resolved', 'failed', 'cancelled');

-- Update submission_count from actual submissions
UPDATE tasks t SET submission_count = (
  SELECT COUNT(*) FROM submissions s WHERE s.task_id = t.id
);

-- ============================================================
-- Step 4: Modify submissions table — add V2 columns
-- ============================================================

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_index integer;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS consensus_rank integer;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_consensus_winner boolean DEFAULT false;

-- Backfill submission_index for existing submissions (order by submitted_at)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY submitted_at) - 1 AS idx
  FROM submissions
)
UPDATE submissions SET submission_index = ranked.idx
FROM ranked WHERE submissions.id = ranked.id AND submissions.submission_index IS NULL;

-- ============================================================
-- Step 5: Create judgments table
-- ============================================================

CREATE TABLE IF NOT EXISTS judgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  judge_address text NOT NULL,
  judgment_index integer NOT NULL,
  ranking integer[] NOT NULL,
  in_consensus boolean,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, judge_address),
  UNIQUE(task_id, judgment_index)
);

-- ============================================================
-- Step 6: Create task_payouts table
-- ============================================================

CREATE TABLE IF NOT EXISTS task_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  recipient_address text NOT NULL,
  role text NOT NULL CHECK (role IN ('worker', 'judge', 'protocol')),
  amount text NOT NULL,
  consensus_rank integer,
  tx_hash text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Step 7: Add indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase);
CREATE INDEX IF NOT EXISTS idx_tasks_judge_deadline ON tasks(judge_deadline) WHERE phase = 'judge_phase';
CREATE INDEX IF NOT EXISTS idx_judgments_task_id ON judgments(task_id);
CREATE INDEX IF NOT EXISTS idx_judgments_judge_address ON judgments(judge_address);
CREATE INDEX IF NOT EXISTS idx_task_payouts_task_id ON task_payouts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_payouts_recipient ON task_payouts(recipient_address);

-- ============================================================
-- Step 8: Drop old tables
-- ============================================================

DROP TABLE IF EXISTS dispute_votes CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;

-- ============================================================
-- Step 9: Drop old columns from tasks
-- ============================================================

ALTER TABLE tasks DROP COLUMN IF EXISTS status;
ALTER TABLE tasks DROP COLUMN IF EXISTS winner_address;
ALTER TABLE tasks DROP COLUMN IF EXISTS selection_deadline;
ALTER TABLE tasks DROP COLUMN IF EXISTS selected_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS challenge_deadline;

-- Drop is_winner from submissions (replaced by is_consensus_winner)
ALTER TABLE submissions DROP COLUMN IF EXISTS is_winner;

-- ============================================================
-- Step 10: RLS policies for new tables
-- ============================================================

ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_payouts ENABLE ROW LEVEL SECURITY;

-- Public read access for judgments (via anon key)
CREATE POLICY "judgments_select_all" ON judgments
  FOR SELECT USING (true);

-- Public read access for task_payouts (via anon key)
CREATE POLICY "task_payouts_select_all" ON task_payouts
  FOR SELECT USING (true);

-- Service role can insert/update judgments
CREATE POLICY "judgments_insert_service" ON judgments
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "judgments_update_service" ON judgments
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Service role can insert task_payouts
CREATE POLICY "task_payouts_insert_service" ON task_payouts
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- Step 11: Update RPC functions that referenced dropped `status` column
-- ============================================================

-- Drop old function signatures first (parameter names changed, so CREATE OR REPLACE
-- would create an overload rather than replacing)
DROP FUNCTION IF EXISTS list_tasks_with_bounty_filter(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS count_tasks_with_bounty_filter(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

-- Replace list_tasks_with_bounty_filter: p_status -> p_phase, status -> phase
CREATE OR REPLACE FUNCTION list_tasks_with_bounty_filter(
  p_min_bounty TEXT DEFAULT NULL,
  p_max_bounty TEXT DEFAULT NULL,
  p_phase TEXT DEFAULT NULL,
  p_creator_address TEXT DEFAULT NULL,
  p_claimed_by TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  chain_task_id TEXT,
  creator_address TEXT,
  phase TEXT,
  bounty_amount TEXT,
  bounty_token TEXT,
  specification_cid TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  deadline TIMESTAMPTZ,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  submission_cid TEXT,
  submitted_at TIMESTAMPTZ,
  created_at_block TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.chain_task_id,
    t.creator_address,
    t.phase,
    t.bounty_amount,
    t.bounty_token,
    t.specification_cid,
    t.title,
    t.description,
    t.tags,
    t.deadline,
    t.claimed_by,
    t.claimed_at,
    t.submission_cid,
    t.submitted_at,
    t.created_at_block,
    t.created_at,
    t.updated_at
  FROM tasks t
  WHERE
    (p_min_bounty IS NULL OR t.bounty_amount::numeric >= p_min_bounty::numeric)
    AND (p_max_bounty IS NULL OR t.bounty_amount::numeric <= p_max_bounty::numeric)
    AND (p_phase IS NULL OR t.phase = p_phase)
    AND (p_creator_address IS NULL OR t.creator_address = p_creator_address)
    AND (p_claimed_by IS NULL OR t.claimed_by = p_claimed_by)
    AND (p_tags IS NULL OR t.tags && p_tags)
  ORDER BY
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'bounty_amount' THEN t.bounty_amount::numeric END DESC,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'bounty_amount' THEN t.bounty_amount::numeric END ASC,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'created_at' THEN t.created_at END DESC,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'created_at' THEN t.created_at END ASC,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'deadline' THEN t.deadline END DESC,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'deadline' THEN t.deadline END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Replace count_tasks_with_bounty_filter: p_status -> p_phase, status -> phase
CREATE OR REPLACE FUNCTION count_tasks_with_bounty_filter(
  p_min_bounty TEXT DEFAULT NULL,
  p_max_bounty TEXT DEFAULT NULL,
  p_phase TEXT DEFAULT NULL,
  p_creator_address TEXT DEFAULT NULL,
  p_claimed_by TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM tasks t
    WHERE
      (p_min_bounty IS NULL OR t.bounty_amount::numeric >= p_min_bounty::numeric)
      AND (p_max_bounty IS NULL OR t.bounty_amount::numeric <= p_max_bounty::numeric)
      AND (p_phase IS NULL OR t.phase = p_phase)
      AND (p_creator_address IS NULL OR t.creator_address = p_creator_address)
      AND (p_claimed_by IS NULL OR t.claimed_by = p_claimed_by)
      AND (p_tags IS NULL OR t.tags && p_tags)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Replace sum_completed_bounties: status='completed' -> phase='resolved'
CREATE OR REPLACE FUNCTION sum_completed_bounties()
RETURNS TEXT AS $$
DECLARE
  total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(bounty_amount::NUMERIC), 0)
  INTO total
  FROM tasks
  WHERE phase = 'resolved';

  RETURN total::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Replace sum_open_bounties: status='open' -> phase='open'
CREATE OR REPLACE FUNCTION sum_open_bounties()
RETURNS TEXT AS $$
DECLARE
  total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(bounty_amount::NUMERIC), 0)
  INTO total
  FROM tasks
  WHERE phase = 'open';

  RETURN total::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Drop mark_submission_winner: V2 uses consensus, no single winner
DROP FUNCTION IF EXISTS mark_submission_winner(uuid, text);
