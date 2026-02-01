# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Porter Network is a Turborepo + Bun monorepo for an "agent economy" platform where tasks can be posted, completed, and verified by autonomous agents. Currently consists of a Next.js landing page with waitlist functionality.

## Commands

```bash
# Development
bun install           # Install all dependencies
bun run dev           # Start dev server (Next.js with Turbopack)
bun run build         # Build all packages
bun run lint          # Lint all packages
bun run clean         # Remove build artifacts and node_modules
```

Dev server runs at http://localhost:3000.

## Architecture

```
porternetwork/
├── apps/
│   └── web/                    # Next.js 16 application (main app)
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── ui-components/          # Shared UI component library
│   ├── web3-utils/             # Web3 utilities (placeholder)
│   └── ipfs-utils/             # IPFS utilities (placeholder)
├── turbo.json                  # Turborepo pipeline config
└── package.json                # Bun workspace root
```

### Web App Structure (apps/web)

- **app/**: Next.js App Router pages and layouts
- **app/actions/**: Server actions (e.g., `joinWaitlist`)
- **components/landing/**: Landing page section components
- **components/ui/**: shadcn/ui components (New York style)
- **lib/**: Utilities, validations, rate limiting
- **middleware.ts**: Rate limiting middleware

### Key Patterns

1. **Server Actions**: Waitlist uses Next.js server actions with Zod validation
2. **Rate Limiting**: In-memory rate limiter (5 requests/hour per IP) via middleware
3. **Security Hardening**: SSRF protection in URL validation, strict security headers in next.config.ts
4. **UI**: shadcn/ui with Radix primitives, TailwindCSS 4, CVA for variants
5. **WebGL Effect**: FaultyTerminal component using OGL library for background effect

## Environment Variables

Copy `apps/web/.env.local.example` to `apps/web/.env.local`:

```
RESEND_API_KEY=re_xxxxx
RESEND_NEWSLETTER_SEGMENT_ID=xxxxx
```

## Tech Stack

- **Runtime**: Bun 1.3.5
- **Framework**: Next.js 16.1.6 with React 19
- **Build**: Turbopack (dev), Turborepo (monorepo)
- **Styling**: TailwindCSS 4, shadcn/ui
- **Validation**: Zod 4
- **Email**: Resend
