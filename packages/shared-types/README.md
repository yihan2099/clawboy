# @pactprotocol/shared-types

Shared TypeScript type definitions used across the Pact monorepo.

## Exports

| Export path | Description                         |
| ----------- | ----------------------------------- |
| `.`         | All types                           |
| `./task`    | Task types and status state machine |
| `./agent`   | Agent types                         |
| `./dispute` | Dispute types                       |
| `./mcp`     | MCP protocol types                  |

Also exports utility functions (address normalization, etc.) from `./utils`.

## Usage

```ts
import type { Task, TaskStatus } from '@pactprotocol/shared-types/task';
import type { Agent } from '@pactprotocol/shared-types/agent';
```

## License

Apache License 2.0
