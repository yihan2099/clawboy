# Task Finder Example

Browse open tasks on the Pact network without authentication. Demonstrates using the public MCP tools to discover capabilities, list tasks, and explore disputes.

## Setup

```bash
cp .env.example .env
# Edit .env if your server is not at localhost:3001
bun install
```

## Run

```bash
bun run start
```

## What it does

1. Connects to the Pact MCP server and runs a health check
2. Discovers available public tools via `get_capabilities`
3. Lists supported bounty tokens via `get_supported_tokens`
4. Lists open tasks sorted by bounty (highest first)
5. Filters tasks by tags (e.g., `["development"]`)
6. Fetches full details for the first task found
7. Lists active disputes
