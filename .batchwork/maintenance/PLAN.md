# Maintenance Action Plan

Generated: 2026-03-12
Total items: 42
Deployment blockers: #002, #003, #004

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| P0 | Critical -- deployment blocker, data loss or funds loss risk |
| P1 | High -- reliability or security issue, fix before next release |
| P2 | Medium -- correctness or quality issue, fix in normal cycle |
| P3 | Low -- nice-to-have improvement |

---

## P0 -- Critical (Deployment Blockers)

- [x] #001 [Environment] ~~Deploy V2 contracts to Base mainnet~~ — NOT A BUG: Pact is deliberately testnet-only (Base Sepolia). Zero mainnet addresses are by design. (Ref: A2-01) **CLOSED**
- [x] #002 [Data Integrity] Enforce Redis in production: change `apps/mcp-server/src/index.ts:30` warning to `process.exit(1)` unless explicit `--allow-memory-sessions` flag is set. Prevents silent session data loss. (Ref: A1-01, A1-09)
- [x] #003 [Type Safety] Add runtime type validation to `handleTaskResolved` in `apps/indexer/src/handlers/task-resolved.ts:31`, matching the pattern in `handleTaskCreated`. Throw on type mismatch to route to DLQ. (Ref: A1-02)
- [x] #004 [Data Integrity] Fix empty judgment ranking backfill: either fetch ranking from contract `getJudgment()` view during `handleJudgmentSubmitted`, or add a background job to backfill `ranking` arrays in `apps/indexer/src/handlers/judgment-submitted.ts:51`. (Ref: A1-03)

## P1 -- High

- [x] #005 [Reliability] Add circuit breaker or consecutive-timeout tracking to `notifyAgents()` in `apps/indexer/src/services/webhook-notifier.ts:159`. Escalate to error-level after N consecutive batch timeouts. (Ref: A1-04)
- [x] #006 [Reliability] Extract shared `calculateBackoff(attempt)` function and use in both `deliverWebhook` (line 118) and `processWebhookRetries` (line 356) in `apps/indexer/src/services/webhook-notifier.ts`. (Ref: A1-05)
- [x] #007 [Type Safety] Add runtime type validation to `handleWorkSubmitted` in `apps/indexer/src/handlers/work-submitted.ts:22`, matching the pattern in `handleTaskCreated`. (Ref: A1-06)
- [x] #008 [Type Safety] Audit `TaskInsert` type in `packages/database/` to ensure JSON columns have proper runtime validation. Review `unknown as Json` patterns. (Ref: A1-07) — AUDITED: TaskInsert uses concrete types (string[], string, number, boolean); no Json type columns. Only `as unknown as Json` is webhook payload in webhook-notifier.ts, which is correct for a jsonb column. No action needed.
- [ ] #009 [Error Handling] Integrate Sentry reporting into webhook dispatch in `apps/indexer/src/services/webhook-dispatch.ts:106`. Add structured error logging with delivery success/failure counters. (Ref: A1-08)
- [ ] #010 [Reliability] Address silent fallback on chain query failure in `apps/mcp-server/src/tools/auth/verify-signature.ts:99`: return `registrationCheckFailed: true` in response so agents know to retry. (Ref: A1-15)
- [ ] #011 [Reliability] Export `clearCleanupInterval()` from `packages/cache/src/cache-client.ts` for test cleanup and graceful shutdown. (Ref: A2-02)
- [ ] #012 [Security] Separate admin write functions in `packages/database/src/queries/task-queries.ts` into a dedicated admin export or add runtime context check to prevent accidental use from non-indexer apps. (Ref: A2-03)
- [ ] #013 [Reliability] Ensure all callers of `listTasks()` check the `isEstimate` flag from `packages/database/src/queries/task-queries.ts:78` and display appropriate UI for estimated counts. (Ref: A2-04)
- [ ] #014 [Environment] Verify local Anvil addresses in `packages/contracts/src/addresses/local.ts` match current deploy script output. Remove stale TODO or add CI verification. (Ref: A2-05)
- [ ] #015 [Security] Document that `supabase/config.toml` network restrictions (`0.0.0.0/0`) are local-dev only. If self-hosting, restrict CIDRs. Verify hosted Supabase dashboard has proper network restrictions. (Ref: A3-01)
- [ ] #016 [Reliability] Add rollback script for V2 consensus migration `supabase/migrations/20260310000001_v2_consensus_model.sql`. Document manual recovery steps for partial migration failure. (Ref: A3-02)
- [ ] #017 [Data Integrity] Implement audit trail for financial mutations per TODO(#129) in `supabase/migrations/20250201000002_rls_policies.sql:17`. Minimum: enable `pg_audit` or add `updated_by` trigger. (Ref: A3-03)
- [ ] #018 [Reliability] Document that V2 migration (20260310000001) must run as part of full migration set, not standalone. Statistics functions in 20250203000002 reference dropped `status` column until V2 migration replaces them. (Ref: A3-04)
- [ ] #019 [Data Integrity] Review status-to-phase mapping in V2 migration: `in_review -> resolved` loses review state. If migrating production data, add manual handling for `in_review` tasks before migration. (Ref: A3-05)
- [ ] #020 [Reliability] Confirm exponential backoff overflow fix in `supabase/migrations/20250204000001_event_processing_tables.sql:232` -- already addressed with `LEAST(..., 1440)` cap. Close this item. (Ref: A3-06)

## P2 -- Medium

- [ ] #021 [Type Safety] Add runtime type validation to `handleJudgmentSubmitted` in `apps/indexer/src/handlers/judgment-submitted.ts:22`. (Ref: A1-11)
- [ ] #022 [Code Quality] Document magic timeout constants in `apps/indexer/src/services/webhook-notifier.ts:24`. Make `WEBHOOK_TIMEOUT_MS` and `MAX_ATTEMPTS` configurable via env vars. (Ref: A1-12)
- [ ] #023 [Data Integrity] Add `submission.submission_index >= 0` guard to bounds check in `apps/indexer/src/handlers/task-resolved.ts:60`. (Ref: A1-13)
- [ ] #024 [Code Quality] Classify HTTP status codes in `deliverWebhook` in `apps/indexer/src/services/webhook-notifier.ts:65`: retry on 5xx/timeout, fail permanently on 4xx (except 429), respect `Retry-After`. (Ref: A1-14)
- [ ] #025 [Reliability] Log all Redis pipeline errors before throwing in `packages/cache/src/cache-client.ts:95`, not just the first one. (Ref: A2-06)
- [ ] #026 [Performance] Document that callers of `listTasks()` with bounty filters must use `cacheThrough()` in `packages/database/src/queries/task-queries.ts:47`. (Ref: A2-07)
- [ ] #027 [Data Integrity] No action needed -- TTL drift between memory and Redis in `packages/cache/src/cache-client.ts:131` is correct by design (stores are never simultaneously authoritative). Close this item. (Ref: A2-08)
- [ ] #028 [API Contracts] Add `p_bounty_token` parameter to `list_tasks_with_bounty_filter` and `count_tasks_with_bounty_filter` RPC functions. Pass `bountyToken` filter from `packages/database/src/queries/task-queries.ts:86`. (Ref: A2-09)
- [ ] #029 [Code Quality] Document that `deleteByPattern` in `packages/cache/src/cache-client.ts:201` only supports `*` glob in memory fallback, not `?` or `[]`. Or implement full glob-to-regex conversion. (Ref: A2-10)
- [ ] #030 [Type Safety] Low priority -- `verifySignature` in `packages/web3-utils/src/utils/signature.ts:6` is safe as-is. Could add `isAddress()` check for better error messages. (Ref: A2-11)
- [ ] #031 [Performance] No action needed -- `getMany` sequential fallback in `packages/cache/src/cache-client.ts:268` is O(n) same as Redis `mget`. Close this item. (Ref: A2-12)
- [ ] #032 [Data Integrity] No action needed -- creator address casing in `packages/database/src/queries/task-queries.ts:92` is consistent (lowercased at both write and read time). Close this item. (Ref: A2-13)
- [ ] #033 [Environment] Increase local dev email rate limit from 2/hour to 100/hour in `supabase/config.toml:176`. Only affects local Inbucket testing. (Ref: A3-07)
- [ ] #034 [Environment] Consider reducing `max_rows` from 1000 to 500 in `supabase/config.toml:18` for defense-in-depth. Low priority -- current pagination uses 20-50 limits. (Ref: A3-08)
- [ ] #035 [Data Integrity] Consider dropping legacy `claims` and `verdicts` tables via cleanup migration. Circular FK in `supabase/migrations/20250201000001_initial_schema.sql:14` is in unused legacy tables. (Ref: A3-09)
- [ ] #036 [Code Quality] Add composite webhook index `(agent_address, status, created_at DESC)` per TODO(#118) in `supabase/migrations/20250206000001_webhook_support.sql:26`. (Ref: A3-10)
- [ ] #037 [Code Quality] No action needed at current scale -- CASE sort in `supabase/migrations/20250201000003_bounty_numeric_comparison.sql:73` is acceptable for thousands of tasks. Revisit at 100k+. (Ref: A3-11)
- [ ] #038 [Environment] Add root-level `.env.example` or document per-app `.env.example` locations in project README. CLAUDE.md already covers this. (Ref: A3-12)

## P3 -- Low

- [ ] #039 [Code Quality] Move IPFS retry config in `apps/indexer/src/handlers/task-created.ts:60` to environment variables with sensible defaults. (Ref: A1-16)
- [ ] #040 [Reliability] Session cleanup interval in `apps/mcp-server/src/auth/session-manager.ts:393` runs unconditionally -- could conditionally start only when memory fallback is active. Harmless as-is. (Ref: A1-10)

## Auto-Close (No Action Needed)

- [ ] #041 [Data Integrity] Close -- TTL drift (A2-08) is correct by design. Memory and Redis are never simultaneously authoritative.
- [ ] #042 [Performance] Close -- `getMany` sequential fallback (A2-12) is O(n) same as Redis path. No performance issue.

---

## Summary

| Priority | Count | Deployment Blockers |
|----------|-------|---------------------|
| P0 | 4 | #001, #002, #003, #004 |
| P1 | 16 | -- |
| P2 | 18 | -- |
| P3 | 2 | -- |
| Auto-Close | 2 | -- |
| **Total** | **42** | **4** |

### Execution Order

**Phase 1 (Pre-Deploy):** #001-#004 -- All P0 items must be resolved before mainnet deployment.

**Phase 2 (Release Hardening):** #003, #007, #021 (type safety across all handlers as a batch), then #005, #006, #009, #024 (webhook reliability as a batch), then #002, #010 (session/auth hardening).

**Phase 3 (Normal Cycle):** Remaining P1 and P2 items in priority order.

**Phase 4 (Cleanup):** #020, #027, #031, #032, #041, #042 -- close items that need no action.
