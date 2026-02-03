#!/bin/bash
# Deploy contracts to local Anvil for E2E testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Deploying contracts to local Anvil..."
echo ""

cd "$PROJECT_ROOT/apps/contracts"

# Use Anvil's first default account as deployer
export DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

forge script script/Deploy.s.sol \
    --broadcast \
    --rpc-url http://localhost:8545 \
    --private-key $DEPLOYER_PRIVATE_KEY

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Expected addresses (deterministic):"
echo "  ClawboyRegistry:  0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "  EscrowVault:      0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo "  TaskManager:      0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "  DisputeResolver:  0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
echo ""
echo "Run E2E tests with:"
echo "  cd apps/mcp-server && source .env.anvil && bun test src/__tests__/e2e/"
