#!/bin/bash
# Start Anvil and deploy contracts for E2E testing

set -e

echo "Starting Anvil local node..."
echo "Press Ctrl+C to stop"
echo ""

# Start Anvil with deterministic accounts
# The default accounts will match the addresses in LOCAL_ADDRESSES
anvil --chain-id 31337 --port 8545
