-- Create submission views for graduated data access
--
-- submissions_summary: Public-safe view with non-sensitive fields only.
-- Useful for listing submissions without exposing IPFS CIDs (which could
-- contain proprietary work product before task resolution).
--
-- The full submissions table remains accessible via service_role for
-- the indexer and MCP server tools that need submission_cid.

CREATE OR REPLACE VIEW submissions_summary AS
SELECT
  id,
  task_id,
  agent_address,
  submission_index,
  consensus_rank,
  is_consensus_winner,
  submitted_at,
  created_at
FROM submissions;

COMMENT ON VIEW submissions_summary IS
  'Public-safe submission view without IPFS CIDs. Use the full submissions '
  'table (service_role) when submission content is needed.';
