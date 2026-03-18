# Frontend Redesign Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Overview

Full frontend redesign for pact/apps/web. Strip landing page to 3 sections, delete dead dispute pages, merge dashboard into tasks, fix stale content, use shadcn/ui as base.

## Design Foundation

- **Components:** shadcn/ui defaults — no custom buttons, cards, tables
- **Colors:** Keep existing OKLCH theme in globals.css (light + dark mode)
- **Typography:** Keep Zilla Slab (headings), Archivo (body), JetBrains Mono (code)
- **Spacing/Radius:** Keep shadcn defaults
- **Motion:** Remove AnimateOnScroll fade-ins. Instant rendering. Keep hover states.

## Landing Page (`/`)

Strip from 8 sections to 3:

### Hero Section
- "The protocol for agent value" headline (keep)
- Subtitle: use DESIGN.md opening copy ("trustless escrow, competitive execution, consensus-based verification, and portable reputation")
- Protocol badges: MCP, A2A, ERC-8004, USDC (keep)
- "Connect your agent via" badges: Claude Desktop, Claude Code, OpenClaw (keep)
- CTA: "Launch App" button + "View on GitHub" ghost button
- Right side: remove the live dashboard/feed (broken, depends on Supabase data). Replace with a clean code block showing the MCP config or CLI usage — something static that always works
- Remove: "Base Sepolia Testnet" badge at top (redundant with nav)

### Getting Started Section
- Keep the 3-step structure (wallet, tokens, connect)
- Fix stale content:
  - Package name: `@pact/mcp-client` → `@pactprotocol/mcp-client`
  - Package name: `@pact/pact-skill` → `@pactprotocol/pact-skill`
  - Remote URL: `https://mcp-server-production-f1fb.up.railway.app/mcp` → `https://pact.yihan.app/mcp`
- Add CLI tab alongside MCP Config, OpenClaw, Remote:
  ```
  npx @pactprotocol/cli task list
  ```

### Footer Section
- Keep newsletter signup
- Keep footer links (Protocol, Developers, Community)
- Add "Design" link to DESIGN.md on GitHub under Developers
- Fix copyright year if needed

### Delete these sections:
- ThesisSection — content now in DESIGN.md, link to it instead
- WhySection — 5 cards of marketing copy, not needed
- WorkflowsSection — "Three ways to use Pact" — not needed for zero users
- RolesSection — "How the protocol self-governs" — this is in DESIGN.md
- ArchitectureSection — "Architecture built for zero trust" — in README

### Delete these files:
- `components/landing/thesis-section.tsx`
- `components/landing/why-section.tsx`
- `components/landing/workflows-section.tsx`
- `components/landing/roles-section.tsx`
- `components/landing/architecture-section.tsx`
- `components/landing/animate-on-scroll.tsx`
- `components/landing/stats/badge-stats.tsx`
- `components/landing/stats/live-feed.tsx`
- `components/landing/stats/stats-section-skeleton.tsx`

## App Pages

### Delete `/disputes` (V2 removed disputes)
- Delete `app/(dashboard)/disputes/` directory entirely
- Remove "Disputes" from dashboard navigation

### Delete `/dashboard` as separate page
- Delete `app/(dashboard)/dashboard/` directory
- Merge stat cards (open tasks, in escrow, active agents) into the top of `/tasks` page as a compact header row
- Update navigation: remove "Dashboard" link, make "Tasks" the default/home for the app
- Update the dashboard layout's default redirect to go to `/tasks` instead of `/dashboard`

### Update `/tasks` page
- Add stat cards header row (from dashboard)
- Ensure task list shows phase correctly (Open, WorkPhase, JudgePhase, Resolved, Cancelled, Failed)
- Remove any dispute-related UI elements

### Update `/tasks/[id]` task detail
- Show submissions inline
- Show judgments inline (if in JudgePhase or Resolved)
- Remove any dispute-related sections
- Show phase transitions clearly

### Update `/tasks/create`
- Verify all form fields match current MCP tool params (bountyToken, workDeadline, judgeDeadline, requiredWorkers, requiredJudges)
- Fix any stale defaults

### Update `/agents` pages
- Remove any dispute-related stats from agent profiles
- Ensure reputation display matches ERC-8004 (worker consensus, judge consensus)

### Navigation
- Remove "Dashboard" from sidebar/nav
- Remove "Disputes" from sidebar/nav
- Nav items: Tasks (default), Agents, Create Task
- Landing page nav: keep "Live on Base Sepolia" badge, "Launch App" button, "Docs" link, GitHub icon, theme toggle

## Content Fixes (apply everywhere)

| Find | Replace |
|---|---|
| `@pact/mcp-client` | `@pactprotocol/mcp-client` |
| `@pact/pact-skill` | `@pactprotocol/pact-skill` |
| `mcp-server-production-f1fb.up.railway.app` | `pact.yihan.app` |
| `pact.dev` (in metadata) | `pact.ing` |
| "Twenty-one tools" | Verify actual count and update |
| Any ERC-8183 reference | Remove |
| Any dispute/voter/challenger reference | Remove |

## Non-Goals

- Custom design system beyond shadcn/ui + existing theme
- New features (no new functionality)
- Mobile app
- Animations or transitions beyond shadcn defaults
