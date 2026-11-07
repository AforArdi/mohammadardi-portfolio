# Stage 7: Critic review

Scope: feature lines 1–125; later sections consulted only to disambiguate. Three fresh-conversation reviewers completed. Their first attempts hit a usage limit; each succeeded on its one retry. No plan repairs occurred during this stage.

The design and structural reviewers read `feature-spec-standard.md`; the style reviewer used its persona without an additional standard. Each confirmed full persona, target scope, review manifest and all 16 baseline reads, with no missing files, edits or compilation. Independent review results are preserved below; their severities are the reviewers' own. Root adjudication appears only in the consolidated report.

## Design reviewer: `/root/stage7_design`

**D7-1 — Blocker — target lines 21, 109.** The selected framework is described as patched, but `next@15.1.7` predates published App Router remote-code-execution fixes. The official advisory lists `15.1.9` as the initial fixed release in that line. Following the plan introduces a known critical vulnerability into the application holding database, storage, and email credentials. Select and verify a currently supported patched Next.js/React dependency set before approval. Do not treat the advisory's historical minimum as proof of present-day safety. [Official advisory](https://nextjs.org/blog/CVE-2025-66478).

**D7-2 — Major — target lines 107–121.** Engineering defaults announce Drizzle runtime access, PostgreSQL rate limiting and other choices without resolving viable alternatives. The brief identifies Supabase SDK runtime access and Drizzle migrations with SDK runtime as viable. The target neither supplies a technical selection rationale nor explicitly incorporates that comparison. Excluding Express and Neon does not evaluate the remaining alternatives. Add a compact decision table comparing authorization complexity, operating load, cost and maintenance for consequential query/limiter choices.

**D7-3 — Major — target lines 46–49, 63, 94–105.** The plan supplies no measurable release criteria for performance and visual quality. The estimated 100–150 kB saving lacks a measurement method; Lighthouse audits and “100% visual parity” do not define thresholds, reference captures, devices or allowed differences. Define reference viewports, approved layout differences, production-build budgets/regression limits and measurement conditions. Keep savings unverified until measured.

Read manifest: persona `design_critic.md`, standard `feature-spec-standard.md`, manifest, feature scope fully read; target verified as 788 lines and later sections consulted for disambiguation. All 16 manifest baseline files fully read, none missing. No other reviewer reports consulted; no writes/compilation.

## Structural reviewer: `/root/stage7_structural`

**T7-1 — Major — target lines 107–122.** Missing mandatory alternatives evaluation. Proposed Defaults lists selections and Explicit Exclusions lists rejected directions, but neither evaluates viable alternatives with concrete tradeoffs. The rest of the target has no alternatives section; Section 16 raises possibilities as unanswered questions. The brief's Alternatives Weighed is neither linked nor adopted. Add an Alternatives Considered subsection comparing Drizzle/server queries versus Supabase SDK/JWT policies, and database sessions versus signed authorization cookies, stating concrete selection reasons. Alternatively incorporate the brief's evaluation and record final decisions.

The scoped hierarchy is logical: H1 → H2 → H3. Goals/non-goals are represented by requirements and exclusions. No additional heading/table/format findings.

Read manifest: persona `structural.md`, standard `feature-spec-standard.md`, manifest, whole target (788 lines, audited 1–125), and all 16 baseline files fully read. None missing; no edits or compilation.

## Style reviewer: `/root/stage7_style`

**S7-1 — Major — target lines 13–24 — CALIBRATE.** The matrix calls resolutions “Implemented,” uses completed-action verbs and describes backups as “tested.” The baseline still contains Vite and no backup/restore execution evidence accompanies the commands. Rename the column Proposed specification change; distinguish unimplemented work and replace tested with to be tested unless an attributable record exists.

**S7-2 — Major — target lines 33–35 — CALIBRATE.** Failed `git status` supports Git rollback being unavailable in the inspected folder, not zero rollback capability. Existing copies/backups/deployment were not ruled out. Attribute the observation and require a recoverable snapshot without asserting all recovery mechanisms are absent.

**S7-3 — Major — target line 63 — CALIBRATE.** The estimated 100–150 kB reduction lacks a bundle comparison or attribution. Package declarations/imports establish consolidation candidates, not shipped cost. Measure before/after production builds and remove the range until supported.

**S7-4 — Major — target line 75 — CALIBRATE.** The cited full-width image does not establish viewport-dependent cropping: the inspected wrapper has overflow-hidden and hover enlargement but no fixed aspect ratio. Describe observed treatment, require viewport/hover checks, and separate a complete-certificate requirement from an established clipping defect.

**S7-5 — Major — target line 80 — CALIBRATE.** “The page remains completely blank” conflates script-failure timings. Opacity-zero states do not establish that every failure hides every element. Distinguish a blocked initial script in a client-rendered app from interrupted animation/hydration and require checks for each.

**S7-6 — Major — target line 87 — CALIBRATE.** Browser submission code does not establish the absence of trusted provider bot checks/rate limits. The source proves a local CAPTCHA presence check and `emailjs.sendForm`; provider configuration is uninspected. State that this repository lacks an application-server enforcement path and provider enforcement is unverified.

Read manifest: persona `style.md`, manifest, full feature scope and 788-line count verified; later target sections consulted to disambiguate. All 16 baseline files fully read; no other reviewer reports, edits or compiles.
