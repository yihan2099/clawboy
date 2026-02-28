# Pact — Documentation-Code Consistency Audit TODO

Generated: 2026-02-28
Scope: all
Total findings: 40

---

## P0 — Critical

- [x] #001 [API Contract] web3-utils README: wrong client export names
  - File: `packages/web3-utils/README.md`
  - README documents `createPublicClient`, `createWalletClient` but actual exports are `getPublicClient`, `createWalletFromPrivateKey`
  - Fix: Rewrite the client usage section to match `src/client/index.ts` exports: `getPublicClient, getChain, getDefaultRpcUrl, resetPublicClient, getBlockNumber, getBalance, waitForTransaction, createWalletFromPrivateKey, getAddressFromPrivateKey, signMessage, signTypedData`

- [x] #002 [API Contract] web3-utils README: wrong contract wrapper names
  - File: `packages/web3-utils/README.md`
  - README documents `readTaskManager`, `readEscrowVault` etc. but actual exports are `getTaskManagerAddress`, `getEscrowVaultAddress`, `getAgentAdapterAddress`, etc.
  - Fix: Rewrite contract usage section to match `src/contracts/index.ts` exports

- [x] #003 [Data Integrity] E2E README: all local contract addresses wrong
  - File: `apps/mcp-server/src/__tests__/e2e/README.md`
  - Every listed address is incorrect vs `packages/contracts/src/addresses/local.ts`
  - Fix: Update all addresses to match: identityRegistry=0x5FbDB..., reputationRegistry=0xe7f1725..., agentAdapter=0x9fE467..., escrowVault=0xCf7Ed3..., taskManager=0xDc64a140..., disputeResolver=0x5FC8d32...

- [x] #004 [API Contract] E2E README: lists nonexistent MCP tools
  - File: `apps/mcp-server/src/__tests__/e2e/README.md`
  - Documents `select_winner` and `finalize_task` as MCP tools — these do NOT exist in the server
  - Fix: Remove these from the tools list and document only the actual 21 tools

- [x] #005 [Data Integrity] shared-types package.json: exports point to nonexistent paths
  - File: `packages/shared-types/package.json`
  - Exports `./claim` → `src/claim/index.ts` and `./verification` → `src/verification/index.ts` — these directories/files don't exist
  - Fix: Remove the `./claim` and `./verification` export entries from package.json, or create the missing files if these types are needed

- [x] #006 [Environment & Config] pact-skill README: wrong env var name
  - File: `packages/pact-skill/README.md`
  - README documents `PACT_MCP_SERVER_URL` but code at `src/cli.ts:15` reads `PACT_SERVER_URL`
  - Fix: Update README to document `PACT_SERVER_URL` as the correct env var

- [x] #007 [Environment & Config] claude-desktop config: wrong env var name
  - File: `examples/claude-desktop/claude_desktop_config.json`
  - Config uses `PACT_SERVER_URL` but mcp-client code at `src/bin/pact-mcp.ts:531` reads `PACT_MCP_SERVER_URL`
  - Fix: Update the claude-desktop config to use `PACT_MCP_SERVER_URL`

- [x] #008 [Environment & Config] BACKEND_ARCHITECTURE.md: wrong Supabase env var names
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documents `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Actual: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (fallback `SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY` (fallback `SUPABASE_SERVICE_ROLE_KEY`)
  - Fix: Update all Supabase env var references to use current names

---

## P1 — High

- [x] #009 [Security] SECURITY.md: incorrectly states time constants are immutable
  - File: `SECURITY.md`
  - States challenge window and voting period are hardcoded and immutable
  - Actual: They're adjustable via `setChallengeWindow()` and `setVotingPeriod()` (owner-only, with bounds)
  - Fix: Update to describe them as owner-configurable with min/max bounds
  - Done: Updated SECURITY.md to describe them as owner-adjustable via setter functions, bounded 24h min / 7 days max

- [x] #010 [API Contract] contracts README: wrong function name
  - File: `packages/contracts/README.md`
  - Documents `getAddresses()` but actual export is `getContractAddresses()`
  - Fix: Update function name in README

- [x] #011 [API Contract] ipfs-utils README: IpfsUploadError not exported
  - File: `packages/ipfs-utils/README.md`
  - README shows `import { IpfsUploadError } from '@pactprotocol/ipfs-utils/upload'`
  - Actual: `src/upload/index.ts` does NOT re-export `IpfsUploadError`
  - Fix: Either add the re-export to `src/upload/index.ts` or remove from README

- [x] #012 [API Contract] DisputeStarted → DisputeCreated event name mismatch
  - Files: `apps/mcp-server/src/__tests__/e2e/README.md`, `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Multiple docs reference `DisputeStarted` but actual event name is `DisputeCreated`
  - Fix: Replace all `DisputeStarted` references with `DisputeCreated`

- [x] #013 [API Contract] cache package README: says publicly installable but is private
  - File: `packages/cache/README.md`
  - README says `bun add @pactprotocol/cache` but `package.json` has `"private": true`
  - Fix: Update README to note this is an internal monorepo package, not published to npm

- [x] #014 [API Contract] redis package README: says publicly installable but is private
  - File: `packages/redis/README.md`
  - README says `bun add @pactprotocol/redis` but `package.json` has `"private": true`
  - Fix: Update README to note this is an internal monorepo package, not published to npm

- [x] #015 [Environment & Config] database README: missing SUPABASE_PUBLISHABLE_KEY docs
  - File: `packages/database/README.md`
  - README doesn't document the current env var names (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`)
  - Fix: Add env var documentation section with current var names and legacy fallbacks

- [x] #016 [API Contract] mcp-client default URL: documented as production but is localhost
  - File: `packages/mcp-client/README.md`
  - README implies default URL is production endpoint
  - Actual: `src/bin/pact-mcp.ts:531` defaults to `http://localhost:3001`
  - Fix: Update README to state default is `http://localhost:3001`

- [x] #017 [Data Integrity] BACKEND_ARCHITECTURE.md: documents nonexistent `users` table
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Schema section lists `users` table — this table does not exist in any migration
  - Fix: Remove `users` table from schema documentation

- [x] #018 [Data Integrity] BACKEND_ARCHITECTURE.md: documents nonexistent `webhook_queue` table
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Schema section lists `webhook_queue` table — actual table is `webhook_deliveries`
  - Fix: Replace `webhook_queue` with `webhook_deliveries` and update column definitions

- [x] #019 [Data Integrity] BACKEND_ARCHITECTURE.md: documents nonexistent `chain_events` table
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Schema section lists `chain_events` table — actual table is `processed_events`
  - Fix: Replace `chain_events` with `processed_events` and update column definitions

- [x] #020 [Environment & Config] BACKEND_ARCHITECTURE.md: wrong Pinata env var
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documents `PINATA_GATEWAY_URL` but code reads `PINATA_GATEWAY`
  - Fix: Update to `PINATA_GATEWAY`

- [x] #021 [API Contract] BACKEND_ARCHITECTURE.md: documents `bun run db:migrate` command
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - This command is not defined in root `package.json`
  - Fix: Either add the script to root package.json or update docs with actual migration command

---

## P2 — Medium

- [x] #022 [API Contract] CHANGELOG: claims 24 MCP tools but server has 21
  - File: `CHANGELOG.md`
  - Fix: Update tool count to 21
  - Done: Updated both A2A skills count (24->21) and MCP Client tools count (24->21) in CHANGELOG.md

- [x] #023 [Environment & Config] docker-compose: REDIS_URL env var unused
  - File: `docker-compose.yml`
  - Contains `REDIS_URL` env and redis:7-alpine service but code only uses Upstash REST API
  - Fix: Remove redis service and REDIS_URL, or add note about Upstash REST requirement
  - Done: Added comment block noting redis service is for local dev only; production uses Upstash REST API

- [x] #024 [Environment & Config] DEPLOYMENT.md: missing indexer Upstash env vars
  - File: `DEPLOYMENT.md`
  - Indexer section doesn't list `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
  - Fix: Add these to the indexer environment variables table
  - Done: Added UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to the indexer env vars table

- [x] #025 [API Contract] CLAUDE.md: describes web app as "landing page + waitlist"
  - File: `CLAUDE.md`
  - Actual web app has full dashboard with tasks, agents, disputes routes
  - Fix: Update description to reflect actual dashboard functionality
  - Done: Updated CLAUDE.md architecture tree and CHANGELOG.md [0.1.0] to describe dashboard with tasks, agents, disputes

- [x] #026 [API Contract] Web app missing `typecheck` script
  - File: `apps/web/package.json`
  - Monorepo docs reference a `typecheck` script for all apps, but web app doesn't have one
  - Fix: Add `"typecheck": "tsc --noEmit"` to web app's package.json scripts

- [x] #027 [API Contract] CHANGELOG: claims reputation tools in mcp-client
  - File: `CHANGELOG.md`
  - States reputation management tools were added to mcp-client but they're not present
  - Fix: Remove or correct the reputation tools claim
  - Done: Removed "Added reputation tools" line from CHANGELOG.md MCP Client fixed section (those tools are in the MCP server, not the client)

- [x] #028 [Data Integrity] BACKEND_ARCHITECTURE.md: agents table column mismatches
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documented columns don't match actual migration schema
  - Fix: Update to match `supabase/migrations/` definitions

- [x] #029 [Data Integrity] BACKEND_ARCHITECTURE.md: tasks table column mismatches
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documented columns don't match actual migration schema
  - Fix: Update to match actual schema

- [x] #030 [Data Integrity] BACKEND_ARCHITECTURE.md: disputes table column mismatches
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documented columns don't match actual migration schema
  - Fix: Update to match actual schema

- [x] #031 [Data Integrity] BACKEND_ARCHITECTURE.md: missing indexed events
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Events table is incomplete vs what indexer actually processes
  - Fix: Add all events from `apps/indexer/src/processor.ts`

- [x] #032 [Dependencies] BACKEND_ARCHITECTURE.md: Zod version wrong
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documents Zod 4.x but mcp-server uses Zod 3.x
  - Fix: Update to Zod 3.x

- [x] #033 [API Contract] BACKEND_ARCHITECTURE.md: IPFSService class doesn't exist
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documents `IPFSService` as a service class but it doesn't exist — IPFS is accessed via functions
  - Fix: Update to describe actual function-based IPFS usage

- [x] #034 [API Contract] BACKEND_ARCHITECTURE.md: ChainService class doesn't exist
  - File: `pact-internal/architecture/BACKEND_ARCHITECTURE.md`
  - Documents `ChainService` as a service class but it doesn't exist — chain interaction uses web3-utils package
  - Fix: Update to describe actual web3-utils based chain interaction

- [x] #035 [Code Quality] TODO.md #074: runtime console.warn() not implemented
  - File: `packages/contracts/src/addresses/index.ts`
  - TODO item claims "Runtime console.warn() when all addresses are zero" is done, but only a static comment exists
  - Fix: Either implement the runtime warning or update TODO.md to mark as not done
  - Done: Implemented warnIfAllZeroAddresses() in index.ts that emits console.warn() when getContractAddresses() is called with mainnet chain ID and all addresses are zero

- [x] #036 [API Contract] Web app README: waitlist uses server action not API route
  - File: `apps/web/README.md`
  - Documents `api/waitlist/` route but actual implementation uses server action at `app/actions/newsletter.ts`
  - Fix: Update README to reference server action

---

## P3 — Low

- [x] #037 [Code Quality] DEPLOYMENT.md: year typo
  - File: `DEPLOYMENT.md`
  - Says 2025 in deployment dates, should be 2026
  - Fix: Update year
  - Done: Already fixed in a previous commit; DEPLOYMENT.md shows 2026-02-04

- [x] #038 [API Contract] DEPLOYMENT.md: missing TimelockController
  - File: `DEPLOYMENT.md`
  - Contracts table doesn't list TimelockController (OpenZeppelin)
  - Fix: Add TimelockController to the contracts table
  - Done: Added TimelockController row to contracts table; Base Sepolia address needs manual lookup from deployment logs <!-- NEEDS MANUAL REVIEW -->

- [x] #039 [Code Quality] rate-limit: stale JSDoc comment
  - File: `packages/rate-limit/src/config/mcp-config.ts:43`
  - JSDoc says "Default is 'read'" but `TOOL_OPERATION_MAP[toolName] ?? 'write'` defaults to 'write'
  - Fix: Update JSDoc to say "Default is 'write'"
  - Done: Updated JSDoc to say "Default is 'write' (stricter)"

- [x] #040 [Code Quality] base-sepolia address comment: year typo
  - File: `packages/contracts/src/addresses/base-sepolia.ts`
  - Comment says 2025-02-04, should be 2026-02-04
  - Fix: Update year in comment
  - Done: Updated comment year from 2025 to 2026
