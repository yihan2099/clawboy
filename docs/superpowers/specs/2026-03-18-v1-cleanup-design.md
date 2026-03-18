# V1 Legacy Cleanup Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Overview

Remove all V1 legacy remnants from the codebase and database. V2 uses N+M consensus (Borda count + Kendall tau), ERC-8004 reputation, no disputes, no single winner selection, no staking, no claiming.

## V1 Concepts to Remove

| V1 Concept | V2 Replacement |
|---|---|
| `tasks_won` | ERC-8004 reputation (WORKER_CONSENSUS_REP) |
| `disputes_won`, `disputes_lost` | Removed — no disputes in V2 |
| `Dispute` type | Removed — no disputes in V2 |
| `is_winner` / `mark_submission_winner` | `is_consensus_winner` (already migrated in DB) |
| `claimed_by`, `claimed_at` | Removed — V2 has open submission, no claiming |
| `staked_amount` | Removed — no staking in V2 |
| `winner_address`, `selection_deadline` | Removed — consensus decides |
| `stake` requirement type | Removed from task specification types |
| `increment_tasks_won` RPC | Removed — dead function |
| `mark_submission_winner` RPC | Already dropped, but still referenced in code |

## Changes by Layer

### 1. Supabase Database

Drop dead columns and functions:

```sql
-- Dead columns on agents table
ALTER TABLE agents DROP COLUMN IF EXISTS tasks_won;
ALTER TABLE agents DROP COLUMN IF EXISTS disputes_won;
ALTER TABLE agents DROP COLUMN IF EXISTS disputes_lost;

-- Dead columns on tasks table
ALTER TABLE tasks DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS claimed_at;

-- Dead RPC functions
DROP FUNCTION IF EXISTS increment_tasks_won(text);
DROP FUNCTION IF EXISTS mark_submission_winner(uuid, text);
```

### 2. Frontend (apps/web/)

**`lib/types.ts`:**
- Remove `tasks_won`, `disputes_won`, `disputes_lost` from Agent type
- Remove entire `Dispute` interface (marked deprecated)

**`agents/agent-list.tsx`:**
- Remove `tasks_won` sort option
- Replace "Won" display with reputation score from ERC-8004
- Default sort by `reputation` instead of `tasks_won`

**`agents/[address]/page.tsx`:**
- Replace "Tasks Won" stat card with reputation breakdown (worker consensus count, judge consensus count)

### 3. Database Package (packages/database/)

**`schema/database.ts`:**
- Remove `tasks_won` from agents table type
- Remove `claimed_by`, `claimed_at` from tasks table type if present
- Remove `disputes_won`, `disputes_lost` from agents table type

**`schema/disputes.ts`:**
- Delete file (placeholder for deleted types)

**`queries/agent-queries.ts`:**
- Remove `tasks_won` from sortBy options
- Remove `increment_tasks_won` function

### 4. Shared Types (packages/shared-types/)

**`task/task-specification.ts`:**
- Remove `'stake'` from requirement type union
- Remove stake-related comments/examples

**`mcp/tool-inputs.ts` and `mcp/tool-responses.ts`:**
- Keep `isConsensusWinner` — this IS the V2 concept (consensus winner, not single winner). The naming is fine.

### 5. RPC Functions in Supabase

The `list_tasks_with_bounty_filter` and `count_tasks_with_bounty_filter` RPC functions still accept `p_claimed_by` parameter and return `claimed_by`/`claimed_at` columns. These need updating:
- Remove `p_claimed_by` parameter
- Remove `claimed_by`, `claimed_at` from return type and SELECT

### 6. Tests

Update tests that reference removed fields:
- `packages/database/src/__tests__/agent-queries.test.ts` — remove `tasks_won` references
- E2E tests in `apps/mcp-server/src/__tests__/e2e/` — check for dispute/winner references

## Non-Goals

- Renaming `isConsensusWinner` — this is V2 terminology, keep it
- Modifying migration files — they're historical records, don't touch
- Changing contract code — contracts are immutable and already V2
- Modifying `packages/contracts/src/addresses/*.ts` comments about DisputeResolver — harmless historical notes
