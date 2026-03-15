-- Add updated_by column to tasks table for audit trail
--
-- Records which service/actor last modified the task. Values follow the pattern:
--   'indexer:<event_name>' — for indexer event processing (e.g. 'indexer:TaskResolved')
--   'admin:<action>' — for admin operations
--   NULL — for legacy rows or when the caller doesn't set it

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by TEXT;

COMMENT ON COLUMN tasks.updated_by IS
  'Identifies the service or actor that last modified this row. '
  'Format: ''indexer:<event>'', ''admin:<action>'', or NULL for legacy rows.';
