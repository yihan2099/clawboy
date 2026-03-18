# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the landing page to 3 sections, delete dead dispute pages, merge dashboard into tasks, fix stale content across the entire frontend.

**Architecture:** Next.js 16 app router at `apps/web/`. shadcn/ui components. All changes are in `apps/web/` — no backend changes. Each task produces a buildable, working state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Bun

**Spec:** `docs/superpowers/specs/2026-03-18-frontend-redesign-design.md`

---

## File Map

| File | Action |
|---|---|
| `app/(dashboard)/disputes/` | Delete entire directory |
| `app/(dashboard)/dashboard/` | Delete entire directory |
| `components/dashboard-nav.tsx` | Modify (remove Dashboard + Disputes from nav, make Tasks default) |
| `components/mobile-nav.tsx` | No changes needed (reads from `navLinks` in dashboard-nav) |
| `app/page.tsx` | Modify (strip to 3 sections) |
| `components/landing/hero-section.tsx` | Modify (replace live dashboard with static code block) |
| `components/landing/getting-started-section.tsx` | Modify (fix URLs, add CLI tab) |
| `components/landing/footer-section.tsx` | Modify (add DESIGN.md link) |
| `components/landing/thesis-section.tsx` | Delete |
| `components/landing/why-section.tsx` | Delete |
| `components/landing/workflows-section.tsx` | Delete |
| `components/landing/roles-section.tsx` | Delete |
| `components/landing/architecture-section.tsx` | Delete |
| `components/landing/animate-on-scroll.tsx` | Delete |
| `components/landing/stats/badge-stats.tsx` | Delete |
| `components/landing/stats/live-feed.tsx` | Delete |
| `components/landing/stats/stats-section-skeleton.tsx` | Delete |
| `app/(dashboard)/tasks/page.tsx` | Modify (add stat cards header) |
| `app/layout.tsx` | Modify (fix metadata URL pact.dev → pact.ing) |
| All files | Content fixes (stale URLs, package names, dispute refs) |

---

### Task 1: Delete dead pages (disputes + dashboard)

**Files:**
- Delete: `app/(dashboard)/disputes/` (entire directory)
- Delete: `app/(dashboard)/dashboard/` (entire directory)
- Modify: `components/dashboard-nav.tsx`

- [ ] **Step 1: Delete disputes directory**

```bash
cd /home/yh/projects/pact/apps/web
rm -rf app/\(dashboard\)/disputes
```

- [ ] **Step 2: Delete dashboard directory**

```bash
rm -rf app/\(dashboard\)/dashboard
```

- [ ] **Step 3: Update navigation — remove Dashboard from navLinks**

In `components/dashboard-nav.tsx`, change the `navLinks` array from:

```typescript
export const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/agents', label: 'Agents' },
];
```

To:

```typescript
export const navLinks = [
  { href: '/tasks', label: 'Tasks' },
  { href: '/agents', label: 'Agents' },
];
```

(MobileNav reads from `navLinks` so it updates automatically.)

- [ ] **Step 4: Build and verify**

```bash
cd /home/yh/projects/pact && bun run build --filter=@pactprotocol/web
```

Expected: Build succeeds. No references to deleted pages. If build fails due to imports from deleted files, fix them.

- [ ] **Step 5: Commit**

```bash
cd /home/yh/projects/pact
git add apps/web/app/\(dashboard\)/disputes apps/web/app/\(dashboard\)/dashboard apps/web/components/dashboard-nav.tsx
git commit -m "feat(web): delete dispute pages and dashboard — V2 has no disputes, tasks is the home"
```

---

### Task 2: Strip landing page to 3 sections

**Files:**
- Delete: `components/landing/thesis-section.tsx`
- Delete: `components/landing/why-section.tsx`
- Delete: `components/landing/workflows-section.tsx`
- Delete: `components/landing/roles-section.tsx`
- Delete: `components/landing/architecture-section.tsx`
- Delete: `components/landing/animate-on-scroll.tsx`
- Delete: `components/landing/stats/` (entire directory)
- Modify: `app/page.tsx`

- [ ] **Step 1: Delete removed landing components**

```bash
cd /home/yh/projects/pact/apps/web
rm components/landing/thesis-section.tsx
rm components/landing/why-section.tsx
rm components/landing/workflows-section.tsx
rm components/landing/roles-section.tsx
rm components/landing/architecture-section.tsx
rm components/landing/animate-on-scroll.tsx
rm -rf components/landing/stats
```

- [ ] **Step 2: Rewrite app/page.tsx**

Replace the entire file with:

```tsx
import { NavHeader } from '@/components/landing/nav-header';
import { HeroSection } from '@/components/landing/hero-section';
import { GettingStartedSection } from '@/components/landing/getting-started-section';
import { FooterSection } from '@/components/landing/footer-section';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      <div className="fixed inset-0 bg-background" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--gradient-glow),transparent_60%)]" />
      </div>

      <NavHeader />

      <main className="relative z-10">
        <HeroSection />
        <Separator className="max-w-2xl mx-auto" />
        <GettingStartedSection />
        <Separator className="max-w-2xl mx-auto" />
        <FooterSection />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
cd /home/yh/projects/pact && bun run build --filter=@pactprotocol/web
```

Expected: Build succeeds. Landing page renders with 3 sections.

- [ ] **Step 4: Commit**

```bash
cd /home/yh/projects/pact
git add apps/web/app/page.tsx apps/web/components/landing/
git commit -m "feat(web): strip landing page to hero + getting started + footer"
```

---

### Task 3: Rewrite hero section

**Files:**
- Modify: `components/landing/hero-section.tsx`

- [ ] **Step 1: Rewrite hero-section.tsx**

Read the current file first. Replace the entire file content with a simplified version that:

- Keeps: headline "The protocol for agent value", protocol badges (MCP, A2A, ERC-8004, USDC), "Connect your agent via" badges, "Launch App" CTA
- Changes subtitle to: "Trustless escrow, competitive execution, consensus-based verification, and portable reputation. All on-chain. No human arbitration. 3% fee."
- Removes: the entire `HeroDashboard` async component (live feed, badge stats, suspense)
- Removes: the `DashboardSkeleton` component
- Removes: all imports for `getCachedPlatformStatistics`, `getCachedRecentSubmissions`, `getCachedDetailedTasks`, `BadgeStats`, `LiveFeed`
- Replaces right side with a static code block showing the CLI:

```
$ pact task list
$ pact work submit 42 --summary "..." --deliverables '[...]'
$ pact agent reputation 0x1234...
```

- Adds: "View on GitHub" ghost button next to "Launch App"
- Removes: "Base Sepolia Testnet" badge (redundant with nav)
- Changes: the component from async server component to a regular component (no more data fetching)

The hero should be a two-column layout: left side has the text + CTAs, right side has the static code block in a Card with monospace font.

- [ ] **Step 2: Build and verify**

```bash
cd /home/yh/projects/pact && bun run build --filter=@pactprotocol/web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing/hero-section.tsx
git commit -m "feat(web): rewrite hero — static CLI example, remove broken live feed"
```

---

### Task 4: Fix getting started section

**Files:**
- Modify: `components/landing/getting-started-section.tsx`

- [ ] **Step 1: Fix stale content in getting-started-section.tsx**

Read the current file first. Make these changes:

1. Fix MCP config package name (line 14): `"@pact/mcp-client"` → `"@pactprotocol/mcp-client"`

2. Fix OpenClaw install command (line 21): `npx @pact/pact-skill` → `npx @pactprotocol/pact-skill`

3. Fix remote connector URL (line 23): `https://mcp-server-production-f1fb.up.railway.app/mcp` → `https://pact.yihan.app/mcp`

4. Add a CLI tab. In the `Tabs` component, add a 4th tab. Change the grid from `grid-cols-3` to `grid-cols-4` in `TabsList`. Add after the Remote TabsContent:

```tsx
<TabsContent value="cli">
  <div className="rounded-lg border border-border overflow-hidden">
    <div className="px-3 sm:px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground truncate min-w-0">
        Install CLI
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyCli}
        className="h-7 px-2"
        aria-label="Copy to clipboard"
      >
        {copiedCli ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
    <pre className="p-3 sm:p-4 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto text-left bg-muted/20">
      {cliInstall}
    </pre>
  </div>
  <p className="mt-3 text-xs text-muted-foreground">
    Set <code className="px-1 py-0.5 rounded bg-muted">PACT_WALLET_PRIVATE_KEY</code> for authenticated commands
  </p>
</TabsContent>
```

Add the CLI tab trigger:
```tsx
<TabsTrigger value="cli" className="text-xs sm:text-sm">
  CLI
</TabsTrigger>
```

Add state and handler:
```typescript
const cliInstall = `npx @pactprotocol/cli task list`;
const [copiedCli, setCopiedCli] = useState(false);
const copyCli = async () => {
  await navigator.clipboard.writeText(cliInstall);
  setCopiedCli(true);
  setTimeout(() => setCopiedCli(false), 2000);
};
```

- [ ] **Step 2: Build and verify**

```bash
cd /home/yh/projects/pact && bun run build --filter=@pactprotocol/web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing/getting-started-section.tsx
git commit -m "fix(web): update stale URLs and package names, add CLI tab"
```

---

### Task 5: Fix metadata and global content

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/landing/footer-section.tsx`

- [ ] **Step 1: Fix metadata in layout.tsx**

Read the file first. Change all occurrences of `pact.dev` to `pact.ing`:

- `metadataBase: new URL('https://pact.dev')` → `metadataBase: new URL('https://pact.ing')`
- `url: 'https://pact.dev'` → `url: 'https://pact.ing'` (in openGraph)

- [ ] **Step 2: Add DESIGN.md link to footer**

In `components/landing/footer-section.tsx`, in the "Developers" section, add a link to DESIGN.md:

```tsx
<li>
  <a
    href="https://github.com/yihan2099/pact/blob/main/DESIGN.md"
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    Design
  </a>
</li>
```

Add it after the "Docs" link in the Developers section.

- [ ] **Step 3: Run global content search for remaining stale references**

```bash
cd /home/yh/projects/pact/apps/web
grep -r "pact\.dev\|@pact/\|mcp-server-production\|DisputeResolver\|dispute\|ERC.8183" --include="*.tsx" --include="*.ts" src/ app/ components/ lib/ 2>/dev/null | grep -v node_modules | grep -v ".next"
```

Fix any remaining stale references found.

- [ ] **Step 4: Build full app**

```bash
cd /home/yh/projects/pact && bun run build --filter=@pactprotocol/web
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/components/landing/footer-section.tsx
git commit -m "fix(web): update metadata URL to pact.ing, add DESIGN.md link to footer"
```

If additional stale content was fixed, include those files too.

---

### Task 6: Visual verification and push

**Files:**
- None (verification only)

- [ ] **Step 1: Start dev server and verify landing page**

```bash
cd /home/yh/projects/pact && bun run dev:web
```

Use the browse tool to navigate to `http://localhost:3000` (or whichever port) and take screenshots:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto http://localhost:3000
$B screenshot /tmp/final-landing.png
```

Verify:
- Hero section renders with headline, subtitle, badges, CTAs, and CLI code block
- Getting started section has 4 tabs (MCP, OpenClaw, Remote, CLI)
- Footer renders with newsletter, links including Design link
- No broken sections or missing components
- No console errors

- [ ] **Step 2: Verify app pages**

```bash
$B goto http://localhost:3000/tasks
$B screenshot /tmp/final-tasks.png
$B goto http://localhost:3000/agents
$B screenshot /tmp/final-agents.png
```

Verify:
- Nav shows Tasks and Agents (no Dashboard, no Disputes)
- Tasks page loads without errors
- Agents page loads without errors

- [ ] **Step 3: Verify no dead links**

```bash
$B goto http://localhost:3000/dashboard
$B screenshot /tmp/final-404-dashboard.png
$B goto http://localhost:3000/disputes
$B screenshot /tmp/final-404-disputes.png
```

Expected: 404 pages for both (deleted routes).

- [ ] **Step 4: Push**

```bash
cd /home/yh/projects/pact && git push
```
