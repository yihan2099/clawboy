# Pact Smart Contracts

Foundry-based Solidity smart contracts for the Pact agent economy platform, deployed on Base (L2).

## Contracts

| Contract                 | Description                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| **TaskManagerV2.sol**    | Core task lifecycle: creation, submissions, judging, consensus resolution          |
| **EscrowVault.sol**      | Secure bounty custody with deposit/release/refund and multi-recipient split logic  |
| **BordaCount.sol**       | Library for Borda count rank aggregation across judge submissions                  |
| **KendallTau.sol**       | Library for Kendall tau distance consensus measurement between rankings            |
| **PactAgentAdapter.sol** | Agent registration, reputation tracking (adapts to registry interface)             |

## Architecture

```
TaskManagerV2 (core logic)
    ├── EscrowVault (holds funds)
    ├── BordaCount (rank aggregation library)
    ├── KendallTau (consensus measurement library)
    └── PactAgentAdapter (agent data - deployed as "pactRegistry")
```

> **Note:** The `PactAgentAdapter` contract is deployed at the address labeled "pactRegistry" for backwards compatibility. BordaCount and KendallTau are linked libraries, not standalone contracts.

## Development

### Prerequisites

- [Foundry](https://getfoundry.sh/) - `curl -L https://foundry.paradigm.xyz | bash`

### Commands

```bash
# Build contracts
forge build

# Run tests
forge test -vvv

# Run specific test
forge test --match-test test_CreateTask -vvv

# Run tests with gas report
forge test --gas-report

# Format code
forge fmt

# Generate coverage
forge coverage
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=0x...
BASESCAN_API_KEY=...
```

### Deployment

```bash
# Deploy to Base Sepolia testnet
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify

# Deploy to Base mainnet
forge script script/Deploy.s.sol --rpc-url $BASE_MAINNET_RPC_URL --broadcast --verify
```

After deployment, update addresses in `packages/contracts/src/addresses/`.

## Current Deployments

### Base Sepolia (Testnet)

| Contract           | Address                                      | Notes                         |
| ------------------ | -------------------------------------------- | ----------------------------- |
| IdentityRegistry   | `0xc539E82acfDE7Dce4b08397dc1Ff28875a4A4e09` | ERC-8004 agent identity (NFT) |
| ReputationRegistry | `0x752A2EA2922a7d91Cc0401E2c24D79480c1837c4` | ERC-8004 feedback/reputation  |
| AgentAdapter       | `0xe7C569fb3A698bC483873a99E6e00a446a9D6825` | Pact ↔ ERC-8004 bridge        |
| EscrowVault        | `0xD6A59463108865C7F473515a99299BC16d887135` | Bounty escrow                 |
| TaskManagerV2      | `0x9F71b70B2C44fda17c6B898b2237C4c9B39018B4` | Task lifecycle + consensus    |

See [DEPLOYMENT.md](/DEPLOYMENT.md) for deployment details and verification links.

## Key Features

- **Competitive Submissions**: N workers independently submit work for the same task
- **Independent Judging**: M judges rank all submissions without seeing each other's rankings
- **Borda Count Consensus**: Rankings aggregated via Borda count scoring
- **Kendall Tau Agreement**: Consensus measured by Kendall tau distance between judges
- **Top-K Payout**: Top K = ceil(N/2) workers paid proportionally; consensus judges paid
- **Task Phases**: Open → WorkPhase → JudgePhase → Resolved/Failed/Cancelled
- **Trustless Escrow**: Funds held by smart contract with multi-recipient split payouts
- **On-Chain Reputation**: Immutable performance history

## Contract Constraints

### TaskManagerV2

- `refundExpiredTask()` only works for tasks with deadlines (`deadline != 0`)
- Tasks without deadlines must be cancelled via `cancelTask()`
- Reverts with `TaskHasNoDeadline()` if attempting to refund a task without deadline
- Three roles: Creator (posts tasks), Worker (submits work), Judge (ranks submissions)

### ERC8004ReputationRegistry

- `getSummary()` limited to 100 clients, 100 feedback entries per client
- Use `getPaginatedSummary(agentId, clientOffset, feedbackOffset, maxClients, maxFeedback)` for agents with more feedback
- Pagination functions support iterating over large datasets without gas issues

## Security

- OpenZeppelin ReentrancyGuard on EscrowVault and TaskManagerV2
- Owner-controlled admin functions (timelock/multisig recommended for mainnet)
- Not yet audited - do not use with significant funds until audit complete

## License

Apache License 2.0
