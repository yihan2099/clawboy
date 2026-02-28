-- Migration: Add database-level aggregate functions for tag and bounty statistics
-- Fixes #009 and #010: OOM risk from fetching all tasks into memory for statistics

-- get_tag_statistics: unnest tags array in PostgreSQL to avoid fetching all tasks
-- into application memory. Returns top N tags by task count.
CREATE OR REPLACE FUNCTION get_tag_statistics(p_limit integer DEFAULT 6)
RETURNS TABLE(tag text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    unnested_tag AS tag,
    COUNT(*) AS count
  FROM (
    SELECT unnest(tags) AS unnested_tag
    FROM tasks
    WHERE tags IS NOT NULL
      AND array_length(tags, 1) > 0
  ) sub
  GROUP BY unnested_tag
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- get_bounty_statistics: compute MIN/MAX/AVG in PostgreSQL using NUMERIC aggregation
-- to avoid fetching all bounty amounts into application memory for BigInt conversion.
CREATE OR REPLACE FUNCTION get_bounty_statistics()
RETURNS TABLE(min_bounty numeric, max_bounty numeric, avg_bounty numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    MIN(bounty_amount::numeric) AS min_bounty,
    MAX(bounty_amount::numeric) AS max_bounty,
    FLOOR(AVG(bounty_amount::numeric)) AS avg_bounty
  FROM tasks
  WHERE bounty_amount IS NOT NULL
    AND bounty_amount != '0';
$$;

COMMENT ON FUNCTION get_tag_statistics IS
  'Returns top N tags by task count using database-level unnest aggregation. '
  'Avoids OOM from fetching all tasks into application memory.';

COMMENT ON FUNCTION get_bounty_statistics IS
  'Returns MIN/MAX/AVG bounty amounts using PostgreSQL aggregate functions. '
  'Avoids OOM from fetching all bounty amounts into application memory.';
