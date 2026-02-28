# Pact — Deep Audit TODO

Generated: 2026-02-28
Scope: all (pushing the project further)
Total findings: 152

## P1 — High (32 items)

### Smart Contracts

- [x] #001 [Security] ETH transfer DoS in dispute resolution `src/DisputeResolver.sol:311`
  - Disputer using contract wallet that rejects ETH can grief dispute resolution
  - Fix: Implemented pull-over-push withdrawal pattern. Added `pendingWithdrawals` mapping,
    `claimStake()` function, `NoPendingWithdrawal` error, and `StakeReadyToWithdraw` event.
    Updated `_processDisputeOutcome`, `cancelDispute`, and `emergencyCancelDispute` to credit
    pending withdrawals instead of direct ETH sends. Tests updated to call `claimStake()`.

- [x] #002 [Reliability] Missing timelock bootstrapping in EscrowVault `src/EscrowVault.sol:56-57`
  - Contract deployed with timelockController=address(0); all timelock-gated functions revert until setTimelock()
  - Fix: Added `error TimelockNotConfigured()` and updated `onlyTimelock` modifier to use it when
    timelockController == address(0). Updated test setUp to configure timelock; renamed misleading tests.

- [x] #003 [Reliability] readFeedback() returns empty strings for tags `src/ERC8004ReputationRegistry.sol:144-145`
  - Interface suggests tags returned but contract only stores hashes; violates interface contract
  - Fix: Added NatSpec to `readFeedback()` explaining only tag hashes are stored; callers must
    use `NewFeedback` events to recover original tag strings.

- [x] #004 [Reliability] Constructor doesn't initialize disputeResolver `src/TaskManager.sol:86-90`
  - Contract non-functional until setDisputeResolver() called via timelock; bootstrapping gap
  - Fix: Added NatSpec comment explaining the circular-dependency bootstrapping requirement and
    both resolution paths (timelock vs. emergencySetDisputeResolver).

- [x] #005 [Security] setAgentURIFor() broad adapter permissions `src/ERC8004IdentityRegistry.sol:189-199`
  - Compromised adapter can modify URIs for all agents; underdocumented trust boundary
  - Fix: Added `event AdapterURIUpdate(agentId, adapter, newURI)` emitted in `setAgentURIFor()`
    when an authorized adapter performs the update, enabling on-chain monitoring of adapter actions.

- [x] #006 [Data Integrity] feedbackHash collision using block.timestamp `src/PactAgentAdapter.sol:281`
  - Multiple voters in same block get same feedbackHash; collisions possible
  - Fix: Changed feedbackHash to `bytes32(keccak256(abi.encodePacked(voter, agentId, block.timestamp)))`
    to include the voter address and agentId, preventing same-block hash collisions.

- [x] #007 [Data Integrity] Race condition in wallet-to-agent linking `src/ERC8004IdentityRegistry.sol:146-153`
  - Two agents can claim same wallet through _register(); inconsistent state
  - Fix: Added `if (_walletToAgent[owner] != 0) revert WalletAlreadyLinked()` guard at the top
    of `_register()`, enforcing one-agent-per-wallet atomically at the registration level.

- [x] #008 [Reliability] getTask() ID=0 assumption `src/TaskManager.sol:549-552`
  - Assumes _taskCounter always >= 1; fragile if initialization changes
  - Fix: Added NatSpec to `getTask()` documenting that `_taskCounter` starts at 1 via
    `++_taskCounter`, so taskId=0 is always a non-existent task.

### Web Frontend

- [x] #009 [Financial] Unsafe parseUnits without proper error handling `apps/web/app/(dashboard)/tasks/create/create-task-form.tsx:109-119`
  - parseUnits failure silently returns BigInt(0); user could create task with 0 bounty
  - Fix: Added bountyAmountParsed === BigInt(0) guard in handleSubmit as defense-in-depth

- [x] #010 [Data Integrity] Direct Number conversion of DB values without validation `apps/web/app/(dashboard)/disputes/dispute-list.tsx:52-56`
  - Vote counts converted directly; NaN/negative possible from corrupted data
  - Fix: Added NaN check and clamp to >= 0 for votesFor and votesAgainst

### Backend Services

- [x] #011 [Financial] A2A Task TTL may silently revive expired sessions `apps/mcp-server/src/a2a/task-store.ts:152`
  - Math.max(1, ...) prevents TTL from reaching 0; keeps expired tasks alive for extra second
  - Fix: Removed Math.max(1, ...); if remainingMs <= 0 delete the key instead

- [x] #012 [Type Safety] Unsafe type casting for contract response `apps/mcp-server/src/tools/dispute/start-dispute.ts:43-54`
  - Cast through unknown without validation; r[1] could be undefined
  - Fix: Already fixed (r.length < 4 check + field type validation present)

- [x] #013 [Reliability] IPFS fetch failure not retried reliably `apps/indexer/src/handlers/task-created.ts:29-57`
  - Failed fetches marked ipfs_fetch_failed=true; no guarantee retry job backfills
  - Fix: Added TODO comment about dedicated retry queue with max-age alerting

- [x] #014 [Reliability] Event indexer may miss events on chain reorgs `apps/indexer/src/listener.ts:55-351`
  - When fromBlock > currentBlock (reorg), indexer returns without re-processing
  - Fix: Added reorg detection with REORG_SAFE_DISTANCE=10 step-back and warning log

- [x] #015 [Authorization] checkAccess() returns stale registration status `apps/mcp-server/src/auth/access-control.ts:59-106`
  - Synchronous check doesn't refresh; newly-registered agents denied
  - Fix: Added @deprecated JSDoc comment directing callers to checkAccessWithRegistrationRefresh

- [x] #016 [Type Safety] Event args not validated against expected types `apps/indexer/src/handlers/task-created.ts:12-19`
  - event.args cast without validation; wrong types cause silent runtime errors
  - Fix: Added runtime typeof checks for all expected arg fields before processing

- [x] #017 [Reliability] Default shouldRetry wastes retries on permanent failures `apps/indexer/src/utils/retry.ts:20`
  - All errors retried; permanent failures (404, invalid CIDs) waste resources
  - Fix: Added isTransientError() predicate as the default shouldRetry

- [x] #018 [API] A2A error codes not validated `apps/mcp-server/src/a2a/types.ts:287-302`
  - Handlers can return arbitrary error codes breaking client parsing
  - Fix: Added A2AErrorCode union type and createA2AError() helper that validates code

- [x] #019 [Financial] Decimal precision loss not fully prevented `apps/mcp-server/src/tools/task/create-task.ts:114-122`
  - Manual regex validation not integrated with parseTokenAmount()
  - Fix: Added comment linking regex validation to parseTokenAmount and documenting consistency requirement

- [x] #020 [Data Integrity] Unsafe timestamp conversion `apps/indexer/src/handlers/dispute-started.ts:31-41`
  - BigInt to Number conversion could silently truncate
  - Fix: Added explicit Number.isSafeInteger() check after BigInt-to-Number conversion

- [x] #021 [Authorization] Session ownership equality not normalized `apps/mcp-server/src/a2a/task-store.ts:257-260`
  - Session ID comparison not case-insensitive; potential mismatch
  - Fix: Normalized both sides with .toLowerCase() before comparison

### Shared Packages

- [x] #022 [Type Safety] Reputation type inconsistency `packages/shared-types/src/agent/agent.ts:40-59`
  - AgentListItem.reputation typed as string; database migrated to NUMERIC
  - Fix: Changed to string | number with migration NOTE; narrowing to number deferred until migration confirmed

- [x] #023 [Race Conditions] markSubmissionAsWinner fallback TOCTOU `packages/database/src/queries/submission-queries.ts:159-209`
  - Two-step UPDATE has race window; RPC function is atomic but fallback isn't
  - Fix: Added @deprecated JSDoc with TOCTOU race warning and migration reference

- [x] #024 [Race Conditions] updateFailedEventRetry fallback TOCTOU `packages/database/src/queries/event-processing-queries.ts:273-304`
  - SELECT-then-UPDATE vulnerable to concurrent processes
  - Fix: Added @deprecated JSDoc with TOCTOU race warning and migration reference

- [x] #025 [Security] Timestamp freshness check NaN bypass `packages/web3-utils/src/utils/signature.ts:108-131`
  - Invalid ISO timestamp → NaN → comparison false → bypasses auth
  - Fix: Added isNaN(challengeTime) check immediately after getTime(), returns false

- [x] #026 [Data Integrity] Status conversion missing validation `packages/contracts/src/types/enums.ts:44-59`
  - Invalid ContractTaskStatus returns undefined silently
  - Fix: Added undefined check; throws descriptive Error for unknown status values

- [x] #027 [Security] Rate limit config incomplete for new tools `packages/rate-limit/src/config/mcp-config.ts:82-84`
  - Unknown tools use default; new tools bypass proper limits
  - Fix: Added console.warn with actionable message when unknown tool hits default

- [x] #028 [Reliability] MCP client uses placeholder transport `packages/mcp-client/src/client.ts:42-62`
  - PactClient.connect() runs `node --version`; non-functional
  - Fix: connect() now throws with helpful error directing to PactApiClient

- [x] #029 [Code Quality] webhook-queries not integrated `packages/database/src/queries/webhook-queries.ts`
  - File exists but not exported from index.ts
  - Fix: Already exported (packages/database/src/queries/index.ts line 8)

### Infrastructure

- [x] #030 [Config] Inconsistent env var naming `examples/claude-desktop/claude_desktop_config.json:7`
  - PACT_MCP_SERVER_URL vs PACT_SERVER_URL across files
  - Fix: Standardized config.json to PACT_SERVER_URL; updated pact-mcp.ts and client.ts with backwards-compat fallback

- [x] #031 [Database] Missing RLS on webhook_deliveries table `supabase/migrations/20250206000001_webhook_support.sql:10-23`
  - No Row Level Security; violates project security model
  - Fix: Created supabase/migrations/20250228100000_webhook_rls.sql with RLS + service_role policies

## P2 — Medium (98 items)

### Smart Contracts (25)

- [x] #032 [Security] Signature deadline semantics inverted `src/ERC8004IdentityRegistry.sol:267-271`
  - Added NatSpec to setAgentWallet() documenting non-standard deadline semantics (future = expired).
- [x] #033 [Data Integrity] Missing task existence validation `src/DisputeResolver.sol:156-166`
  - Added comment that getTask() reverts via TaskNotFound for invalid IDs; invalid IDs impossible in practice.
- [x] #034 [Financial] Fee rounding edge cases untested `src/EscrowVault.sol:165`
  - Added TODO comment in release() NatSpec for edge-case fee rounding tests (1 wei, non-divisible amounts).
- [x] #035 [Security] Task creator/disputer error misleading `src/DisputeResolver.sol:233`
  - Created DisputerCannotVote() and CreatorCannotVote() errors; replaced AlreadyVoted for those two cases.
    Updated DisputeResolver.t.sol tests to expect new error selectors.
- [x] #036 [Reliability] No dispute-task cross-validation `src/TaskManager.sol:493-503`
  - Added require(activeDispute.taskId == taskId) assertion in resolveDispute() via disputeResolver.getDispute().
- [x] #037 [Performance] MAX_VOTERS_PER_DISPUTE hardcoded `src/DisputeResolver.sol:238`
  - Converted MAX_VOTERS_PER_DISPUTE constant to maxVotersPerDispute state variable (default 500).
    Added setMaxVotersPerDispute(uint256) onlyTimelock setter with [MIN_MAX_VOTERS, ABS_MAX_VOTERS] bounds.
    Added MaxVotersPerDisputeUpdated event.
- [x] #038 [Reliability] Duplicate submission detection fragile `src/TaskManager.sol:283`
  - Added NatSpec documenting submissions are append-only (no deleteSubmission); explains design rationale.
- [x] #039 [Error Handling] Missing zero-votes documentation `src/DisputeResolver.sol:269-278`
  - Added comment "No votes: tie breaks in favor of creator (status quo wins)" with rationale.
- [x] #040 [API] getBalance() can't distinguish released vs never-existed `src/EscrowVault.sol:309-315`
  - Implemented hasEscrow(uint256) view function; updated getBalance() NatSpec to reference it.
- [x] #041 [Auth] cancelDispute dual-path security difference `src/DisputeResolver.sol:522-541`
  - Added NatSpec documenting both paths (timelock vs emergency): timelock delay, trade-offs, use cases.
- [x] #042 [Reliability] refundExpiredTask error misleading `src/TaskManager.sol:417-435`
  - Created TaskHasNoDeadline() error; refundExpiredTask() now reverts with it for tasks without deadlines.
- [x] #043 [Reliability] Reputation clamping without logging `src/PactAgentAdapter.sol:312`
  - Added ReputationClamped event declaration; added note explaining view function limitation; documented
    off-chain detection approach via getReputationSummary().
- [x] #044 [Error Handling] ETH transfer failure indistinguishable `src/EscrowVault.sol:168-182`
  - Created FeeTransferFailed() and NetAmountTransferFailed() errors; release() ETH path uses specific errors.
- [x] #045 [Financial] No maximum bounty amount check `src/EscrowVault.sol:92-102`
  - Added NatSpec to deposit() documenting unbounded bounties are accepted, and future MAX_BOUNTY guidance.
- [x] #046 [Code Quality] Duplicated voter reputation logic `src/DisputeResolver.sol:336-339`
  - Extracted _applyVoterRepUpdate(address, Vote storage, bool) private helper; both loops now call it.
- [x] #047 [Code Quality] Misleading event parameter docs `src/ERC8004ReputationRegistry.sol:117-135`
  - Added full NatSpec to NewFeedback event in IERC8004ReputationRegistry documenting indexed string hashing.
- [x] #048 [Code Quality] Metadata batch size unlimited `src/ERC8004IdentityRegistry.sol:99-123`
  - Added MAX_METADATA_PER_REGISTRATION = 50 constant and TooManyMetadataEntries() error.
    Added check in register(string, MetadataEntry[]) that reverts if metadata.length > 50.
- [x] #049 [Reliability] voterReputation skips unregistered silently `src/PactAgentAdapter.sol:266-285`
  - Added VoterReputationSkipped(address indexed voter) event; emitted in updateVoterReputation() skip path.
- [x] #050 [Data Integrity] selectWinner doesn't validate agent status `src/TaskManager.sol:349-352`
  - Added NatSpec to selectWinner() documenting that deregistered agents can still be selected, and that
    finalization will revert if they stay deregistered (bounty is safe in escrow).
- [x] #051 [Security] ETH value mismatch reentrancy `src/TaskManager.sol:239-242`
  - Added NatSpec to createTask() documenting reentrancy analysis and why nonReentrant is not strictly needed.
- [x] #052 [Code Quality] Incorrect event parameter `src/ERC8004IdentityRegistry.sol:120`
  - Added NatSpec to MetadataSet event in IERC8004IdentityRegistry documenting indexed string hashing semantics.
- [x] #053 [API] isRegistered() no distinction from deregistered `src/PactAgentAdapter.sol:154-156`
  - Added NatSpec to isRegistered() documenting current-state-only semantics and TOCTOU note.
- [x] #054 [Data Integrity] Vote weight timing mismatch `src/DisputeResolver.sol:221-256`
  - Added NatSpec to submitVote() documenting that vote weight is captured and stored at voting time.
- [x] #055 [Error Handling] resolveDispute doesn't re-validate status `src/TaskManager.sol:501-512`
  - Added full state machine diagram in NatSpec for resolveDispute() documenting all task status transitions.
- [x] #056 [Reliability] ERC20 approval docs missing `src/EscrowVault.sol:81-105`
  - Added NatSpec to depositFrom() documenting SafeERC20 behaviors (false-return, no-bool-return tokens).

### Web Frontend (28)

- [x] #057 [Config] Placeholder WalletConnect project ID `apps/web/lib/wagmi.ts:8-12`
  - Fix: Throw Error in production if NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; keep console.warn for development.
- [x] #058 [Config] Default chain ID fallback to testnet `apps/web/app/(dashboard)/tasks/create/create-task-form.tsx:61`
  - Fix: Throw Error in production if NEXT_PUBLIC_CHAIN_ID is not set; keep console.warn for development.
- [x] #059 [Config] Single IPFS gateway point of failure `apps/web/lib/format.ts:110-112`
  - Fix: Added TODO comment documenting the gateway fallback gap and suggested implementation approach.
- [x] #060 [Reliability] Newsletter API key undefined `apps/web/app/actions/newsletter.ts:17`
  - Fix: Added early return with error response if RESEND_API_KEY is undefined before making API calls.
- [x] #061 [Error Handling] Error message truncation (2 locations) `apps/web/...`
  - Fix: Removed .slice() truncation from task-actions.tsx (2 places), submit-work.tsx, create-task-form.tsx,
    register/page.tsx, edit-profile.tsx, resolve-dispute.tsx, and vote-actions.tsx. Show full error messages.
- [x] #062 [Reliability] Promise.all swallows errors `apps/web/app/(dashboard)/dashboard/dashboard-content.tsx:75-80`
  - Fix: Changed to Promise.allSettled with per-result handling; logs errors for failed fetches while still
    rendering successful sections.
- [x] #063 [Reliability] Silent search failure `apps/web/components/command-search.tsx:78-82`
  - Fix: Added console.error in catch block for search failures.
- [x] #064 [Code Quality] Incomplete full-text search `apps/web/app/(dashboard)/dashboard/search-actions.ts:6-14`
  - Already had TODO comment about pg_trgm index. No further change needed.
- [x] #065 [Data Integrity] Missing IPFS CID format validation `apps/web/app/(dashboard)/tasks/[id]/submit-work.tsx:58-79`
  - Fix: Added CID format validation (must start with "Qm" for v0 or "bafy" for v1) and URL validation
    (must start with "http").
- [x] #066 [Data Integrity] Unsafe parseInt handling `apps/web/app/(dashboard)/dashboard/dashboard-content.tsx:133`
  - Fix: Added explicit null/undefined check before parseInt; coerces value to String before parsing.
- [x] #067 [Data Integrity] Unsafe vote count conversion `apps/web/app/(dashboard)/disputes/[id]/page.tsx:43-46`
  - Fix: Added upper bound clamp (MAX_VOTES = 1_000_000) in addition to existing Math.max(0, ...) lower bound.
- [x] #068 [Security] IP spoofing if proxy misconfigured `apps/web/proxy.ts:50-65`
  - Fix: Added detailed comment documenting IP spoofing risk when TRUST_PROXY_HEADERS is enabled without
    a trusted proxy in front, including the x-forwarded-for header injection vector.
- [x] #069 [Reliability] Unknown IPs share rate limit bucket `apps/web/proxy.ts:55-60`
  - Fix: Changed to console.error in production (rate limit bypass is an error-severity event);
    console.warn retained for development to avoid noise.
- [x] #070 [Performance] Hard-coded 10 submissions per agent `apps/web/app/(dashboard)/agents/[address]/page.tsx:45`
  - Already had a PERFORMANCE comment. No further change needed.
- [x] #071 [Performance] Pagination total count edge cases `apps/web/...`
  - Fix: Added NOTE comment in tasks/page.tsx explaining the MVCC gap between COUNT and data-fetch queries.
- [x] #072 [Accessibility] aria-describedby linked to non-existent element `apps/web/components/newsletter-form.tsx:36`
  - Already fixed (aria-describedby is conditionally set to undefined when no error is shown). No change needed.
- [x] #073 [Accessibility] aria-hidden hydration issues `apps/web/components/connect-button.tsx:15-23`
  - Fix: Added suppressHydrationWarning to the mounting wrapper div.
- [x] #074 [Type Safety] Address comparison normalization `apps/web/app/(dashboard)/tasks/[id]/task-actions.tsx:149-159`
  - Already fixed (both addresses normalized with .toLowerCase()). No change needed.
- [x] #075 [Reliability] Countdown timer invalid deadline `apps/web/app/(dashboard)/tasks/[id]/countdown-timer.tsx:14-17`
  - Fix: Added console.error logging of the invalid deadline value when isFinite check fails.
- [x] #076 [Error Handling] Error logging lacks context `apps/web/app/error.tsx:13-15`
  - Fix: Added TODO comment about Sentry integration with specific implementation guidance.
- [x] #077 [Code Quality] Agent registration page not audited `apps/web/app/(dashboard)/agents/register/page.tsx`
  - Fix: Added TODO security review comment at top of file covering input sanitization and CSRF.
- [x] #078 [Code Quality] Landing page sections not audited `apps/web/components/landing/`
  - Fix: Added TODO security review comment at top of hero-section.tsx covering XSS and accessibility.
- [x] #079 [Code Quality] Inconsistent error handling patterns `apps/web/` (various)
  - Fix: Added TODO comment in error.tsx documenting the inconsistency and proposed unified approach.
- [x] #080 [Code Quality] Edit profile form not audited `apps/web/app/(dashboard)/agents/[address]/edit-profile.tsx`
  - Fix: Added TODO security review comment covering authorization check and input validation.
- [x] #081 [Code Quality] Resolve dispute component not audited `apps/web/app/(dashboard)/disputes/[id]/resolve-dispute.tsx`
  - Fix: Added TODO security review comment covering UI-level resolve authorization and prop validation.
- [x] #082 [Data Integrity] Email transform without notification `apps/web/lib/validations/waitlist.ts:4-9`
  - Fix: Added TODO comment documenting the silent lowercase normalization behavior.
- [x] #083 [Performance] Fixed background gradient iOS repaint `apps/web/app/(dashboard)/layout.tsx:9-11`
  - Fix: Added TODO comment with three concrete fix options for the iOS repaint issue.
- [x] #084 [Code Quality] Feedback history not audited `apps/web/app/(dashboard)/agents/[address]/feedback-history.tsx`
  - Fix: Added TODO security review comment covering XSS from on-chain tag data and pagination limits.

### Backend Services (17)

- [x] #085 [Race Conditions] In-memory rate limit not multi-instance safe `apps/mcp-server/src/auth/wallet-signature.ts:203-220`
  - Comment at wallet-signature.ts:203-209 already documents limitation; startup warning in index.ts:29-36 already present
- [x] #086 [Security] IP detection not fully validated `apps/mcp-server/src/a2a/router.ts:44-61`
  - Added console.warn when TRUST_PROXY_HEADERS=false but X-Forwarded-For header is present
- [x] #087 [Reliability] DLQ may re-process events `apps/indexer/src/index.ts:74-119`
  - Added comment documenting idempotency guarantee and handler idempotency requirement
- [x] #088 [API] Token approval not enforced `apps/mcp-server/src/tools/task/create-task.ts:97-206`
  - Added comment documenting that token approval is caller's responsibility
- [x] #089 [Reliability] Checkpoint uses minimum across contracts `apps/indexer/src/listener.ts:368-375`
  - Added TODO comment about per-contract checkpointing; documented current minimum-across-contracts behavior
- [x] #090 [Data Integrity] submission_index set to 0 temporarily `apps/indexer/src/handlers/work-submitted.ts:51-54`
  - Added comment explaining temporary submission_index=0 in submit-work.ts and indexer backfill in work-submitted.ts
- [x] #091 [Reliability] Webhook batch timeout logging `apps/indexer/src/services/webhook-notifier.ts:150-174`
  - Separated timeout log (batch exceeded threshold) from failure log (individual deliveries failed)
- [x] #092 [Reliability] tasks/list auth inconsistency `apps/mcp-server/src/a2a/handlers/tasks-list.ts:24-30`
  - Added comment documenting anonymous session limitation and why authentication is required
- [x] #093 [Reliability] Session TTL silent rejection `apps/mcp-server/src/auth/session-manager.ts:162-168`
  - Added getSessionWithReason() function returning { session, expired } for distinct not-found vs expired states
- [x] #094 [Reliability] HTTP server startup not awaited `apps/mcp-server/src/index.ts:39-45`
  - Wrapped startHttpServer() in try/catch with process.exit(1) on failure; separated from stdio server try/catch
- [x] #095 [Config] A2A base URL fallback to localhost `apps/mcp-server/src/a2a/agent-card.ts:17-19`
  - Added module-level startup warning when neither A2A_BASE_URL nor PUBLIC_URL set in production
- [x] #096 [Data Integrity] Submission index desync `apps/mcp-server/src/tools/agent/submit-work.ts:124-147`
  - Added comment explaining temporary desync and that indexer backfills the correct on-chain index
- [x] #097 [Security] skillRequiresAuth masks not-found `apps/mcp-server/src/a2a/skill-bridge.ts:182-186`
  - skillRequiresAuth() and skillRequiresRegistration() now throw for unknown skill IDs instead of returning true
- [x] #098 [Reliability] Skill errors not categorized `apps/mcp-server/src/a2a/handlers/message-send.ts:62-73`
  - Added retryable flag in failed task output to distinguish transient vs permanent errors
- [x] #099 [Reliability] Agent stats failure ignored `apps/indexer/src/handlers/dispute-resolved.ts:52-55`
  - Changed console.warn to console.error with detailed context (dispute ID, disputerWon, agent address)
- [x] #100 [Config] Interval env vars no validation `apps/indexer/src/index.ts:221-223`
  - Added Math.max() minimum bounds: 1000ms for polling, 5000ms for all retry intervals
- [x] #101 [Data Integrity] Timestamp conversion `apps/indexer/src/handlers/dispute-started.ts:31-41`
  - Already addressed by #020

### Shared Packages (14)

- [x] #102 [Reliability] Task count fallback returns wrong total `packages/database/src/queries/task-queries.ts:70-93`
  - Added isEstimate?: boolean to listTasks return type; set isEstimate=true when RPC fallback is used
- [x] #103 [Data Integrity] Auth challenge parsing lacks validation `packages/web3-utils/src/utils/signature.ts:73-99`
  - Added validateParsedChallenge() type guard checking address, nonce, timestamp all defined and non-empty
- [x] #104 [Reliability] Redis pipeline error handling `packages/cache/src/cache-client.ts:88-99`
  - Added per-command result checking after pipeline.exec() in the set() method
- [x] #105 [Reliability] IPFS timeout error misleading `packages/ipfs-utils/src/fetch/fetch-json.ts:54-57`
  - Already fixed (AbortError distinction with timeout duration already present)
- [x] #106 [Reliability] Upload retry error types `packages/ipfs-utils/src/upload/upload-json.ts:43-56`
  - Added explicit non-retryable check for HTTP 401, 403, 429 before retryable error patterns
- [x] #107 [Code Quality] Zero address check too broad `packages/contracts/src/addresses/index.ts:15-24`
  - Added throwIfAnyZeroAddressOnMainnet() that throws for ANY zero address on mainnet (chainId 8453)
- [x] #108 [Reliability] Cache cleanup runs indefinitely `packages/cache/src/cache-client.ts:26-50`
  - Added comment documenting cleanup interval behavior; acceptable as-is for current scale
- [x] #109 [Type Safety] GetTaskResponse requirements mismatch `packages/shared-types/src/mcp/tool-responses.ts:32-35`
  - Imported TaskRequirement from task-specification; replaced inline type with TaskRequirement[]
- [x] #110 [Reliability] contractStatusToTaskStatus wrong default `packages/web3-utils/src/contracts/task-manager.ts:108-119`
  - Throws descriptive error for unknown status values instead of returning 'open'
- [x] #111 [Reliability] Invalid Pinata group ID only warned `packages/ipfs-utils/src/client/pinata-client.ts:85-98`
  - Throws error instead of warning for invalid UUID format in PINATA_PUBLIC_GROUP_ID
- [x] #112 [Error Handling] listTools returns empty array `packages/mcp-client/src/api-client.ts:91-96`
  - Throws descriptive error instead of returning empty array for malformed server response
- [x] #113 [Reliability] updateDispute missing updated_at `packages/database/src/queries/dispute-queries.ts:149-159`
  - Added updated_at to disputes schema (Row/Insert/Update types); updateDispute() auto-sets it
- [x] #114 [Code Quality] PactClient exported but non-functional `packages/mcp-client/src/index.ts`
  - Added @deprecated JSDoc comment on the PactClient export with migration guidance
- [x] #115 [Data Integrity] Agent insert requires profile_cid `packages/database/src/schema/database.ts:80-97`
  - Added comment documenting timing between agent creation and profile upload; explains ipfs_fetch_failed

### Infrastructure (14)

- [x] #116 [Security] Hardcoded test private key in docs `examples/README.md:60-62`
  - Fix: Replaced hardcoded Anvil Account #1 private key with "YOUR_PRIVATE_KEY_HERE" placeholder.
- [x] #117 [Security] Anvil key in template config `examples/claude-desktop/claude_desktop_config.json:8`
  - Already had "YOUR_PRIVATE_KEY_HERE" placeholder. No change needed.
- [x] #118 [Database] Missing webhook composite index `supabase/migrations/20250206000001_webhook_support.sql:34`
  - Fix: Added TODO comment explaining the composite index opportunity for (agent_address, status, created_at DESC)
    with the specific CREATE INDEX statement to use when ready.
- [x] #119 [Error Handling] Silent registration failure (creator-agent) `examples/creator-agent/src/index.ts:53-58`
  - Fix: Check error message for "already registered" / "AlreadyRegistered" before suppressing; log unexpected
    errors with console.error instead of silently ignoring them.
- [x] #120 [Error Handling] Silent registration failure (worker-agent) `examples/worker-agent/src/index.ts:54-58`
  - Fix: Same pattern as #119 applied to worker-agent.
- [x] #121 [Config] Shared config no env validation `examples/_shared/config.ts:5-8`
  - Fix: Added getAuthenticatedConfig() helper that throws a descriptive error if PACT_WALLET_PRIVATE_KEY
    is missing, with guidance on how to set it.
- [x] #122 [Error Handling] Generic error handler `examples/task-finder/src/index.ts:104-107`
  - Fix: Added error type checking with specific actionable messages for ECONNREFUSED, 401, and 404 failures.
- [x] #123 [Reliability] MCP server healthcheck incomplete `docker-compose.yml:26`
  - Fix: Added TODO comment with specific enhancement suggestions (DB ping, RPC check, JSON response body).
- [x] #124 [Database] Functional index DROP not validated `supabase/migrations/20250228000003_numeric_column_types.sql:50`
  - Fix: Added TODO comment noting the missing rollback procedure for the DROP INDEX.
- [x] #125 [Performance] Exponential backoff overflow risk `supabase/migrations/20250204000001_event_processing_tables.sql:232-233`
  - Fix: Added NOTE comment explaining the overflow scenario (POWER(2,31) = ~4085 years) and confirming
    the LEAST(..., 1440) cap protects against it.
- [x] #126 [Config] Env var naming inconsistency in docs `examples/claude-desktop/README.md:34-49`
  - Fix: Replaced hardcoded Anvil private key in local dev example with placeholder; updated security warning.
- [x] #127 [Dependencies] Viem non-deterministic version `examples/creator-agent/package.json:11`
  - Fix: Pinned viem to exact version "2.21.0" (removed ^) in both creator-agent and worker-agent package.json.
- [x] #128 [Config] Turbo cache inputs incomplete `turbo.json:5-7`
  - Fix: Added "env" array to build task with NEXT_PUBLIC_* vars; added .env.example to inputs.
- [x] #129 [Database] Tasks RLS no audit trail `supabase/migrations/20250201000002_rls_policies.sql:17-21`
  - Fix: Added TODO comment documenting the audit gap and three concrete implementation options.

## P3 — Low (22 items)

- [x] #130 [Performance] Log2 not bit-optimized `src/PactAgentAdapter.sol:317`
  - Added comment "Acceptable for current reputation ranges; consider bit-shifting if gas-critical" above _log2() call.
- [x] #131 [Code Quality] Time constants could be configurable `src/TaskManager.sol:35-41`
  - Added comment "MIN/MAX bounds are immutable; consider making configurable via timelock in future".
- [x] #132 [Code Quality] Vote delta comment confusing `src/DisputeResolver.sol:28-29`
  - Clarified NatSpec: "DisputeResolver uses same deltas as PactAgentAdapter: +3 correct, -2 incorrect".
- [x] #133 [Code Quality] getVoters() returns raw array `src/DisputeResolver.sol:475`
  - Added @dev NatSpec warning about gas cost scaling linearly with voter count for large disputes.
- [x] #134 [Performance] Inefficient remaining vote calc `src/DisputeResolver.sol:407-411`
  - Added comment "Ternary/if-else is clearer than alternative; no gas savings from change".
- [x] #135 [Reliability] No root error boundary `apps/web/app/layout.tsx:107-115`
  - Added TODO comment about adding a React error boundary around {children}.
- [x] #136 [Code Quality] Deliverable validation sequential `apps/web/app/(dashboard)/tasks/[id]/submit-work.tsx:88-104`
  - Added TODO comment about collecting all validation errors upfront and displaying them aggregated.
- [x] #137 [Code Quality] Inconsistent error handling patterns `apps/web/`
  - Already addressed by P2 fixes #076-#084 (unified approach documented in error.tsx).
- [x] #138 [Code Quality] OG image files not audited `apps/web/app/opengraph-image.tsx`
  - Added TODO security review comment about runtime font fetch from GitHub CDN.
- [x] #139 [Code Quality] Loading skeleton not reviewed `apps/web/app/loading.tsx`
  - Added TODO review comment about aria-label/role="status" for screen reader accessibility.
- [x] #140 [Dependencies] Workspace examples can't run standalone `examples/task-finder/package.json:10`
  - Added note in examples/README.md that examples require monorepo workspace context.
- [x] #141 [CI/CD] npm version check no pre-release `npm-publish.yml:38-40`
  - Added TODO comment about semver comparison for pre-release versions before bun install step.
- [x] #142 [CI/CD] Missing --frozen-lockfile in publish `npm-publish.yml:27`
  - Changed `bun install` to `bun install --frozen-lockfile` in npm-publish.yml.
- [x] #143 [CI/CD] Inconsistent bun install flags `ci.yml:21 vs npm-publish.yml:27`
  - Fixed by #142 (npm-publish.yml now uses --frozen-lockfile).
- [x] #144 [Config] Vercel project name mismatch `vercel/project.json:1`
  - Added _note field in .vercel/project.json explaining "clawboy" is the legacy pre-rebrand name.
- [x] #145 [Code Quality] Bug report template says OpenClaw `.github/ISSUE_TEMPLATE/bug_report.yml:22`
  - Changed "OpenClaw Skill" to "Pact Skill" in the component dropdown.
- [x] #146 [Reliability] Indexer healthcheck generic `docker-compose.yml:51`
  - Added TODO comment about replacing pgrep with a specific indexer liveness HTTP endpoint.
- [x] #147 [Data Integrity] UNIQUE allows identical re-submission `supabase/migrations/20250203000001_competitive_model_schema.sql:26-28`
  - Added NOTE comment that identical CID re-submission is handled at application level (idempotent retries).
- [x] #148 [Code Quality] Incomplete example docs `examples/README.md:29-39`
  - Added script verification note and monorepo workspace requirement note.
- [x] #149 [Performance] Rate limiter cache unbounded `packages/rate-limit/src/config/mcp-config.ts:94-116`
  - Added comment that limiterCache is intentionally small (4 operation types max, not per-user/IP).
- [x] #150 [Type Safety] Data staleness not tracked `packages/shared-types/`
  - Added TODO comment in packages/shared-types/src/index.ts about _cachedAt/_isStale fields.
- [x] #151 [Code Quality] TTL config not documented `packages/cache/src/ttl-config.ts`
  - Added per-entry JSDoc comments explaining rationale for each TTL value and cache invalidation strategy.
