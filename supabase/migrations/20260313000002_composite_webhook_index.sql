-- Add composite index on webhook_deliveries for the common query pattern of
-- fetching recent deliveries for a specific agent by status.
-- Resolves TODO(#118) from 20250206000001_webhook_support.sql.
-- The composite index allows a single index scan instead of bitmap-AND of two separate indexes.

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_agent_status
  ON webhook_deliveries(agent_address, status, created_at DESC);
