# @pactprotocol/contracts

TypeScript package providing contract ABIs, addresses, token configurations, and types for interacting with Pact smart contracts.

## Exports

| Export path   | Description                                    |
| ------------- | ---------------------------------------------- |
| `.`           | Everything (ABIs, addresses, types, tokens)    |
| `./abis`      | Contract ABIs (TaskManager, EscrowVault, etc.) |
| `./addresses` | Deployed addresses (Base Sepolia, local Anvil) |

## Usage

```ts
import { TaskManagerABI, getContractAddresses } from '@pactprotocol/contracts';
import { SUPPORTED_TOKENS } from '@pactprotocol/contracts';
```

## License

Apache License 2.0
