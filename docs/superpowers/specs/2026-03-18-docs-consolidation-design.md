# Docs Consolidation & Polish Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Overview

Consolidate pact-internal into pact, rewrite key docs to world-class level, move business/roadmap to Notion, delete boilerplate, archive pact-internal repo.

## Steps

### Step 1: Rewrite DESIGN.md

Replace current 136-line DESIGN.md with the approved rewrite:

- Opening hook (what Pact solves, for both investors and engineers)
- P1-P12 propositions with cleaned-up tables (P8 shortened, nuance in prose)
- N+M consensus model (keep existing diagram)
- Concrete example (Alice posts a code review task)
- Roles table, consensus algorithm
- Protocol evolution (3 eras)
- What Persists section (escrow, identity, reputation, routing — the endgame)
- Anti-gaming analysis (unchanged, minor formatting cleanup)

### Step 2: Expand SECURITY.md with threat model

Merge pact-internal/THREAT_MODEL.md into pact/SECURITY.md. The current SECURITY.md is 89 lines (basic vulnerability reporting policy). Expand it with:

- Attack vectors table (all mitigations, severity, status)
- V2 N+M threat model (T1-T12 with eliminated and new threats)
- T7 and T8 deep dives (collusion, copycat)
- Emergency bypass governance rules
- Security mechanisms (pausable, emergency refund, timelock, two-step ownership)
- Production security checklist
- Security configuration

Keep the existing vulnerability reporting section at the top. Append the threat model content below it.

### Step 3: File open DESIGN_ISSUES as GitHub issues

Create GitHub issues for the 15 open items from pact-internal/DESIGN_ISSUES.md:

**Infrastructure (3):**
- Single contract checkpoint in indexer
- Staleness indicators missing in MCP responses
- Sequential event processing in indexer

**Testing gaps (12):**
- Work deadline expiration tests
- Judge deadline expiration tests
- Webhook delivery E2E tests
- IPFS failure tests
- Concurrent action tests
- Borda count edge case tests
- Kendall tau threshold validation tests
- EscrowVault.releaseSplit edge cases
- Judge-cannot-be-worker enforcement test
- Consensus lifecycle E2E test
- Redis rate limit behavior tests
- Chain reorg handling tests

Label: `testing-gap` for test items, `infrastructure` for infra items. All labeled `priority:low` (none are blocking).

Drop all 22 resolved items — they're history.

### Step 4: Update CLAUDE.md

Remove references to pact-internal. Remove ERC-8183 references (already done in code, ensure CLAUDE.md is clean). Add mention of the new CLI package. Ensure the architecture section and contract list reflect current state.

### Step 5: Polish README.md

Current README is solid (363 lines). Polish:

- Update contract addresses if stale
- Ensure the mermaid diagram doesn't reference removed contracts
- Add CLI to the "Install" section as a third option
- Remove any ERC-8183 references (badge already removed)
- Tighten prose — cut filler words

### Step 6: Create Notion page for business + roadmap

Create a new Notion page (separate from the 2026 planner) with:

- Competitive landscape (from BUSINESS.md)
- Monetization phases 1-4 (from BUSINESS.md)
- Revenue projections and cost analysis (from BUSINESS.md)
- Post-mainnet priority roadmap (from ROADMAP.md)
- V2 milestones (from ROADMAP.md, marked complete)

Title: "Pact Strategy & Roadmap"

### Step 7: Delete boilerplate

- Delete `CODE_OF_CONDUCT.md` — boilerplate, no contributors
- Delete `CHANGELOG.md` — 100 lines, not maintained, nobody reads it
- Trim unnecessary package READMEs — packages with no external consumers don't need docs

### Step 8: Archive pact-internal

- Archive the repo on GitHub (Settings → Archive)
- Remove local directory: `rm -rf ~/projects/pact-internal`
- Update ~/projects/CLAUDE.md to remove pact-internal references
- Update memory (MEMORY.md) if it references pact-internal

## Non-Goals

- Rewriting package READMEs for internal packages (no external consumers)
- Landing page / frontend changes (separate project)
- Writing new docs that don't exist yet (operations runbook, etc.)

## Success Criteria

- DESIGN.md reads well for both investors and engineers
- SECURITY.md is the single source of truth for security
- No content lives in two places
- pact-internal repo archived
- Business/roadmap content accessible in Notion
- Zero boilerplate files with no readers
