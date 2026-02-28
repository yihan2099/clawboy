-- Atomic retry count increment for failed_events.
-- Replaces the SELECT-then-UPDATE pattern in updateFailedEventRetry() which has a
-- TOCTOU race window when two concurrent processes retry the same event simultaneously.
--
-- The function increments retry_count in a single atomic UPDATE and sets status to
-- 'failed' if the new count reaches max_retries, or 'retrying' otherwise.
-- Returns the updated row so the caller can see the final state.

CREATE OR REPLACE FUNCTION increment_failed_event_retry(
  p_event_id UUID,
  p_error_message TEXT,
  p_error_stack TEXT,
  p_last_retry_at TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  retry_count INTEGER,
  max_retries INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE failed_events fe
  SET
    retry_count  = fe.retry_count + 1,
    last_retry_at = p_last_retry_at,
    error_message = p_error_message,
    error_stack   = p_error_stack,
    status        = CASE
                      WHEN fe.retry_count + 1 >= fe.max_retries THEN 'failed'
                      ELSE 'retrying'
                    END,
    updated_at    = NOW()
  WHERE fe.id = p_event_id
  RETURNING fe.id, fe.retry_count, fe.max_retries, fe.status;
END;
$$ LANGUAGE plpgsql;
