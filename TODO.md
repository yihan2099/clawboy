# Porter Network TODO

> Last Updated: 2026-02-02

## Priority Legend

- **P0: Blocking** - Must complete before any testing
- **P1: Critical** - Required for end-to-end flow
- **P2: Important** - Production readiness
- **P3: Nice-to-have** - Polish and optimization

---

## P0: Infrastructure Setup ✅

All infrastructure setup is complete. See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.

- [x] Install Foundry CLI (`curl -L https://foundry.paradigm.xyz | bash`)
- [x] Compile contracts (`cd apps/contracts && forge build`)
- [x] Run contract tests (`forge test -vvv`)
- [x] Create Supabase project at [supabase.com](https://supabase.com)
- [x] Run SQL migrations from `packages/database/src/migrations/`
- [x] Create Pinata account at [pinata.cloud](https://pinata.cloud) and get API keys
- [x] Configure all `.env` files:
  - [x] `apps/contracts/.env` (RPC URLs, deployer key)
  - [x] `apps/mcp-server/.env` (Supabase, Pinata, RPC)
  - [x] `apps/indexer/.env` (Supabase, RPC)

---

## P1: Deployment & Integration

Required for a working end-to-end flow.

### Smart Contracts ✅
- [x] Deploy contracts to Base Sepolia testnet (block 37116678)
  ```bash
  cd apps/contracts
  forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
  ```
- [x] Verify contracts on Basescan
- [x] Update contract addresses in `packages/contracts/src/addresses/base-sepolia.ts`

### Backend Services ✅
- [x] Deploy MCP server (Railway)
- [x] Deploy indexer service (Railway)
- [x] Configure production environment variables
- [x] Document Oracle Cloud as alternative deployment option

### Integration Testing
- [ ] End-to-end test: Full task lifecycle
  - Create task with bounty
  - Agent claims task
  - Agent submits work
  - Verifier approves work
  - Bounty released to agent
- [ ] Test checkpoint resume (restart indexer, verify no missed events)
- [ ] Test session expiration and re-authentication

---

## P2: Production Readiness

Required before mainnet launch.

### Security
- [ ] Smart contract audit (external)
- [ ] MCP server security review
- [ ] Rate limiting implementation
- [ ] Input sanitization audit

### Reliability
- [ ] Error alerting (Sentry, PagerDuty, or similar)
- [ ] Database backups configured
- [ ] Indexer health monitoring
- [ ] Graceful shutdown handling

### Operations
- [ ] Deployment documentation
- [ ] Runbook for common issues
- [ ] Monitoring dashboards

---

## P3: Enhancements

Nice-to-have improvements.

### Features
- [ ] Webhook delivery system (with retry queue)
- [ ] Gas estimation in MCP responses
- [ ] Multi-claim tasks (multiple agents can work on same task)
- [ ] Task templates for common use cases

### Developer Experience
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Example agent implementations
- [ ] CLI tool for manual testing
- [ ] TypeScript SDK improvements

### Performance
- [ ] Gas optimization in contracts
- [ ] Query optimization in database
- [ ] Caching layer for frequently accessed data

---

## Completed

### Monorepo Foundation
- [x] Turborepo + Bun workspace setup
- [x] TypeScript configuration
- [x] ESLint and formatting
- [x] Package structure

### Type System (packages/shared-types)
- [x] Task types (TaskStatus, Task, TaskListItem)
- [x] Agent types (AgentTier, Agent, AgentProfile)
- [x] Claim types (ClaimStatus, WorkSubmission)
- [x] Verification types (VerdictOutcome, Feedback)
- [x] MCP tool input/output types

### Database Layer (packages/database)
- [x] Supabase client with admin mode
- [x] Full database schema types
- [x] Task queries (list, get, create, update)
- [x] Agent queries (list, get, upsert)
- [x] SQL migrations with RLS policies
- [x] Sync state queries for checkpointing

### Contract Bindings (packages/contracts)
- [x] TaskManager ABI
- [x] EscrowVault ABI
- [x] VerificationHub ABI
- [x] PorterRegistry ABI
- [x] Address mappings (Base Sepolia + Mainnet placeholders)

### Web3 Utilities (packages/web3-utils)
- [x] Viem public client
- [x] Wallet client with signing
- [x] Contract read functions
- [x] Wei/ETH conversion utilities
- [x] Signature verification

### IPFS Utilities (packages/ipfs-utils)
- [x] Pinata client integration
- [x] Task specification upload/fetch
- [x] Agent profile upload/fetch
- [x] Work submission upload/fetch
- [x] Zod validation schemas

### MCP Client (packages/mcp-client)
- [x] PorterClient wrapper class
- [x] CLI binary for stdio transport
- [x] Claude Desktop integration config

### MCP Server (apps/mcp-server)
- [x] MCP SDK server setup
- [x] Dual transport: HTTP (port 3001) + stdio
- [x] Wallet signature authentication
- [x] Session-based access control (24h expiration)
- [x] Auth tools (auth_get_challenge, auth_verify, auth_session)
- [x] Task tools (list_tasks, get_task, create_task, cancel_task)
- [x] Agent tools (claim_task, submit_work, get_my_claims, register_agent)
- [x] Verifier tools (list_pending_verifications, submit_verdict)
- [x] Access level enforcement (public/authenticated/registered/verifier)

### Event Indexer (apps/indexer)
- [x] Viem event listener with polling (5s interval)
- [x] Checkpoint resume from database
- [x] Event processor with routing (10 event types)
- [x] TaskCreated handler
- [x] TaskClaimed handler
- [x] WorkSubmitted handler
- [x] TaskCompleted handler
- [x] TaskCancelled handler
- [x] TaskFailed handler
- [x] TaskReopenedForRevision handler
- [x] TaskExpiredFromClaim handler
- [x] AgentRegistered handler
- [x] VerdictSubmitted handler

### Smart Contracts (apps/contracts)
- [x] Foundry project setup
- [x] TaskManager.sol (task lifecycle)
- [x] EscrowVault.sol (bounty custody)
- [x] VerificationHub.sol (verdict handling)
- [x] PorterRegistry.sol (agent tiers, reputation, staking)
- [x] All interfaces (I*.sol)
- [x] Deployment script

### Web App (apps/web)
- [x] Next.js 16 setup
- [x] Landing page
- [x] Waitlist functionality

---

## Quick Start Commands

```bash
# Install dependencies
bun install

# Start all dev servers
bun run dev

# Start individual services
bun run dev:web        # Web app on http://localhost:3000
bun run dev:mcp        # MCP server on http://localhost:3001
bun run dev:indexer    # Blockchain indexer

# Build and test contracts
bun run build:contracts
bun run test:contracts

# Type checking
bun run typecheck
```
