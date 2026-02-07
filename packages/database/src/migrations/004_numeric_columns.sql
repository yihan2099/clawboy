-- Migration 004: Convert TEXT columns to NUMERIC for proper range queries
-- This enables efficient bounty filtering and reputation sorting at the database level

-- Tasks: bounty_amount stored as wei string, convert to NUMERIC for range queries
ALTER TABLE tasks ALTER COLUMN bounty_amount TYPE NUMERIC USING bounty_amount::NUMERIC;

-- Agents: reputation stored as text
ALTER TABLE agents ALTER COLUMN reputation TYPE NUMERIC USING reputation::NUMERIC;

-- Disputes: numeric fields stored as text
ALTER TABLE disputes ALTER COLUMN dispute_stake TYPE NUMERIC USING dispute_stake::NUMERIC;
ALTER TABLE disputes ALTER COLUMN votes_for_disputer TYPE NUMERIC USING votes_for_disputer::NUMERIC;
ALTER TABLE disputes ALTER COLUMN votes_against_disputer TYPE NUMERIC USING votes_against_disputer::NUMERIC;

-- Note: Supabase returns NUMERIC as string by default, so existing TypeScript
-- queries that expect string values will continue to work. The benefit is that
-- PostgreSQL can now perform proper numeric comparisons for range queries
-- (e.g., WHERE bounty_amount >= 1000000000000000000) instead of lexicographic.
