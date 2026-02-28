-- Migration: Enable Row Level Security on webhook_deliveries
--
-- The webhook_deliveries table was created in 20250206000001_webhook_support.sql
-- without RLS, violating the project security model (all tables must have RLS).
-- This migration enables RLS and adds service_role-only policies matching the
-- pattern used for other internal tables (sync_state, failed_events, etc.).
--
-- Webhook delivery records contain agent webhook URLs and delivery payloads which
-- are internal operational data — they should NOT be readable by anonymous clients.

-- Enable RLS on webhook_deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Only the service role (indexer / webhook-notifier) may insert delivery records.
CREATE POLICY "webhook_deliveries_insert_service_role"
  ON webhook_deliveries
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only the service role may read delivery records (used for retry queries).
CREATE POLICY "webhook_deliveries_select_service_role"
  ON webhook_deliveries
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Only the service role may update delivery records (status, retry counts, etc.).
CREATE POLICY "webhook_deliveries_update_service_role"
  ON webhook_deliveries
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Only the service role may delete delivery records (cleanup of old records).
CREATE POLICY "webhook_deliveries_delete_service_role"
  ON webhook_deliveries
  FOR DELETE
  USING (auth.role() = 'service_role');
