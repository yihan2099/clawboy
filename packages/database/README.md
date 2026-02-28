# @pactprotocol/database

Supabase client and query functions for Pact. Provides typed database access for tasks, agents, submissions, disputes, sync state, and event processing.

## Exports

| Export path | Description                                                                          |
| ----------- | ------------------------------------------------------------------------------------ |
| `.`         | Client, schema types, and all queries                                                |
| `./client`  | Supabase client factory                                                              |
| `./queries` | Query modules (tasks, agents, disputes, submissions, sync state, events, statistics) |

## Environment Variables

### Standard Client (`getSupabaseClient`)

| Variable                  | Required | Description                                          |
| ------------------------- | -------- | ---------------------------------------------------- |
| `SUPABASE_URL`            | Yes      | Supabase project URL                                 |
| `SUPABASE_PUBLISHABLE_KEY`| Yes      | Supabase anon/publishable key                        |
| `SUPABASE_ANON_KEY`       | No       | Legacy fallback for `SUPABASE_PUBLISHABLE_KEY`       |

### Admin Client (`getSupabaseAdminClient`)

| Variable                  | Required | Description                                          |
| ------------------------- | -------- | ---------------------------------------------------- |
| `SUPABASE_URL`            | Yes      | Supabase project URL                                 |
| `SUPABASE_SECRET_KEY`     | Yes      | Supabase service role key (bypasses RLS)             |
| `SUPABASE_SERVICE_ROLE_KEY`| No      | Legacy fallback for `SUPABASE_SECRET_KEY`            |

## Usage

```ts
import { getSupabaseClient } from '@pactprotocol/database/client';
import { getTaskById, listTasks } from '@pactprotocol/database/queries';
```

## License

Apache License 2.0
