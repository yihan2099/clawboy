# Pact — Maintenance Plan
Generated: 2026-03-15 | Items: 40 | P0: 4 | P1: 14 | P2: 18 | P3: 4

## P0 — Critical

- [x] #011 [API Contracts] Add caching requirement enforcement for bounty-filtered queries
- [x] #012 [Reliability] Export clearCleanupInterval(); add process teardown hook
- [x] #026 [Data Integrity] Migrate bounty_amount, staked_amount, reputation from TEXT to NUMERIC(78,0) — ALREADY ADDRESSED: reputation migrated in 20250228000003, staked_amount dropped in 20250205000001, bounty_amount intentionally kept as TEXT to avoid JS precision loss (RPC functions cast to NUMERIC for comparisons)
- [x] #027 [Database] Verify all winner-selection code paths use mark_submission_winner() — VERIFIED: V2 uses updateSubmissionConsensus() exclusively (called only from task-resolved.ts handler); old mark_submission_winner() was correctly dropped in V2 migration

## P1 — Likely Bug

- [ ] #001 [Financial Calculations] Validate minimum participant counts before payout distribution
- [ ] #002 [Reliability] Enforce minimum quorum of 2 for worker consensus threshold
- [ ] #003 [Reliability] Enforce minimum quorum of 2 for judge consensus threshold
- [ ] #004 [Financial Calculations] Implement remainder wei handling in payout logic
- [ ] #013 [Code Quality] Remove deprecated PactClient from exports
- [ ] #014 [Data Integrity] Make isEstimate required in count return type
- [ ] #015 [Security] Add private key format validation before viem usage
- [ ] #016 [Performance] Verify/create GIN index on tasks.tags column
- [ ] #028 [Data Integrity] Evaluate migrating TEXT[] to JSONB or junction tables
- [ ] #029 [Database] Verify legacy claims/verdicts tables have migration plan
- [ ] #030 [Data Integrity] Add DB-level idempotency key for submissions
- [ ] #031 [Security] Add audit trail (updated_by, updated_at) to tasks table
- [ ] #032 [Security] Verify webhook_deliveries RLS in production
- [ ] #033 [Data Integrity] Add NOT NULL to chain_id, tx_hash, log_index

## P2 — Code Smell

- [ ] #005 [Reliability] Add require(requiredWorkers > 0) in createTask()
- [ ] #006 [Financial Calculations] Document fee rounding direction in EscrowVault
- [ ] #007 [Data Integrity] Add percentage sum validation in releaseSplit()
- [ ] #008 [Reliability] Add address(0) check in release()
- [ ] #009 [Security] Add deadline future validation in createTask()
- [ ] #010 [Reliability] Add duplicate submission prevention mappings
- [ ] #017 [API Contracts] Add _cachedAt metadata to response types
- [ ] #018 [Environment & Config] Document env variable naming; deprecate legacy
- [ ] #019 [Reliability] Remove indefinite Redis check caching
- [ ] #020 [Type Safety] Add try-catch around JSON.stringify in cache
- [ ] #021 [Performance] Document glob pattern limitations in memory fallback
- [ ] #022 [Data Integrity] Document getTasksByIds() return order
- [ ] #034 [Security] Create submissions_summary vs submissions_detail views
- [ ] #035 [Security] Add rate limiting for anonymous task reads
- [ ] #036 [Database] Document retry backoff magic numbers
- [ ] #037 [Auth] Add runtime chain ID validation in examples
- [ ] #038 [Environment & Config] Require PACT_SERVER_URL in production
- [ ] #040 [Data Integrity] Add max_retries and dead-letter table for failed events

## P3 — Nice to Have

- [ ] #023 [Type Safety] Add tag type validation in memory cache
- [ ] #024 [API Contracts] Document/unify RPC vs standard query paths
- [ ] #025 [Reliability] Use AggregateError for pipeline multi-errors
- [ ] #039 [Code Quality] Add retry logic to example error handling
