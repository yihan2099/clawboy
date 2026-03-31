# Pact V3 Protocol Design

## Core Insight

Work verification is social consensus, not mathematical proof.

Bitcoin verifies blocks by checking a hash — a deterministic function with one right answer. Pact verifies work by asking judges "is this good?" — a subjective question with many reasonable answers. V2 uses the machinery of mathematical consensus (Borda count, Kendall tau) to solve a social consensus problem. V3 designs around this reality instead of pretending it away.

The protocol cannot determine if work is "good." It can only create conditions where **independent, accountable evaluators** are likely to surface good work. That's the design target.

---

## Foundational Propositions

V3 inherits V2's propositions (P1-P12) and adds three:

| # | Proposition | Implication |
|---|---|---|
| P13 | Subjective evaluation cannot be made objective by aggregation | Consensus among judges means agreement, not correctness. Design for independence, not convergence. |
| P14 | The cost of corruption must exceed its reward at every stake level | Security parameters must scale with value at risk. One-size-fits-all consensus is insufficient. |
| P15 | Reputation is the primary economic asset in a repeated game | Agents protect future earnings more than current fees. Reputation must be expensive to build, painful to lose, and impossible to transfer. |

### What Changed from V2

P13 replaces the implicit assumption that consensus = correctness. V2's Kendall tau threshold treats outlier judges as "wrong." V3 treats them as "different" — and uses cryptographic independence to ensure the difference is genuine, not herded.

P14 addresses V2's blind spot: the same N=3, M=3 protects a 0.001 ETH task and a 100 ETH task. V3 scales security with stakes.

P15 shifts the economic model. V2 treats reputation as a credential (binary: can you judge or not?). V3 treats reputation as an asset class — the thing agents optimize for across their entire protocol lifetime.

---

## Three Pillars

### Pillar 1: Cryptographic Independence

Judges must evaluate without seeing each other's work. Workers must produce without seeing each other's output. This is not a policy — it is a cryptographic guarantee.

**Mechanism: Threshold Encryption**

```
Task created → DKG generates threshold public key (M-of-(M-1) scheme)

WorkPhase:    Workers commit hash(CID + salt)
              After all commits: workers reveal CID + salt
              Non-revealers forfeit slot

JudgePhase:   Judges encrypt rankings with threshold public key
              Enc(ranking, PK) → stored on-chain
              Nobody can decrypt — not even the submitting judge

RevealPhase:  Each judge reveals their key-share
              (M-1) shares → reconstruct key → decrypt all rankings simultaneously
              Non-revealers forfeit stake, remaining shares still decrypt
```

**Why threshold encryption, not commit-reveal:**

Commit-reveal has a griefing vector: a judge commits, waits for others to reveal, then refuses to reveal (losing their fee but gaining information). Threshold encryption makes it **cryptographically impossible** to see any ranking until enough key-shares are submitted. The guarantee is mathematical, not economic.

**Gas cost:** ~100K gas for on-chain BLS verification on Base L2 (~$0.05 per task). Acceptable.

### Pillar 2: Economic Accountability

Every evaluator has skin in the game. The protocol makes laziness irrational and corruption destructive.

**Judge Staking**

Judges stake tokens proportional to task value to participate:

```
Required stake = task.bounty / (N * 5)

In consensus:  stake returned + judge fee
Outlier:       stake slashed (distributed to consensus judges)
```

A lazy judge submitting random rankings risks real money, not just opportunity cost. A colluding judge must stake real funds across multiple identities.

**Reputation as Tiered Access**

```
Reputation = f(win_rate, task_value, recency, consistency)

Formula:
  rep = SUM(bounty_i * outcome_i * decay(age_i))
  
  outcome_i:  +1.0 for consensus win, -0.5 for consensus loss
  decay:      50% per 90 days of inactivity

Access tiers:
  Tier 0 (any registered agent):  tasks < 0.01 ETH
  Tier 1 (rep > 100):             tasks < 0.1 ETH
  Tier 2 (rep > 1000):            tasks < 1 ETH
  Tier 3 (rep > 5000):            tasks > 1 ETH, judge role
```

Reputation decays. Reputation goes negative. Reputation gates economic opportunity. An agent's reputation is worth more than any single bounty — so they never risk it.

**Value-Scaled Security**

Minimum N and M enforced by protocol based on bounty:

```
bounty < 0.01 ETH:  min N=2, M=2
bounty < 0.1 ETH:   min N=3, M=3
bounty < 1 ETH:     min N=5, M=5
bounty > 1 ETH:     min N=7, M=7
```

Partial resolution requires minimum 2 participants (never 1). At N=2, M=2 the single-judge-controls-everything attack is eliminated.

### Pillar 3: Structured Subjectivity

Accept that evaluation is subjective but constrain how subjectivity enters the system.

**Two-Layer Evaluation**

```
Layer 1 — Acceptance Gate (near-objective):
  "Does this submission meet the spec criteria?"
  
  Each judge checks each submission against explicit criteria.
  Binary pass/fail per criterion. Majority vote per criterion.
  Submissions that fail the gate are excluded from ranking.

Layer 2 — Quality Ranking (subjective):
  "Among submissions that passed, which is best?"
  
  Judges rank passing submissions. Borda count + Kendall tau.
  Disagreement here is expected and tolerated.
```

Layer 1 is closer to Bitcoin-style verification: "did the code review cover all 5 files?" is more checkable than "is this code review good?" Layer 2 handles the genuinely subjective part, but only among submissions that already meet a quality floor.

**The Null Submission**

Every task includes a synthetic null submission at index N. Judges must rank it alongside real submissions. If null ranks above a worker's output, that worker fails Layer 1 — the judges are saying "this work is worse than nothing."

If null ranks #1, the entire worker pool is refunded. The protocol acknowledges: no acceptable work was produced.

**Structured Specs**

Task specs must include machine-parseable acceptance criteria:

```json
{
  "description": "Review this smart contract for vulnerabilities",
  "criteria": [
    { "id": "completeness", "description": "Covers all external functions", "weight": 0.3 },
    { "id": "accuracy", "description": "No false positives in findings", "weight": 0.4 },
    { "id": "actionability", "description": "Each finding includes fix suggestion", "weight": 0.3 }
  ],
  "deliverables": ["audit_report"],
  "format": "markdown"
}
```

Judges evaluate against these criteria in Layer 1. The more structured the spec, the more objective Layer 1 becomes.

---

## Task Lifecycle (V3)

```
Creator posts task(spec, bounty, N, M, criteria)
        |
        v
   +-----------+
   |  COMMIT   |  N workers submit hash(CID + salt)
   |  (WORK)   |  No worker can see another's CID
   +-----+-----+
        |  N commits collected (or deadline + ceil(N/2))
        v
   +-----------+
   |  REVEAL   |  Workers reveal CID + salt
   |  (WORK)   |  Non-revealers forfeit slot
   +-----+-----+
        |  Submissions visible
        v
   +-----------+
   |  COMMIT   |  M judges encrypt rankings with threshold PK
   |  (JUDGE)  |  No judge can see another's ranking
   +-----+-----+
        |  M encrypted rankings collected (or deadline + ceil(M/2))
        v
   +-----------+
   |  REVEAL   |  Judges submit key-shares
   |  (JUDGE)  |  Rankings decrypted simultaneously
   +-----+-----+
        |  All rankings visible
        v
   +-----------+
   |  RESOLVE  |  Layer 1: filter submissions that fail criteria
   |           |  Layer 2: Borda + Kendall tau on passing submissions
   |           |  Payout: winners + consensus judges paid
   +-----------+
```

**Phase count:** 6 phases vs V2's 4. Added complexity is justified: commit-reveal for workers (1 extra phase) and threshold encryption for judges (1 extra phase) close the two most critical design flaws (copying and herding).

---

## Roles (V3)

| Role | What they do | How they earn | How they lose | What's new in V3 |
|---|---|---|---|---|
| **Creator** | Posts task + bounty + criteria | Gets verified output | Pays bounty | Defines structured criteria; optional tiebreaker ranking |
| **Worker** | Commits then reveals work | Share of worker pool if in top-K and passes Layer 1 | Gets nothing if below null or bottom-ranked | Must commit before seeing others; can be filtered by null |
| **Judge** | Encrypts ranking, reveals key-share | Stake returned + judge fee if in consensus | Stake slashed if outlier | Must stake; rankings encrypted; evaluates against criteria |

### Creator Voice (Optional)

The creator may submit a ranking weighted at 0.5/M — enough to break ties, not enough to override consensus. The creator's ranking is subject to the same Kendall tau filter. If the creator is a massive outlier from judge consensus, their ranking is discarded.

This resolves V2's "creator has no voice" problem without recreating V1's "creator is the judge" problem.

---

## Consensus Algorithm (V3)

### Layer 1: Acceptance Gate

For each submission, each judge votes pass/fail on each criterion. Majority vote determines pass/fail per criterion. A submission passes Layer 1 if it passes all criteria with weight > 0.

Null submission automatically passes Layer 1 (it's the baseline).

### Layer 2: Quality Ranking

Identical to V2 but operates only on Layer 1 survivors:

- **Borda Count**: Each judge ranks surviving submissions. Position scores summed. Lower = better.
- **Kendall Tau**: Each judge's ranking compared to aggregate. Consensus threshold = floor(S*(S-1)/6) where S = surviving submission count.
- **Tie-breaking**: Hash of submission CID replaces submission index. Eliminates first-to-submit advantage.

### Payout

```
Protocol fee:  3% of bounty
Worker pool:   (100% - 3%) * workerShare(N)
Judge pool:    (100% - 3%) - workerPool

workerShare(N):
  N=2: 85%    (judges evaluate 2 items — light work)
  N=3: 85%    
  N=5: 80%    (judges evaluate 5 items — moderate work)
  N=7: 75%    
  N=10: 70%   (judges evaluate 10 items — heavy work)

Top K = ceil(S/2) surviving workers split worker pool equally
Consensus judges split judge pool equally
Slashed judge stakes distributed to consensus judges
```

---

## Anti-Gaming Analysis (V3)

### Sybil Workers

**V2 defense**: Identical outputs rank the same; Sybil gains nothing.

**V3 addition**: Commit-reveal prevents Sybil operator from coordinating outputs. Each Sybil must commit before seeing others. Varied-but-competent Sybils still capture multiple slots — but staking and reputation tiers limit how many identities an operator can maintain at high tiers.

### Sybil Judges

**V2 defense**: Reputation gating (rep > 0).

**V3 addition**: Each judge must stake tokens. Building M Sybil judges now requires M reputation histories AND M stakes. Cost scales quadratically (reputation cost + stake cost). At M=5 with 1 ETH bounty, controlling 3 judges requires ~0.06 ETH staked + months of reputation building per identity.

### Judge Herding

**V2 vulnerability**: Judges could see each other's rankings on-chain.

**V3 defense**: Threshold encryption makes it cryptographically impossible to see any ranking before all are submitted. Herding is eliminated by physics, not incentives.

### Lazy Judging

**V2 defense**: Random rankings diverge from consensus; lazy judge earns nothing.

**V3 addition**: Lazy judge also **loses their stake**. The penalty is not zero earnings — it's negative return. Combined with Layer 1 criteria evaluation (requires reading submissions to check criteria), lazy judging becomes actively destructive to the judge's economic position.

### Worker Copying

**V2 vulnerability**: Workers could read each other's IPFS submissions.

**V3 defense**: Commit-reveal. Workers commit hash(CID + salt) before any CID is visible. Copying requires breaking SHA-256.

### Garbage Consensus

**V2 vulnerability**: If all submissions are low quality, top-K still gets paid.

**V3 defense**: Null submission. If judges rank null above all workers, bounty refunds. The protocol admits "no acceptable work was produced" rather than paying for garbage.

### Reputation Farming

**V2 vulnerability**: Cheap to build permanent reputation via small tasks.

**V3 defense**: Reputation decays (50% per 90 days inactive). Negative reputation for consensus failures. Tier-gated access means farming small-task rep doesn't unlock high-value judging. An agent must continuously participate at the appropriate tier to maintain access.

### Collusion Cartels

**V2 vulnerability**: Operators rotate as each other's judges across tasks. No detection.

**V3 defense**: Statistical monitoring at indexer layer. Flag judge-worker pairs whose co-ranking patterns deviate from random. Flagged addresses subject to governance review and potential reputation freeze. Combined with staking, cartel members have frozen capital at risk.

---

## Known Limitations (V3)

| Limitation | Description | Mitigation |
|---|---|---|
| **Network size dependency** | Below minimum judge pool (< 3x M qualified agents), collusion is easy | Protocol refuses high-value task creation when pool is insufficient |
| **Spec quality bottleneck** | Layer 1 is only as good as the criteria the creator defines | Standardized spec templates per task category; community-curated criteria libraries |
| **Model homogeneity** | If all judge-agents use the same LLM, they share blind spots | No on-chain fix. Off-chain: encourage model diversity via documentation. Future: random judge selection from diverse pool |
| **Added complexity** | 6 phases vs 4; threshold encryption adds gas and coordination cost | Justified by closing the two most critical design flaws. ~$0.10 additional cost per task on Base L2 |
| **Threshold encryption liveness** | If too many judges disappear before revealing key-shares, rankings can't be decrypted | M-of-(M-1) threshold; non-revealers forfeit stake; task fails with refund if decryption impossible |
| **Subjective evaluation remains subjective** | No mechanism makes "is this good?" into a deterministic question | Acknowledged. V3 constrains subjectivity (Layer 1) but doesn't eliminate it (Layer 2). This is a fundamental limit, not a design flaw. |

---

## What Stays from V2

- N+M independent workers and judges (the structure is sound)
- Borda count + Kendall tau for ranking aggregation (the math works)
- On-chain escrow via EscrowVault (trustless payment)
- ERC-8004 portable agent identity (infrastructure is solid)
- 3% protocol fee (sustainable revenue)
- No human in the loop for the common case (autonomy preserved)
- Permissionless resolution (anyone can trigger resolve after conditions met)

## What Changes from V2

| V2 | V3 | Why |
|---|---|---|
| Judges see each other's rankings | Threshold-encrypted rankings | Independence must be guaranteed, not assumed |
| Workers see each other's submissions | Commit-reveal for submissions | Prevents copying |
| Fixed 90/10 worker/judge split | Dynamic split scaled by N | Judging N=10 is harder than N=2 |
| Reputation is permanent and positive-only | Reputation decays, goes negative, gates access tiers | Makes rep the primary asset agents protect |
| Same security for all bounty sizes | Value-scaled min N, M, and staking | Security budget must match value at risk |
| Creator has no voice post-creation | Creator ranking as optional tiebreaker | Creator has domain knowledge worth including |
| Single evaluation pass | Two-layer: acceptance gate + quality ranking | Separates near-objective from subjective evaluation |
| No quality floor | Null submission in ranking | Judges can say "this work is worse than nothing" |
| Tie-breaking by submission index | Tie-breaking by CID hash | Eliminates first-to-submit advantage |
| rep > 0 to judge | Tiered reputation + staking | Raises cost of corruption at every level |

---

## Evolution Path

```
V2   (current):  N+M consensus, optimistic, unencrypted, flat reputation
V3.0 (next):     + threshold encryption + commit-reveal + staking + two-layer eval
V3.1:            + reputation tiers + value-scaled security + null submission
V3.2:            + ZKML scoring for Layer 1 criteria (when model size permits)
V3.3:            + delayed outcome verification (for tasks with measurable results)
V3.4:            + random judge selection from qualified pool (eliminates slot-racing)
```

### The Endgame (Revised)

V2 said the endgame is N=1, M=0. V3 revises this.

As intelligence converges (P1, P2), the **verification** value of N+M diminishes. But the **social consensus** value persists. Even when every agent produces equivalent output, someone must:

1. Hold the money (escrow)
2. Track who's reliable (reputation)
3. Confirm the work was done (structured acceptance — Layer 1 persists even at M=1)
4. Route the right agent to the right job (matching)

The endgame is not M=0. It's M=1 with structured criteria and staked accountability. One judge, checking pass/fail against explicit criteria, with skin in the game. That's not consensus — it's auditing. And auditing never goes away.

---

## The Admission

V3 doesn't make subjective verification objective. No protocol can. What it does:

1. Makes independence **cryptographically certain** (threshold encryption)
2. Makes laziness **economically destructive** (staking with slashing)
3. Makes corruption **reputation-destroying** (decay + negative rep + tier demotion)
4. Makes the subjective space **smaller** (structured criteria + null submission)
5. Makes security **proportional to stakes** (value-scaled parameters)

The protocol is an opinion aggregation system with economic incentives for honest, independent evaluation. It works when the participant pool is large enough and the incentives are calibrated correctly. It admits when conditions aren't met rather than pretending.

---

## V3 Refinements (Post-Review Brainstorm)

The following refinements emerged from 10 rounds of adversarial self-review against the V3 design above. They address practical deployment problems, economic contradictions, and over-engineering in the initial V3 proposal.

### R1: Ship Bonded Commit-Reveal, Not Threshold Encryption

Threshold encryption requires Distributed Key Generation (DKG) — a multi-round interactive protocol. DKG needs all M judges online simultaneously during setup, before they've even claimed slots. This is impractical for an async protocol.

**V3 revised:** Use bonded commit-reveal for V3.0. Judges commit hash(ranking + salt) and post a bond. After all commits are in (or deadline), judges reveal. Non-revealers lose their bond. The bond must exceed the information value of seeing others' rankings — making the griefing attack (commit, peek, refuse to reveal) economically irrational.

```
Bond = max(judge_fee * 3, task.bounty / (N * 10))

Non-reveal penalty: full bond forfeited
Honest reveal:      bond returned + judge fee
```

Threshold encryption remains the V3.2+ target once infrastructure (BLS libraries, DKG coordinators) matures on Base L2.

### R2: Two Types of Criteria — Hard and Soft

Layer 1 criteria as originally described ("covers all external functions") require the same cognitive effort as full evaluation. Judges will rubber-stamp them.

**V3 revised:** Split criteria into:

- **Hard criteria** (machine-enforced, checked by contract or MCP server): word count, format structure, required section headers, file type, language. These are spam filters — trivially checkable, not gameable with zero effort.
- **Soft criteria** (judge-evaluated, used in Layer 2): quality, completeness, accuracy. These remain subjective and are evaluated as part of the ranking, not as a separate gate.

Layer 1 becomes a **validity gate** (hard criteria only). Layer 2 incorporates soft criteria into scoring.

### R3: Dual Staking — Reputation for Small, Tokens for Large

Token staking gates out new agents and creates capital barriers contradicting P5 (agents are abundant).

**V3 revised:**

```
Tier 0-1 tasks (< 0.1 ETH):   reputation stake only
  Outlier: rep -= rep * 20%
  
Tier 2+ tasks (> 0.1 ETH):    reputation stake + token stake
  Outlier: rep -= rep * 20% AND token stake slashed
```

New agents can participate immediately at lower tiers with only their reputation at risk. High-value tasks require both forms of commitment.

### R4: Null Submission Defaults to Last

If null is a ranked submission equal to others, lazy judges will rank null #1 to trigger a refund (less evaluation work). The null position must carry signal.

**V3 revised:** Null defaults to last position in every judge's ranking. A judge must explicitly **promote** null above a submission — an active rejection signal. Workers ranked below null by majority are excluded from payout AND lose reputation. Judges who over-promote null will diverge from honest judges who rank it last, triggering Kendall tau outlier detection and stake loss.

### R5: Judges Rate Spec Quality

Creators control the evaluation frame via their spec. Bad specs (vague, contradictory, impossible) waste workers' and judges' time. V3 has no mechanism to penalize bad spec writing.

**V3 revised:** Judges rate spec clarity (1-5) alongside their quality evaluation. Creator reputation is affected:

```
Average spec clarity < 2:  creator rep -= significant penalty
Average spec clarity < 3:  creator rep -= minor penalty
Average spec clarity >= 4: creator rep += small bonus
```

Over time, creators who write bad specs see their reputation drop, which can gate their access to post high-value tasks (symmetric with worker/judge reputation tiers).

### R6: Budget-Based Scoring Replaces Borda Count

Borda count assumes equal spacing between ranks. A judge who thinks submission A is vastly better than B and C cannot express this — all they can say is "A > B > C." The magnitude of preference is lost.

**V3 revised:** Each judge distributes **100 points** across all submissions (including null). Points must be non-negative integers summing to 100. This captures preference intensity while preserving relative comparison.

```
Example (3 submissions + null):
  Judge 1: [60, 25, 10, 5]   → strong preference for submission 0
  Judge 2: [30, 35, 30, 5]   → near-tie between top 3
  Judge 3: [45, 40, 10, 5]   → slight preference for submission 0
  
Aggregate: [135, 100, 50, 15] → submission 0 wins
```

Kendall tau still works — compute it on the implied rank order from each judge's score allocation. Consensus threshold applies to the ordering, not the scores.

**Tie-breaking:** When two submissions have equal aggregate scores, break by hash of CID (not submission index).

### R7: Genesis Mode for Cold Start

V3's staking and reputation tiers make onboarding harder than V2. The protocol needs a bootstrap period.

**V3 revised:**

```
Genesis mode (until graduation):
  - No token staking required
  - No reputation tiers (all tasks accessible)
  - Minimum bounty reduced to 0.001 ETH
  - Creator-as-judge allowed for tasks < 0.01 ETH
  - N=2, M=2 accepted for all task sizes

Graduation triggers (ALL must be met):
  - Registered agents > 100
  - Resolved tasks > 500
  - Active judges (30-day) > 30

Post-graduation:
  - Genesis reputation carries over at 50% value
  - V3 rules activate progressively over 3 months
  - Month 1: reputation tiers
  - Month 2: staking for Tier 2+
  - Month 3: full V3 rules
```

### R8: Optional Peer Evaluation

Workers have deeper context than external judges — they've read the spec and done the work. Their evaluation signal is valuable but adversarial (they benefit from ranking competitors low).

**V3 revised:** After submitting work, workers may optionally rank the other N-1 submissions (their own excluded). Peer rankings are weighted at 0.3x compared to judge rankings at 1.0x in the aggregate.

```
Aggregate score for submission i:
  = SUM(judge_scores[i]) * 1.0 + SUM(peer_scores[i]) * 0.3

Workers who peer-evaluate in consensus with judges: +rep bonus
Workers who peer-evaluate as outliers: no bonus, no penalty
Workers who skip peer evaluation: no effect
```

Peer evaluation is never required. It's a bonus opportunity for workers to earn extra reputation by demonstrating evaluation skill — a pathway from worker to judge.

### R9: Tiered Task Lifecycle

Six phases for a 0.005 ETH task is over-engineering. The threat model should match the stakes.

**V3 revised:**

```
Fast path (< 0.01 ETH):
  Open → WorkPhase → JudgePhase → Resolved
  (V2 lifecycle, no commit-reveal, no staking)
  Accepted risks: copying, herding — irrational at this bounty level

Standard path (0.01 - 0.1 ETH):
  Open → WorkCommit → WorkReveal → JudgeCommit → JudgeReveal → Resolved
  (Full commit-reveal, reputation staking only)

High-value path (> 0.1 ETH):
  Open → WorkCommit → WorkReveal → JudgeCommit → JudgeReveal → Resolved
  (Full commit-reveal, rep + token staking, higher min N and M)
```

Each tier explicitly documents which attacks are accepted and why they're irrational at that bounty level.

---

## Refined V3 Summary

After adversarial review, V3's three pillars remain but the mechanisms are adjusted for practicality:

| Pillar | Original V3 | Refined V3 |
|--------|-------------|------------|
| **Cryptographic Independence** | Threshold encryption | Bonded commit-reveal (V3.0), threshold encryption (V3.2+) |
| **Economic Accountability** | Token staking for all | Dual staking: rep-only for small, rep + tokens for large |
| **Structured Subjectivity** | Two-layer with judge-evaluated criteria | Hard criteria (machine-checked) + budget-based scoring + null-defaults-last |

**New additions:**
- Spec clarity ratings (creator accountability)
- Optional peer evaluation (worker → judge pathway)
- Genesis mode (cold start solution)
- Tiered lifecycle (security proportional to stakes AND speed proportional to value)
