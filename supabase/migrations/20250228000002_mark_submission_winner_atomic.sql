-- Migration: Add atomic mark_submission_winner RPC function
-- Fixes #011 and #012: Non-atomic winner selection race condition in submission-queries.ts
--
-- The TypeScript fallback path uses two sequential UPDATE statements (clear all winners,
-- then set new winner) with a race window between them. This atomic SQL function
-- performs both operations in a single transaction, eliminating the race condition.

CREATE OR REPLACE FUNCTION mark_submission_winner(
  p_task_id uuid,
  p_agent_address text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear all existing winners for this task
  UPDATE submissions
  SET is_winner = false,
      updated_at = now()
  WHERE task_id = p_task_id
    AND is_winner = true;

  -- Set the new winner atomically in the same transaction
  UPDATE submissions
  SET is_winner = true,
      updated_at = now()
  WHERE task_id = p_task_id
    AND agent_address = p_agent_address;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found for task % agent %', p_task_id, p_agent_address;
  END IF;
END;
$$;

COMMENT ON FUNCTION mark_submission_winner IS
  'Atomically clears all winner flags for a task and sets the new winner. '
  'Eliminates the race condition from the two-step TypeScript fallback path.';
