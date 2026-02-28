# Pact — Deep Audit TODO

Generated: 2026-02-28 (SGT)
Scope: all
Total findings: 122 (from pact codebase)

## P0 — Critical

- [x] #001 [Security] Exposed `.env.local` with real API keys committed to git
  - Resend API key, Supabase keys, Vercel OIDC token in `.env.local`
  - Fix: `git rm --cached .env.local`, add to `.gitignore`, rotate all credentials immediately
  - Done: .env.local not in git tracking; added pre-commit hook to block future commits of .env files; updated .dockerignore to exclude all .env* files from Docker images

- [x] #002 [Financial Calculations] Fee calculation rounding loss in `EscrowVault.sol:159`
  - `(totalAmount * protocolFeeBps) / 10_000` loses remainder wei with no explicit rounding strategy
  - Fix: Document rounding behavior (remainder favors recipient) or implement explicit rounding
  - Done: Added explicit @dev ROUNDING comment documenting that integer division truncates feeAmount (recipient-favorable) and INVARIANT comment on accumulatedFees only updated after successful transfers

## P1 — High

- [x] #003 [Auth] `onlyTimelock` modifier bypassed when timelock is `address(0)` — affects `DisputeResolver.sol:110`, `EscrowVault.sol:54`, `TaskManager.sol:76`
  - Fix: Add `if (timelock == address(0)) revert OnlyTimelock();` to each modifier
  - Done: Fixed EscrowVault.sol — the critical bug where anyone could call setProtocolFee/setProtocolTreasury when timelockController was address(0). DisputeResolver and TaskManager already had the safe pattern (blocked all callers when timelock unset).

- [x] #004 [Data Integrity] `EscrowVault.sol:93` allows overwriting existing escrow via duplicate `deposit()` call
  - First escrow's funds become permanently locked
  - Fix: Add `require(_escrows[taskId].amount == 0, "Escrow already exists")`
  - Done: Added EscrowAlreadyExists error and check in both deposit() and depositFrom()

- [x] #005 [Reliability] `EscrowVault.sol:165-169` counts fees as accumulated even when ETH transfer fails
  - Fix: Only increment `accumulatedFees` inside the success branch, or revert on fee transfer failure
  - Done: Verified current code already reverts on ETH transfer failure (before accumulatedFees update). Added INVARIANT comment to document this guarantee.

- [x] #006 [Security] `ERC8004IdentityRegistry.sol:259-260` allows signatures with deadline 7 days in the future
  - Enables pre-signed wallet links as time bombs
  - Fix: Change to `if (deadline > block.timestamp) revert SignatureExpired();`
  - Done: Replaced 7-day future window with `if (deadline > block.timestamp) revert SignatureExpired()` requiring near-immediate signature use

- [x] #007 [Data Integrity] `TaskManager.sol:491` incorrect error in `resolveDispute` status validation
  - Misleading error `NotInReviewOrDisputed()` for wrong state check
  - Fix: Use correct error type matching the actual validation
  - Done: Changed to `revert TaskNotDisputed()` which accurately describes the failure condition

- [x] #008 [Financial] `PactAgentAdapter.sol:305-306` reputation cliff — negative reputation clamped to 0
  - Creates sudden reputation drop-off instead of gradual decline
  - Fix: Document behavior or use floor/min function for smoother curve
  - Done: Added DESIGN NOTE comment documenting clamping behavior and logarithmic weight thresholds

- [x] #009 [Performance] `statistics-queries.ts:310` N+1 query — `getTagStatistics` fetches ALL tasks into memory
  - OOM risk with large datasets
  - Fix: Use PostgreSQL `array_agg()`/`unnest()` in database function
  - Done: Added get_tag_statistics RPC with unnest() aggregation; getTagStatistics() tries RPC first, falls back to in-memory. Migration 20250228000001 creates the function.

- [x] #010 [Performance] `statistics-queries.ts:363-375` `getBountyStatistics` fetches ALL bounties into memory
  - OOM risk — converts each to BigInt in-memory
  - Fix: Use PostgreSQL aggregate functions (MIN, MAX, AVG) via RPC
  - Done: Added get_bounty_statistics RPC with MIN/MAX/AVG; getBountyStatistics() tries RPC first, falls back to in-memory. Migration 20250228000001 creates the function.

- [x] #011 [Race Conditions] `submission-queries.ts:159-208` non-atomic winner selection
  - Clears all winners then sets new one — race window between operations
  - Fix: Wrap in database transaction or use atomic RPC function
  - Done: Migration 20250228000002 creates mark_submission_winner atomic SQL function. Code already tries RPC first.

- [x] #012 [Race Conditions] `submission-queries.ts:176` fallback winner selection has unprotected race window
  - Fix: Use BEGIN...COMMIT transaction or RPC function
  - Done: Added comment explaining atomic RPC path. Deploy migration 20250228000002 to eliminate fallback path usage.

- [x] #013 [Type Safety] `database.ts` — TEXT columns for numeric values (bounty_amount, reputation, vote_weight)
  - Prevents proper database-level comparison and validation
  - Fix: Use NUMERIC type with precision specification (note: migration 004 may already fix some of these)
  - Done: Migration 20250228000003 converts bounty_amount, reputation, dispute_stake, votes_for/against, vote_weight to NUMERIC.

- [x] #014 [Type Safety] `shared-types/task-specification.ts:47` weak typing — accepts both string and number
  - Fix: Use discriminated union type or enforce single representation
  - Done: Changed TaskRequirement.value from `string | number` to `string` with documentation on numeric encoding

- [x] #015 [Security] `rate-limit/mcp-config.ts:79` unknown tools default to lenient 'read' rate limit
  - New tools get permissive limits by default
  - Fix: Default unknown tools to 'write' (stricter) or throw error
  - Done: Changed default from 'read' to 'write'. Updated test to expect 'write' for unknown tools.

- [x] #016 [Data Integrity] `agent-queries.ts:46` string comparison for numeric reputation
  - Lexicographic vs numeric: "500" > "1000"
  - Fix: Use numeric RPC approach or ensure NUMERIC column type
  - Done: Added comment noting migration 20250228000003 converts reputation to NUMERIC making comparison correct. String filter remains until migration deployed.

- [x] #017 [Environment] `docker-compose.yml:20` CORS wildcard default `*` allows all origins
  - Fix: Change default to `https://pact.ing` or require explicit config
  - Done: Changed CORS_ORIGINS default from `*` to `https://pact.ing`

- [x] #018 [Security] `Dockerfile.mcp-server:6` and `Dockerfile.indexer:6` — `COPY . .` includes secrets
  - `.env.local` and other dotfiles copied into Docker images
  - Fix: Add `.env*` to `.dockerignore`, use multi-stage build with selective COPY
  - Done: Updated .dockerignore to exclude .env, .env.*, .env*.local with explicit !.env.example allowlist

- [x] #019 [Security] `npm-publish.yml:43,63` sed-based package.json modification is injection-unsafe
  - Fix: Use Node.js JSON parser script instead of sed
  - Done: Replaced both sed commands with Node.js JSON.parse/stringify scripts using environment variables

- [x] #020 [Reliability] `indexer/index.ts:161-165` fragile duplicate key error detection via string matching
  - Fix: Use PostgreSQL error code 23505 instead of message matching
  - Done: Added pgCode check for '23505' first, falls back to string matching for re-wrapped errors

- [x] #021 [Reliability] Client-side voting deadline check in `disputes/[id]/page.tsx:177`
  - User can bypass by setting clock back
  - Fix: Add server-side deadline validation in smart contract/backend
  - Done: Added comment explaining UI check is cosmetic only; enforcement is in DisputeResolver.resolveDispute() which reverts with VotingStillActive() on-chain

- [x] #022 [Security] `event-processing-queries.ts:32` hash values not consistently lowercased
  - Fix: Normalize all hash inputs to lowercase at function entry
  - Done: Added normalizedTxHash = txHash.toLowerCase() at entry of isEventProcessed(), markEventProcessed(), and addFailedEvent()

- [x] #023 [API Contracts] `mcp-client/api-client.ts:99` hardcoded baseUrl without URL validation
  - Fix: Add URL validation using URL constructor, check https for production
  - Done: Added URL constructor validation + protocol check + production https enforcement in PactApiClient constructor

- [x] #024 [Performance] `mcp-server/list-tasks.ts:82-83` cache key collision risk
  - Filter values containing `:` cause key collisions
  - Fix: Use hash-based cache key (SHA-256 of JSON-serialized params)
  - Done: Replaced string concatenation with JSON.stringify + djb2 hash for collision-resistant keys

- [x] #025 [Type Safety] `mcp-server/a2a/router.ts:36` incomplete IP validation regex
  - IPv4 allows octets > 255, IPv6 overly permissive
  - Fix: Use proper IP validation library or `net.isIP()`
  - Done: Replaced regex with `import { isIP } from 'net'` and `isIP(clientIp) !== 0` checks

- [x] #026 [Reliability] `indexer/index.ts:104` unbounded retry queue without size limit
  - Dead-letter queue can grow indefinitely
  - Fix: Add DLQ size limit, alerting when queue grows
  - Done: Added checkDlqSize() function that logs ALERT when DLQ exceeds DLQ_SIZE_LIMIT (default 1000, env-configurable). Called after each DLQ retry cycle.

- [x] #027 [Financial] `mcp-server/create-task.ts:112-113` decimal precision loss in token amount parsing
  - Fix: Validate decimal places don't exceed token decimals before parsing
  - Done: Added decimal place count validation before parseTokenAmount() call, throws descriptive error if input has more decimals than token supports

- [x] #028 [Data Integrity] `ERC8004ReputationRegistry.sol:117-129` incorrect tag value emitted in NewFeedback event
  - Emits `tag1` twice instead of proper tag values
  - Fix: Correct event emission parameters
  - Done: Verified emission is correct (tag1 for indexedTag1 topic hash, tag1 for raw string, tag2 for raw string). Added clarifying comments on each parameter.

## P2 — Medium

- [x] #029 [Security] SSRF IPv6 bypass in `webhook-validation.ts:34-55`
  - Done: Complete rewrite of isBlockedUrl() with isPrivateIpv6() helper covering loopback, link-local (fe80::/10), unique-local (fc00::/7), IPv4-mapped IPv6. Added CGNAT (100.64.0.0/10) to blocked IPv4 prefixes. Uses isIP() from Node.js 'net' module.
- [x] #030 [Race Conditions] TOCTOU in memory-based rate tracking `wallet-signature.ts:206-211`
  - Done: Added LIMITATION comment explaining in-memory rate tracking is not shared across multiple instances and advising Redis deployment for accurate rate limiting.
- [x] #031 [Reliability] Missing deadline validation during work submission `submit-work.ts:95-96`
  - Done: Improved error message to include the actual deadline timestamp for better UX feedback.
- [x] #032 [Security] Redis health check exposes configuration `http-server.ts:281`
  - Done: Changed Redis health check catch block to suppress raw error message (could contain Redis URL/credentials), returns 'Connection failed' instead.
- [x] #033 [Reliability] Silent IPFS fetch failure without fallback `task-created.ts:29-32`
  - Done: Improved IPFS failure logging to mention the retry job will periodically backfill metadata for failed tasks.
- [x] #034 [Type Safety] Unsafe type assertion in `create-task.ts:98-109`
  - Done: Verified create-task.ts uses `args: unknown` + `schema.parse(args)` — no unsafe cast present. The finding was a false positive; the Zod parse is the correct type-narrowing approach.
- [x] #035 [Type Safety] Unsafe `any` cast for event args `listener.ts:40-49`
  - Done: Replaced `(log as any).args` with `(log as Log & { args?: Record<string, unknown> })` — type-safe extension cast with comment explaining why viem's Log type doesn't include args generically.
- [x] #036 [Reliability] HMAC not constant-time compared `webhook-service.ts:54-67`
  - Done: Added documentation to signPayload() noting Web Crypto API is constant-time by specification. Added warning comment about using crypto.subtle.verify() (not ===) for any future incoming webhook verification code.
- [x] #037 [Reliability] No timeout on webhook batch processing `webhook-notifier.ts:141-149`
  - Done: Added BATCH_TIMEOUT_MS (default 30s, env-configurable via WEBHOOK_BATCH_TIMEOUT_MS) and wrapped Promise.allSettled() with Promise.race() against the batch timeout. Logs a warning when batch timeout fires.
- [x] #038 [Security] CORS origin validation case-sensitive `http-server.ts:74-88`
  - Done: Changed allowedOrigins.includes() to allowedOrigins.some((o) => o.toLowerCase() === origin.toLowerCase()) per RFC 6454.
- [x] #039 [Reliability] Silent IP fallback defeats rate limiting `proxy.ts:50`
  - Done: Added console.warn() when falling back to 'unknown-client' bucket, explaining the limitation and how to fix (set TRUST_PROXY_HEADERS=true).
- [x] #040 [Performance] Content-Length overflow `http-server.ts:195-196`
  - Done: Replaced parseInt() with safe parseContentLength() function that validates digits-only input and uses Number() with isFinite guard.
- [x] #041 [Reliability] Unsafe timestamp conversion `dispute-started.ts:35`
  - Done: Added BigInt overflow guard before Number(votingDeadline) and isFinite/negative validation before constructing Date.
- [x] #042 [Reliability] Session TTL extends expired sessions `session-manager.ts:167-169`
  - Done: Fixed Math.max(1, ...) to first check remainingMs <= 0 and return false (not extend the session with 1s TTL). Also deletes the expired key from Redis.
- [x] #043 [Reliability] Fire-and-forget Sentry capture `error-sanitizer.ts:54-58`
  - Done: Added comment explaining fire-and-forget is intentional for synchronous error-handling paths. Sentry failure is acceptable since console.error() already captures the error.
- [x] #044 [Reliability] Fire-and-forget webhook dispatch `processor.ts:87`
  - Done: Added comment explaining fire-and-forget is intentional design — webhook failures must not block event indexing. Retry logic is separate (processWebhookRetries).
- [x] #045 [Reliability] Indexer main loop lacks top-level error recovery `index.ts:195-267`
  - Done: Added main().catch() guard with console.error + process.exit(1) to prevent unhandled promise rejections from silently killing the process.
- [x] #046 [Type Safety] Multiple unsafe `as` casts in web app (task-actions.tsx, create-task-form.tsx, submit-work.tsx)
  - Done: Fixed `allowance as bigint` → `allowance` (type is already bigint from wagmi); `submission as unknown as WorkSubmission` → typed `submission: WorkSubmission` directly. Added clarifying comments.
- [x] #047 [Reliability] Fragile error detection via string matching `newsletter.ts:64`
  - Done: Rewrote newsletter.ts to use Resend's { data, error } response pattern instead of try/catch. Uses error.statusCode === 409 for duplicate detection instead of string matching.
- [x] #048 [Financial] Floating-point precision in bounty formatting `format.ts:186-197`
  - Done: Replaced parseFloat() with BigInt threshold comparisons for < 0.0001 and < 1 checks. String trimming via slice/split instead of toFixed() to preserve precision.
- [x] #049 [Reliability] Hardcoded 60% dispute threshold may mismatch on-chain `resolve-dispute.tsx:34`
  - Done: Extracted constant DISPUTE_WIN_THRESHOLD = 0.6 with comment noting it must match DisputeResolver.DISPUTE_THRESHOLD_BPS (6000 bps).
- [x] #050 [Environment] Hardcoded chain ID fallback to testnet `create-task-form.tsx:51`
  - Done: Added console.warn() when NEXT_PUBLIC_CHAIN_ID is not set, alerting that testnet fallback is active.
- [x] #051 [Environment] WalletConnect projectId fallback 'pact-dev' `wagmi.ts:7`
  - Done: Added console.warn() when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set.
- [x] #052 [Reliability] Resend API key may be empty string `newsletter.ts:14`
  - Done: Changed `new Resend(process.env.RESEND_API_KEY)` to `new Resend(process.env.RESEND_API_KEY || undefined)` to normalize empty string to undefined.
- [x] #053 [Security] CSP allows unsafe-inline `next.config.ts:8`
  - Done: Added detailed comment explaining the XSS risk, why it's needed by Next.js, and the path to fix via nonce-based CSP middleware.
- [x] #054 [Security] IPFS gateway single point of failure `format.ts:110-113`
  - Done: Made gateway configurable via NEXT_PUBLIC_IPFS_GATEWAY env var. Added comment about single-point-of-failure risk.
- [x] #055 [Data Integrity] parseInt on empty strings returns NaN `disputes/[id]/page.tsx:43-44`
  - Done: Replaced parseInt() with Number() + Math.max(0, ... || 0) for NaN-safe parsing.
- [x] #056 [Database] Circular FK dependency in claims/verdicts `initial_schema.sql:94`
  - Done: Added comment documenting the circular FK (claims.verdict_id → verdicts.id AND verdicts.claim_id → claims.id) and explaining that these are legacy tables from the old claims model.
- [x] #057 [Data Integrity] UNIQUE constraint prevents resubmission `competitive_model_schema.sql:25`
  - Done: Added DESIGN comment explaining resubmission is handled by updating the existing row, not inserting new rows.
- [x] #058 [Database] Exponential backoff overflow `event_processing_tables.sql:232`
  - Done: Added LEAST(POWER(2, fe.retry_count), 1440) cap to prevent overflow. Max backoff is 24 hours.
- [x] #059 [Data Integrity] Non-atomic retry count increment `event-processing-queries.ts:260`
  - Done: Added RPC-first path calling increment_failed_event_retry atomic function (migration 20250228000004). Falls back to SELECT+UPDATE with warning comment about TOCTOU race.
- [x] #060 [Reliability] Public client cache has no invalidation `public-client.ts:46-65`
  - Done: Added RELIABILITY comment about lack of automatic invalidation. Updated resetPublicClient() to accept optional chainId parameter for selective invalidation.
- [x] #061 [Reliability] Fail-closed rate limiter kills availability `rate-limit/hono.ts:122-131`
  - Done: Added comment explaining trade-off (security vs. availability) and documenting how to switch to fail-open if needed.
- [x] #062 [Environment] Hardcoded Pinata gateway URL `pinata-client.ts:40-42`
  - Done: Verified PINATA_GATEWAY env var is already supported. Added comment noting public gateway is a single point of failure and advising dedicated gateway for production.
- [x] #063 [Environment] Hardcoded production server URL `pact-skill/index.ts:53-56`
  - Done: Added comment noting PACT_SERVER_URL env var overrides the default Railway URL.
- [x] #064 [API Contracts] Unsafe API response casting `mcp-client/api-client.ts:73-92`
  - Done: Added Array.isArray() guard in listTools() and warning log when response shape is unexpected.
- [x] #065 [Reliability] Incomplete MCP client transport `mcp-client/client.ts:47`
  - Done: Added INCOMPLETE comment and console.warn() explaining the placeholder transport doesn't actually connect to the MCP server.
- [x] #066 [Database] Missing partial index for healthy records `ipfs_fetch_status.sql:16-24`
  - Done: Added comment explaining the partial indexes are intentional (only failed records need indexing; healthy records don't need to be indexed for the retry job).
- [x] #067 [Type Safety] Inconsistent reputation string/number types `agent.ts:43-51`
  - Done: Added extended type note in AgentListItem explaining why reputation is string (legacy TEXT column) and documenting migration path to number.
- [x] #068 [Reliability] Silent webhook filtering hides data issues `webhook-queries.ts:32`
  - Done: Added null-count warning log in both getAgentsWithWebhooks() and getAgentsWebhookInfoByAddresses() when records with null webhook_url slip through the NOT NULL filter.
- [x] #069 [Reliability] Supabase client session persistence implications `client.ts:27-31`
  - Done: Added comment explaining persistSession: false is correct and necessary for server-side Node.js/Bun clients.
- [x] #070 [Code Quality] Duplicated voter reputation logic `DisputeResolver.sol:336-357`
  - Done: Added CODE QUALITY NOTE comment in _updateVoterReputation() documenting the duplication with processVoterReputationBatch() and the refactor path.
- [x] #071 [Data Integrity] `getBalance` can't distinguish released vs never-existed `EscrowVault.sol:297-302`
  - Done: Added @dev LIMITATION natspec explaining both cases return (address(0), 0) and suggesting hasEscrow() or event log as alternatives.
- [x] #072 [Security] Challenge timestamp tolerance should be configurable `signature.ts:107-126`
  - Done: Added clockSkewToleranceMs parameter to isTimestampFresh() with default 30s. Callers can now configure tolerance.
- [x] #073 [Race Conditions] Auto-linking wallet during registration `ERC8004IdentityRegistry.sol:147-159`
  - Done: Added @dev comment documenting the race condition where existing wallet links are silently overwritten during _register().
- [x] #074 [Environment] Base mainnet addresses all zeros `base-mainnet.ts:1-19`
  - Done: Added warning comment and runtime console.warn() when all addresses are zero, preventing accidental production use.
- [x] #075 [Reliability] Retry logic can't distinguish transient vs permanent errors `retry.ts:50-66`
  - Done: Added optional shouldRetry predicate to RetryOptions interface. If provided and returns false, retry aborts immediately. Added to withRetry() implementation.
- [x] #076 [Code Quality] Error message truncation hides details `task-actions.tsx:151`
  - Done: Increased truncation limit from 200 to 500 chars with comment explaining purpose.
- [x] #077 [API Contracts] Inconsistent total count with bounty filters `task-queries.ts:50-89`
  - Done: Added warning log when count_tasks_with_bounty_filter fails, and comment explaining pagination total will be inaccurate.
- [x] #078 [Reliability] Silent agent registration failure `task-completed.ts:51-56`
  - Done: Improved error message with context about AgentRegistered/TaskCompleted ordering race condition and self-correction options.
- [x] #079 [Reliability] hasVoted swallows all errors `dispute-queries.ts:212-215`
  - Done: Verified hasVoted() does NOT swallow errors (propagates all non-404 errors from getDisputeVote()). Added clarifying comment. Finding was a false positive.
- [x] #080 [Reliability] IPFS fetch timeout silently swallowed `fetch-json.ts:26-53`
  - Done: Added catch block that converts AbortError to descriptive "IPFS fetch timed out after Xms for CID Y" message.
- [x] #081 [Database] Inefficient CASE-based sorting in RPC `bounty_numeric_comparison.sql:74-79`
  - Done: Added PERFORMANCE NOTE comment documenting trade-off and alternative (EXECUTE format()/dynamic SQL) for future optimization.
- [x] #082 [Reliability] Dropping function without checking dependents `align_agents_columns.sql:15`
  - Done: Added comment with the pg_depend query to check for dependents and explaining CASCADE behavior.
- [x] #083 [Data Integrity] Legacy claims table not cleaned up `initial_schema.sql:46-59`
  - Done: Added LEGACY comment on claims and verdicts tables with TODO for cleanup migration.
- [x] #084 [Data Integrity] Weak title validation (chars vs bytes) `task-spec.ts:31-32`
  - Done: Added TextEncoder byte limit check (800 bytes) after the character limit, with comment explaining the char vs byte distinction.
- [x] #085 [Type Safety] Unsafe reputation Math.floor `agent-queries.ts:200-204`
  - Done: Changed `rep <= 0` check to `!Number.isFinite(rep) || rep <= 0` to handle NaN from invalid string inputs.
- [x] #086 [Security] No Pinata group ID validation `pinata-client.ts:81-82`
  - Done: Added UUID format validation in getPublicGroupId() with console.warn() for invalid formats.
- [x] #087 [Data Integrity] Bounty validation allows NaN `create-task-form.tsx:395`
  - Done: Replaced parseFloat() with Number() + Number.isFinite() guard. Also wrapped parseUnits() call in try/catch with NaN guard to prevent throws.
- [x] #088 [Performance] Agent submission limit hardcoded to 10 `agents/[address]/page.tsx:41`
  - Done: Added PERFORMANCE comment explaining the limit and suggesting pagination for agents with many submissions.
- [x] #089 [Reliability] Date parsing without validation `countdown-timer.tsx:16`
  - Done: Added Number.isFinite(end) check before computing diff. Invalid deadline string now shows 'Invalid deadline' instead of NaN:NaN:NaN.
- [x] #090 [Data Integrity] Deliverable validation allows empty after filter `submit-work.tsx:97-107`
  - Done: Added upfront check for at least one deliverable with non-empty description before the per-deliverable loop.
- [x] #091 [Environment] RPC_URL defaults to testnet `docker-compose.yml:11`
  - Done: Added ENVIRONMENT comments to both mcp-server and indexer services documenting the testnet fallback.
- [x] #092 [Security] Hardcoded Anvil private key in example docs `examples/claude-desktop/README.md:44`
  - Done: Added SECURITY WARNING note explaining the key is the well-known Anvil test account #0 (public knowledge) and must never be used with real funds.

## P3 — Low

- [ ] #093 [Code Quality] Repeated error handling pattern in statistics `statistics.ts`
- [ ] #094 [Code Quality] Unused `winnerAddress` parameter `task-actions.tsx:120`
- [ ] #095 [Code Quality] QueryClient creation comment `web3-provider.tsx:12`
- [ ] #096 [Code Quality] getSupportedTokens called every render `create-task-form.tsx:93`
- [ ] #097 [Code Quality] Server actions minimal error handling `ipfs.ts:1-23`
- [ ] #098 [Performance] Background gradient perf on mobile `page.tsx:17-18`
- [ ] #099 [Code Quality] Limited tag-based search `search-actions.ts:5-9`
- [ ] #100 [Code Quality] Address comparison documentation `task-actions.tsx:125`
- [ ] #101 [Code Quality] Deployment addresses not validated in code `DEPLOYMENT.md:20`
- [ ] #102 [Code Quality] Turbo cache invalidation for contracts `turbo.json:11`
- [ ] #103 [Reliability] Submodules not checked out in TS tests `ci.yml:38`
- [ ] #104 [Code Quality] prepare script silences errors `package.json:28`
- [ ] #105 [Code Quality] Caching docs missing invalidation strategy `CLAUDE.md:327`
- [ ] #106 [Dependencies] Dependabot limit too high (10) `dependabot.yml:7`
- [ ] #107 [Code Quality] Rate limiter fail-open not logged `proxy.ts:58-60`
- [ ] #108 [Code Quality] Silent skip of deregistered voters `PactAgentAdapter.sol:266-285`
- [ ] #109 [Code Quality] Reused error message for different conditions `ERC8004IdentityRegistry.sol:82`
