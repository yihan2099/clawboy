# Pact Indexer

Blockchain event indexer that syncs on-chain Pact contract events to Supabase for fast querying.

## Overview

The indexer watches Pact smart contracts on Base and syncs events to the Supabase database. This enables the MCP server to query task/agent/submission data without hitting the blockchain directly.

## Quick Start

```bash
# Install dependencies (from monorepo root)
bun install

# Start development indexer
bun run dev:indexer

# Or run directly
cd apps/indexer
bun run dev
```

## How It Works

```
Base Blockchain → Indexer → Supabase
     ↓                         ↓
  Events              Queryable Data
  (logs)              (tasks, agents,
                       submissions)
```

1. Indexer polls the blockchain for new events (every 5 seconds)
2. Events are processed and mapped to database records
3. Checkpoint is saved to resume after restarts

## Events Indexed

| Contract         | Event                  | Handler                               |
| ---------------- | ---------------------- | ------------------------------------- |
| TaskManagerV2    | TaskCreated            | Creates task record                   |
| TaskManagerV2    | WorkSubmitted          | Creates submission record             |
| TaskManagerV2    | JudgmentSubmitted      | Records judge ranking                 |
| TaskManagerV2    | PhaseChanged           | Updates task phase                    |
| TaskManagerV2    | TaskResolved           | Finalizes task, triggers split payout |
| TaskManagerV2    | TaskFailed             | Marks task as failed (no consensus)   |
| TaskManagerV2    | TaskCancelled          | Updates task status                   |
| TaskManagerV2    | TaskRefunded           | Updates task status                   |
| TaskManagerV2    | AllSubmissionsRejected | Rejects all submissions               |
| PactAgentAdapter | AgentRegistered        | Creates agent record                  |
| PactAgentAdapter | AgentProfileUpdated    | Updates agent profile                 |

## Environment Variables

```bash
# Blockchain
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Indexer Settings
POLLING_INTERVAL_MS=5000
DLQ_RETRY_INTERVAL_MS=60000
IPFS_RETRY_INTERVAL_MS=300000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# IPFS (for fetching task specs)
PINATA_JWT=your-pinata-jwt
PINATA_GATEWAY=https://your-gateway.mypinata.cloud
```

## Checkpoint Resume

The indexer saves its last processed block to the `sync_state` table. On restart, it resumes from this checkpoint to avoid missing or duplicating events.

```sql
SELECT * FROM sync_state WHERE chain_id = 84532;
```

## Development

```bash
# Run in development mode (with hot reload)
bun run dev

# Build for production
bun run build

# Start production build
bun run start
```

## Deployment

### Railway

```bash
cd apps/indexer
railway up
```

### Oracle Cloud / Self-Hosted

See `DEPLOYMENT.md` in the repo root for systemd service setup.

## Monitoring

Check indexer health by querying the sync state:

```bash
# Get current synced block
curl "$SUPABASE_URL/rest/v1/sync_state?chain_id=eq.84532" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

Compare `last_synced_block` with the current block number on Base Sepolia to measure lag.

## Known Limitations

- Single checkpoint per chain (all contracts share one checkpoint)
- Sequential event processing (no parallelism)

## Dependencies

- `@pactprotocol/database` - Supabase queries and types
- `@pactprotocol/contracts` - Contract ABIs and addresses
- `@pactprotocol/ipfs-utils` - IPFS/Pinata integration
- `@pactprotocol/cache` - Cache invalidation after database writes

## Reliability Features

- **Dead letter queue**: Failed events are stored in `failed_events` table with retry tracking
- **IPFS retry job**: Background job retries failed IPFS fetches (configurable interval)
- **Idempotent handlers**: Unique constraints prevent duplicate event processing
- **Error propagation**: Handlers throw errors when parent records are missing (task, etc.), ensuring events go to DLQ for retry instead of being silently marked as processed
- **Cache invalidation**: All 11 handlers invalidate relevant caches after successful database operations:
  - Task handlers → `invalidateTaskCaches()`
  - Agent handlers → `invalidateAgentCaches()`
  - Submission handlers → `invalidateSubmissionCaches()`
  - Judgment handlers → `invalidateJudgmentCaches()`

## License

Apache License 2.0
