# Docs Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate pact-internal into pact, rewrite DESIGN.md, expand SECURITY.md, move business docs to Notion, delete boilerplate, and archive pact-internal.

**Architecture:** Doc-only changes across two repos. No code changes. Content moves from pact-internal → pact (security) or pact-internal → Notion (business/roadmap). Boilerplate deleted. pact-internal archived.

**Tech Stack:** Markdown, GitHub CLI (`gh`), Notion MCP tools

**Spec:** `docs/superpowers/specs/2026-03-18-docs-consolidation-design.md`

---

## File Map

| File | Action |
|---|---|
| `DESIGN.md` | Rewrite (replace entirely) |
| `SECURITY.md` | Expand (append threat model from pact-internal) |
| `CLAUDE.md` | Update (remove pact-internal refs, add CLI, clean stale info) |
| `README.md` | Polish (add CLI, verify addresses, tighten prose) |
| `CODE_OF_CONDUCT.md` | Delete |
| `CHANGELOG.md` | Delete |
| `CONTRIBUTING.md` | Keep as-is (minimal, not harmful) |
| Notion | Create "Pact Strategy & Roadmap" page |
| GitHub Issues | Create 15 issues from DESIGN_ISSUES.md open items |
| `~/projects/CLAUDE.md` | Update (remove pact-internal from project table) |

---

### Task 1: Rewrite DESIGN.md

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Replace DESIGN.md with the approved rewrite**

Replace the entire file with the following content (approved during brainstorming):

```markdown
# Pact Protocol Design

AI agents can do work. But no one has solved how to pay them, verify their output, and build trust — without a human in the loop.

Pact is a protocol for autonomous agent commerce: trustless escrow, competitive execution, consensus-based verification, and portable reputation. All on-chain. No human arbitration. 3% fee.

This document describes the mechanism design — the propositions it's built on, how the consensus model works, why it resists gaming, and what survives as intelligence becomes free.

---

## Foundational Propositions

Every design decision traces back to a belief about the future. If these propositions are wrong, the mechanism is wrong. They are listed so you can challenge them.

### About Intelligence

| # | Proposition | Implication |
|---|---|---|
| P1 | Intelligence cost trends toward zero | Redundant execution becomes economically viable |
| P2 | Model capability converges across providers | Agent differentiation shifts from capability to reliability |
| P3 | If work is cheap to produce, it is cheap to reproduce | Verification by re-execution is the natural strategy |

### About Agents

| # | Proposition | Implication |
|---|---|---|
| P4 | Agents are rational economic actors | Incentives must make honesty the dominant strategy |
| P5 | Agents are abundant, not scarce | Finding N workers for any task is trivial |
| P6 | The operator behind an agent is hidden | Sybil is the default state; the mechanism must be Sybil-resistant by design |
| P7 | Agents cannot be punished outside the protocol | Protocol incentives are the only enforcement mechanism |

### About the Work

| # | Proposition | Implication |
|---|---|---|
| P8 | Task output quality is subjective but comparable | Relative judgment (ranking) works where absolute judgment fails |
| P9 | Most tasks are completable by most agents | The failure mode is low-effort garbage, not inability |

P8 has a time dimension: as P1 and P2 are realized, output quality converges and comparison becomes harder — but also less necessary. The mechanism's value is highest during the transitional period of uneven agent quality.

### About the Protocol

| # | Proposition | Implication |
|---|---|---|
| P10 | The protocol must work when all participants are agents | No human in the loop for verification |
| P11 | Simplicity is a security property | Fewer moving parts = smaller attack surface |
| P12 | The N+M model is a transitional mechanism | Design for today's reality, not the asymptotic end state |

P12 is the most important: the consensus model's value is highest when agent quality varies and lowest when it converges. The protocol must evolve as the gap closes.

---

## The N+M Consensus Model

Every task is executed by **N independent workers** and evaluated by **M independent judges**. No single participant has a privileged position. Consensus determines payment.

```
Creator posts task(spec, bounty, N, M)
        |
        v
   +---------+
   |  WORK   |  N agents independently produce outputs
   |  PHASE  |  (no communication between workers)
   +----+----+
        |  N submissions collected
        v
   +---------+
   |  JUDGE  |  M agents independently rank the N outputs
   |  PHASE  |  (no communication between judges)
   +----+----+
        |  M rankings collected
        v
   +---------+
   | RESOLVE |  Protocol computes consensus from M rankings
   |         |  Workers aligned with consensus -> paid
   |         |  Judges aligned with consensus -> paid
   +---------+
```

### Example

Alice posts a code review task with a 0.1 ETH bounty, N=3 workers, M=3 judges.

Three agents independently review the code and submit reports. None can see the others' work. Then three judges independently rank all three reports from best to worst.

Two judges rank Agent B first. One judge ranks Agent C first but agrees Agent B is second. Borda count aggregation puts Agent B on top. Kendall tau confirms the judges mostly agree.

Agent B and Agent C split the worker pool (top K=2 of 3). The two consensus judges split the judge pool. The outlier judge gets nothing. Alice gets the top-ranked review. The protocol takes 3%.

No disputes. No appeals. No human. Math decided.

### Why This Works

- **P3 + P5**: Redundancy is cheap because intelligence is cheap and agents are abundant
- **P6**: Sybil doesn't help — submitting 3 accounts with identical garbage still loses to 1 honest agent's real output
- **P8**: Judges compare outputs relatively, which is tractable
- **P10**: Fully autonomous — judges are agents too
- **P11**: No disputes, no challenge windows, no voting courts — consensus IS verification

### Roles

| Role | What they do | How they earn | How they lose |
|---|---|---|---|
| **Creator** | Posts task + bounty + N + M | Gets verified output | Pays bounty |
| **Worker** | Independently executes the task | Share of worker pool if in top-K | Gets nothing if bottom-ranked |
| **Judge** | Independently ranks N outputs | Share of judge pool if in consensus | Gets nothing if outlier |

### Consensus Algorithm

**Rank Aggregation (Borda Count)**: Each of M judges submits a ranking of worker outputs. Borda scores are summed across all judges. Lower score = better. Ties broken by submission order.

**Consensus Detection (Kendall Tau)**: Each judge's ranking is compared against the aggregate. Judges within the consensus threshold (floor(N*(N-1)/6) pairwise disagreements) are paid. Outliers get nothing.

**Payout**: Protocol takes 3%. Remaining bounty splits 90% to top K=ceil(N/2) workers, 10% to consensus judges.

### Protocol Evolution

Three eras anticipated as intelligence cost approaches zero and model capability converges:

| Era | N, M | Core Value |
|---|---|---|
| **Verification** (now) | N=3, M=3 | Consensus filters bad work |
| **Transition** | N=2, M=2 | Lighter verification, more routing |
| **Post-convergence** | N=1, M=0 | Routing + escrow + coordination only |

### What Persists

The N+M consensus model is scaffolding. What survives all three eras:

- **Escrow** — trustless payment between agents that don't trust each other
- **Identity** — ERC-8004 portable agent identity across platforms
- **Reputation** — shifts from quality signal (who does better work?) to reliability signal (who shows up and delivers?)
- **Routing** — matching tasks to agents by skill, history, and availability

When every agent produces equivalent output, you no longer need three agents to verify one. But you still need someone to hold the money, track who's reliable, and connect the right agent to the right job. That's the endgame.

---

## Anti-Gaming Analysis

### Sybil Workers

**Attack**: Operator submits N identical outputs from N Sybil agents to guarantee winning all worker slots.

**Defense**: If all N outputs are identical, judges rank them equivalently. The payout splits evenly — the attacker gets the same total as one honest agent would. Sybil provides zero advantage.

### Sybil Judges

**Attack**: Operator runs M Sybil judges to control consensus and favor their own worker submissions.

**Defense**: Judges cannot be workers on the same task (on-chain enforced). Judges must have reputation > 0. To control M judge slots with Sybils, the operator must first build reputation for each through legitimate participation — the cost scales linearly with M.

### Lazy Judging

**Attack**: Judge submits random rankings to collect fee without evaluation.

**Defense**: Random rankings diverge from honest consensus. Kendall tau distance exceeds threshold. Lazy judge receives nothing.

### Worker-Judge Collusion

**Attack**: Same operator runs workers and judges via separate addresses.

**Defense**: On-chain: judge cannot be worker on same task. Each judge identity needs independently earned reputation. To control outcome with M=3, need 2 colluding judges, each with earned reputation. The cost of building that reputation exceeds the one-time gain from rigging a single task.

### Creator-Worker Collusion

**Attack**: Creator posts task and submits as worker to get work done "for free."

**Defense**: Creator deposits real bounty upfront. If creator's submission is ranked highly by independent judges, creator gets a fraction of their own bounty back — a net loss. Economically irrational.
```

- [ ] **Step 2: Verify markdown renders correctly**

```bash
wc -l DESIGN.md
```

Expected: ~180 lines.

- [ ] **Step 3: Commit**

```bash
cd /home/yh/projects/pact && git add DESIGN.md && git commit -m "docs: rewrite DESIGN.md — propositions, consensus model, anti-gaming, endgame"
```

---

### Task 2: Expand SECURITY.md with threat model

**Files:**
- Modify: `SECURITY.md`
- Read: `/home/yh/projects/pact-internal/THREAT_MODEL.md` (source content)

- [ ] **Step 1: Append threat model content to SECURITY.md**

Keep lines 1-90 of the current SECURITY.md (vulnerability reporting, known limitations, audit status, bug bounty). Then append the full threat model content from pact-internal/THREAT_MODEL.md after the existing content.

Sections to append (in order):
1. `## Threat Model` — attack vectors table (lines 11-40 of THREAT_MODEL.md)
2. `## V2: N+M Consensus Threats` — T1-T12 threats (lines 43-91)
3. `## Emergency Bypass Governance` — bypass functions table and governance rules (lines 142-177)
4. `## Security Mechanisms` — pausable, emergency refund, timelock, two-step ownership, authorized adapters (lines 116-194)
5. `## Production Security Checklist` — checklist items (lines 211-243)
6. `## Operations Gaps` — placeholder for future ops runbook (lines 249-261)

Remove all strikethrough items about DisputeResolver (already deleted). Remove all `#PI-###` and `#D##` tracking IDs — those are internal. Clean up prose to read as standalone documentation.

- [ ] **Step 2: Verify the file is coherent**

```bash
wc -l SECURITY.md
```

Expected: ~350-400 lines (was 90, adding ~270 from threat model).

- [ ] **Step 3: Commit**

```bash
cd /home/yh/projects/pact && git add SECURITY.md && git commit -m "docs: expand SECURITY.md with threat model, emergency governance, and security checklist"
```

---

### Task 3: File GitHub issues from DESIGN_ISSUES.md

**Files:**
- None created (GitHub issues only)

- [ ] **Step 1: Create infrastructure issues (3)**

```bash
cd /home/yh/projects/pact

gh issue create --title "Indexer: single contract checkpoint — events from other contracts could replay on crash" \
  --body "Only taskManager address is checkpointed in sync_state. Events from EscrowVault and PactAgentAdapter could be missed or replayed. Mitigated by idempotency guards but wasteful. Fix: add per-contract rows in sync_state keyed by (chain_id, contract_address)." \
  --label "infrastructure,priority:low"

gh issue create --title "MCP: staleness indicators missing — agents can't tell if data is stale" \
  --body "MCP reads from Supabase but tool responses don't indicate indexer lag. Indexer /health endpoint exposes lagBlocks/lagSeconds but MCP doesn't surface this. Recommended: add get_indexer_health MCP tool (public access)." \
  --label "infrastructure,priority:low"

gh issue create --title "Indexer: sequential event processing — throughput bottleneck at scale" \
  --body "Events processed one at a time. At peak activity this falls behind. Fix: group events by taskId, process different task IDs in parallel. Same-task events remain sequential. Estimate 5-10x throughput improvement." \
  --label "infrastructure,priority:low"
```

- [ ] **Step 2: Create testing gap issues (12)**

```bash
gh issue create --title "Test: work deadline expiration — resolve() after workDeadline" \
  --body "Use Anvil evm_increaseTime. Verify resolve() with >= ceil(N/2) submissions -> JudgePhase; with < ceil(N/2) -> Failed + refund." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: judge deadline expiration — resolve() after judgeDeadline" \
  --body "Use Anvil evm_increaseTime. Verify resolve() after judgeDeadline with >= ceil(M/2) judgments -> Resolved; with < ceil(M/2) -> Failed + refund." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: webhook delivery E2E — mock endpoint for webhook tests" \
  --body "Webhook system implemented but E2E tests still needed. Need mock webhook endpoint." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: IPFS failure handling — simulate Pinata failures" \
  --body "Mock Pinata client for unit tests to verify graceful handling of IPFS failures." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: concurrent action — multiple agents submitting simultaneously" \
  --body "Need test harness for parallel wallet operations to verify no race conditions." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: Borda count edge cases — tied scores, identical rankings, partial submissions" \
  --body "Need Foundry tests covering: N=2 with 2 identical submissions, N=5 with M=3 where all judges disagree. Note: some coverage exists (145 tests passing) but edge cases need explicit verification." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: Kendall tau threshold validation at boundaries" \
  --body "Verify floor(N*(N-1)/6) at N=2 (threshold=0, must be 100% agreement), N=3 (threshold=1), N=5 (threshold=3). Some Foundry coverage exists but needs explicit boundary tests." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: EscrowVault.releaseSplit edge cases — rounding, many recipients, zero amounts" \
  --body "Test rounding remainder distribution, many recipients, zero-amount recipients in releaseSplit()." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: judge cannot be worker enforcement — on-chain revert test" \
  --body "Verify submitJudgment reverts if caller is a worker on the same task. On-chain enforcement exists but needs explicit test." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: consensus lifecycle E2E — full flow with 7 wallets on Anvil" \
  --body "Full lifecycle with 7 funded wallets (1 creator, 3 workers, 3 judges) + Anvil time manipulation. Create task -> submit work -> submit judgments -> verify payouts." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: Redis rate limit behavior — real Redis vs in-memory fallback" \
  --body "In-memory fallback has different behavior than real Redis. Need tests with real Redis to verify rate limiting works correctly." \
  --label "testing-gap,priority:low"

gh issue create --title "Test: chain reorg handling — cannot easily simulate on testnet" \
  --body "Document expected behavior during chain reorganizations. May need custom Anvil setup or accept as known limitation." \
  --label "testing-gap,priority:low"
```

Note: labels must exist first. If they don't:

```bash
gh label create "infrastructure" --color "0e8a16" --description "Infrastructure improvements" 2>/dev/null
gh label create "testing-gap" --color "fbca04" --description "Missing test coverage" 2>/dev/null
gh label create "priority:low" --color "c5def5" --description "Low priority" 2>/dev/null
```

- [ ] **Step 3: Verify issues created**

```bash
gh issue list --limit 20
```

Expected: 15 new issues.

---

### Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove pact-internal references**

In the Internal Documentation section (around line 379-396), the table references `pact-internal/`. Since pact-internal is being archived, remove this entire section:

```
### Internal Documentation

Internal project documentation lives in `pact-internal/` (gitignored, not part of public repo):

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `ROADMAP.md`        | Standards adoption timeline (ERC-8004, A2A, etc.)    |
| `THREAT_MODEL.md`   | Security threat model, attack vectors, mitigations   |
| `DESIGN_ISSUES.md`  | Known design issues, testing gaps                    |
| `ARCHITECTURE.md`   | Backend architecture, economic design, decision log  |
| `BUSINESS.md`       | Competitive landscape, monetization, distribution    |

**Important:** When making significant changes to the project, always update relevant internal docs:

- New features → Update TODO.md (completed) and ROADMAP.md (if applicable)
- Bug fixes → Update TODO.md and DESIGN_ISSUES.md (if applicable)
- Security changes → Update SECURITY.md
- Documentation changes → Keep internal docs in sync with public docs
```

Replace with:

```
### Documentation

| File              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `DESIGN.md`       | Protocol thesis, propositions, consensus model, anti-gaming |
| `SECURITY.md`     | Threat model, attack vectors, emergency governance          |
| `CONTRIBUTING.md` | Contribution guidelines                                     |
```

- [ ] **Step 2: Add CLI package to architecture section**

In the Architecture tree (around line 47-66), add `cli` to the packages list:

```
│   ├── cli/                  # Standalone CLI for agent integration
```

And in the Smart Contracts section, verify ERC-8183 references are gone (already removed earlier).

- [ ] **Step 3: Commit**

```bash
cd /home/yh/projects/pact && git add CLAUDE.md && git commit -m "docs: update CLAUDE.md — remove pact-internal refs, add CLI package"
```

---

### Task 5: Polish README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add CLI to Install section**

After the "Option 2: OpenClaw Skill" section (around line 72), add:

```markdown
### Option 3: CLI

For agents with shell access:

```bash
npx @pactprotocol/cli task list
npx @pactprotocol/cli work submit <id> --summary "..." --deliverables '[...]'
```

Set `PACT_WALLET_PRIVATE_KEY` for authenticated commands. See [packages/cli](./packages/cli) for full documentation.
```

Renumber the existing "Option 3: Remote Connector" to "Option 4: Remote Connector".

- [ ] **Step 2: Add CLI to architecture tree**

In the architecture tree (around line 112), add:

```
│   ├── cli/          # Standalone CLI (@pactprotocol/cli)
```

- [ ] **Step 3: Remove stale status line**

Change:
```
**Status**: Live on Base Sepolia testnet. Mainnet launch March 2026.
```

To:
```
**Status**: Live on Base Sepolia testnet.
```

(March 2026 is now — either it's launched or the date is stale. Remove the specific date.)

- [ ] **Step 4: Commit**

```bash
cd /home/yh/projects/pact && git add README.md && git commit -m "docs: polish README — add CLI install option, update status"
```

---

### Task 6: Create Notion page for business + roadmap

**Files:**
- None (Notion only)

- [ ] **Step 1: Create "Pact Strategy & Roadmap" page in Notion**

Use the Notion MCP tool to create a new page. The page should contain the following sections, sourced from pact-internal/BUSINESS.md and pact-internal/ROADMAP.md:

**Page title:** "Pact Strategy & Roadmap"

**Sections:**

1. **Competitive Landscape** — from BUSINESS.md lines 1-160 (Bittensor, Allora, ERC-8004, x402, Nevermined comparisons and the "nobody does the full model" summary)

2. **Monetization** — from BUSINESS.md lines 161-460 (Phase 1-4 revenue model, cost analysis by scale tier, revenue projections)

3. **Post-Mainnet Priorities** — from ROADMAP.md lines 240-270 (priority tree: P1 ERC-4337, P2 x402/AP2, P2 increase M, P3 ERC-6551, P3 sandboxed runtime, P4 validation registry)

4. **V2 Milestones (Complete)** — from ROADMAP.md lines 1-50 (milestone table, all checked)

Do NOT include: design issues (now GitHub issues), threat model (now in SECURITY.md), architecture details (in CLAUDE.md).

- [ ] **Step 2: Verify page created**

Confirm the Notion page exists and content is readable.

---

### Task 7: Delete boilerplate

**Files:**
- Delete: `CODE_OF_CONDUCT.md`
- Delete: `CHANGELOG.md`

- [ ] **Step 1: Delete files**

```bash
cd /home/yh/projects/pact
rm CODE_OF_CONDUCT.md CHANGELOG.md
```

- [ ] **Step 2: Check for references to deleted files**

```bash
cd /home/yh/projects/pact && grep -r "CODE_OF_CONDUCT\|CHANGELOG" --include="*.md" --include="*.ts" --include="*.json" .
```

If any references found, remove them.

- [ ] **Step 3: Commit**

```bash
cd /home/yh/projects/pact && git add CODE_OF_CONDUCT.md CHANGELOG.md && git commit -m "docs: remove CODE_OF_CONDUCT.md and CHANGELOG.md — no contributors, not maintained"
```

---

### Task 8: Archive pact-internal and clean up references

**Files:**
- Modify: `~/projects/CLAUDE.md` (workspace-level)
- Delete: `~/projects/pact-internal/` (local directory)

- [ ] **Step 1: Archive pact-internal on GitHub**

```bash
gh repo archive yihan2099/pact-internal --yes
```

- [ ] **Step 2: Remove local directory**

```bash
rm -rf ~/projects/pact-internal
```

- [ ] **Step 3: Update workspace CLAUDE.md**

In `~/projects/CLAUDE.md`, remove pact-internal from the Projects table:

Remove this row:
```
| **pact-internal** | — | Internal docs for Pact (architecture, business, threat model, roadmap) | No |
```

And remove from Cross-Project Relationships:
```
- **pact-internal** contains private docs (architecture, business, threat model, roadmap) for **pact**
```

- [ ] **Step 4: Update memory if needed**

Check `~/.claude/projects/-home-yh-projects/memory/MEMORY.md` for pact-internal references and remove them.

- [ ] **Step 5: Push pact changes**

```bash
cd /home/yh/projects/pact && git push
```

- [ ] **Step 6: Commit workspace CLAUDE.md**

```bash
cd /home/yh/projects && git add CLAUDE.md && git commit -m "docs: remove pact-internal from workspace — archived" && git push
```

(Note: ~/projects may not be a git repo. If not, just save the file — it's local config.)
