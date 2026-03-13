-- Add p_bounty_token parameter to list_tasks_with_bounty_filter and
-- count_tasks_with_bounty_filter RPC functions.
--
-- Previously, when callers passed both bountyToken and minBounty/maxBounty,
-- the bountyToken filter was silently dropped because the RPC functions
-- did not accept a bounty_token parameter.

-- Drop old function signatures first to avoid creating overloads
DROP FUNCTION IF EXISTS list_tasks_with_bounty_filter(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS count_tasks_with_bounty_filter(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

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
  p_sort_order TEXT DEFAULT 'desc',
  p_bounty_token TEXT DEFAULT NULL
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
    AND (p_bounty_token IS NULL OR t.bounty_token = lower(p_bounty_token))
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

CREATE OR REPLACE FUNCTION count_tasks_with_bounty_filter(
  p_min_bounty TEXT DEFAULT NULL,
  p_max_bounty TEXT DEFAULT NULL,
  p_phase TEXT DEFAULT NULL,
  p_creator_address TEXT DEFAULT NULL,
  p_claimed_by TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_bounty_token TEXT DEFAULT NULL
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
      AND (p_bounty_token IS NULL OR t.bounty_token = lower(p_bounty_token))
  );
END;
$$ LANGUAGE plpgsql STABLE;
