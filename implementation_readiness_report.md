# Stage 9: Implementation readiness

Scope: implementation lines 126–788; feature scope used as context only. Review only; no fixes, compilation or tests performed. The sections preserve each reviewer's findings and severities. Root deduplication and adjudication are separate.

## Implementation-readiness reviewer: `/root/stage9_readiness`

Status: completed. Verdict: does not pass implementation readiness.

**I9-1 — Blocker — Unsafe framework version is prescribed (lines 752–755).** The plan labels `next@15.1.7` as patched, but the official App Router RCE advisory lists 15.1.9 as the historical fix in that release line. Select and verify a currently supported, patched Next.js/React set against all applicable advisories; that historical minimum is not a current recommendation. [Advisory](https://nextjs.org/blog/CVE-2025-66478).

**I9-2 — Blocker — Upload transport cannot deliver the promised payload on Vercel (473–484, 628, 780–782).** The endpoint promises 12 MB, configured through `serverActions.bodySizeLimit`; that setting controls Server Actions while Vercel imposes a 4.5 MB function request limit. Choose a working total request limit, different host, or direct private-storage upload with guarded finalization. Specify per-type limits, multipart overhead and capability expiry. [Vercel limits](https://vercel.com/docs/functions/limitations), [Next.js setting](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

**I9-3 — Major — File boundaries and mutation contracts missing (654–710, especially 674–687, 695–700; 743).** Phases omit exhaustive file actions, action signatures, validation, transaction boundaries and error shapes. TEST-18 promises version compare-and-update but only columns are defined; social links lack a version field. No concrete build/typecheck/test pass gates are given. Add per-phase file lists and verification, critical action contracts, atomic concurrency/reorder semantics and cache invalidation.

**I9-4 — Major — Fresh-login issuance and SSR continuity underspecified (200–220, 261–262, 689–693).** Nonce read, MFA verify, nonce update and session insert are separate, without conditional atomic consumption or retry/failure outcomes. Enrollment and cookie-aware refresh plumbing are not specified. Define owner-only enrolled/unenrolled paths, factor selection, cookie flags, atomic consume plus insert-once creation, and refresh/cookie files. Test concurrency and failure between steps. [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

**I9-5 — Major — Database bootstrap/privilege order not executable (132–155, 681–687).** Named roles are never created, ownership/login/bootstrap responsibilities omitted, future-object privileges absent, and migration journal location undecided. Grants on all tables affect existing objects only. Define ordered bootstrap/migration steps, journal and grants, role credentials and assertions proving runtime DML works while DDL/Auth access fail; verify Data API settings explicitly.

**I9-6 — Major — Media/cleanup state machine incomplete (486–503, 699–700, 739–744).** Upload branching omits later publication/hiding, shared references and concurrent replacement. Public copy precedes DB commit without crash compensation; inserting a queue row after DB failure does not explain DB-unavailable recovery. Scheduler is undecided, with no auth, claiming/locking, retry ceiling or reconciliation. “Exponential” formula is linear. Content/pixel/dimension/PDF validation limits absent. Define state transitions, immutable keys, validation, outbox/transaction order, idempotent cleanup, reconciliation and one authenticated scheduler with failure tests.

**I9-7 — Major — Request and byte limits lack an algorithm (449–455, 533–561, 704, 742).** The schema has integer request counts but no 5 GB monthly byte representation, atomic reservation, reset/exhaustion or DB failure rules. HEAD, failed ranges, aborted streams and fallback accounting are undefined. Define atomic keys/counters with appropriate byte types, accounting, host-specific trusted IP extraction and tests for concurrent requests and real PDF viewers.

**I9-8 — Major — Backups do not establish restoration/cutover safety (633–650, 712–716).** Object copying omits retained staging drafts, restore commands, policy reconstruction and DB consistency. DB restore strips ownership/grants without reapplication; owner identity and restored-session invalidation are omitted. Add complete backup scope/retention, consistent capture, restore/regrant/recovery instructions and a successful isolated restore gate. Keeping the old static deployment does not restore data.

Read manifest: full installed implementation-readiness persona and standard, manifest, all 788 target lines, and all 16 named baseline files completed; none missing. No other reviewer reports read; no writes, compiles or tests.

## Style reviewer: `/root/stage9_style`

Status: completed.

**E9-1 — Major — lines 752–755 — CALIBRATE.** “Stable with security patches” contradicts the official advisory for 15.1.7. Select current verified patched pins; the advisory's minimum does not prove latest safety. [Advisory](https://nextjs.org/blog/CVE-2025-66478).

**E9-2 — Major — lines 473–483, 628, 780–782 — CALIBRATE / RELOCATE.** The 12 MB Route Handler claim contradicts Vercel's documented 4.5 MB limit and the plan's own unresolved question. Resolve host, transport and effective limit in section 7. [Limits](https://vercel.com/docs/functions/limitations).

**E9-3 — Major — lines 501–503 — CALIBRATE.** A queue permits retries, not a guarantee of zero leaked objects if scheduling stops/deletion fails. The backoff formula is linear, not exponential. Specify actual schedule, completion conditions and handling of persistent failures.

**E9-4 — Major — lines 189, 212–219 — CALIBRATE.** “Single-use” is not established by separately reading an unused nonce and updating it unconditionally after MFA. Define atomic consumption and duplicate/retry outcomes as explicit invariants.

**E9-5 — Major — lines 604, 745 — CALIBRATE.** Visible base styles do not make a CV dialog and Turnstile contact form fully functional without JavaScript. Narrow the guarantee to server content and define navigation/CV/contact fallback behaviour and matching acceptance checks.

**E9-6 — Major — line 130 — CALIBRATE.** Schema exclusion does not eliminate harvesting of intentionally published public content. State the specific private Data API configuration/grant boundary and how it is verified, rather than a blanket security guarantee.

Read manifest: full installed style persona, manifest, all 788 target lines and all 16 baselines completed; none missing. No other reviewer reports, writes or compilation.

## Codebase-details reviewer: `/root/stage9_codebase`

Status: completed. Verdict: fail; 2 Blockers and 6 Majors.

**B9-1 — Blocker — Vulnerable prescribed framework (753–755).** Next.js 15.1.7 predates the official App Router RCE fix. Updated React framework instructions already supersede the initial historical patch, so select a currently supported, fully patched set with peer/type compatibility rather than treating any earlier minimum as sufficient. This is a planned new server architecture, not evidence of compromise in the existing Vite app. [Next.js](https://nextjs.org/blog/CVE-2025-66478), [React](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components).

**B9-2 — Blocker — Impossible selected upload size (473–484, 628).** The 12 MB Route Handler claim conflicts with Vercel's 4.5 MB gateway limit. The setting shown controls Server Actions. Choose a smaller total request, different host or private direct-upload/finalization protocol preserving the session deadline. [Vercel](https://vercel.com/docs/functions/limitations), [Next.js setting](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

**B9-3 — Major — Missing migration file/action map (294–317, 673–679).** Actual package scripts still run Vite, TypeScript references Vite configurations and aliases `@` to `src`, the React entry owns CSS, and `App.tsx` owns providers/router. Hero/Navbar depend on `getLenis`, SmoothScroll imports removed libraries, and hooked components lack Next.js client directives. Name exact create/modify/delete actions, scripts, aliases, root layout/fonts/CSS and client islands with serializable props. Remove entrypoints/config/getLenis/GSAP deliberately. Existing Dialog, Sheet and Command primitives are reuse foundations.

**B9-4 — Major — Non-reproducible role/bootstrap grants (132–155, 681–687).** No role creation or ownership transfer is supplied; grants apply only to objects existing at that time, without ordering/default grants for later migrations. Define privileged bootstrap actor, roles/ownership/login and connection format, migrations, future-object privileges, versioned files, clean replay and permission checks. Separate bootstrap from runtime credentials.

**B9-5 — Major — Seed lacks media import process (330–342, 390, 408, 681–687).** Required media foreign keys cannot be seeded merely by copying source arrays containing imported images and external URLs. Name a seed script and verified asset manifest, source mappings, upload/conversion/bucket/key rules, metadata and deterministic IDs, conflicts, retries and cleanup. Keep certificate target links separate from owned image objects; define initial CV handling.

**B9-6 — Major — ISR prose does not cache direct SQL or protect public data (687; 736).** No cache wrapper/lifetime, public query/DTO, published/deleted filters, private-media exclusion or invalidation is defined. Direct Drizzle queries are not tagged fetches automatically. Define the repository file, predicates, allowed fields, version-compatible cache API and mutation order; exclude admin/auth data from shared caches and verify draft isolation.

**B9-7 — Major — Concurrency promised without mutation semantics (418–429, 695–700, 743).** Social links lack a version; other version columns have no atomic predicate/increment/row-count checks. Reorder conflicts are undefined, and only project saves are tested. Define policy for each entity and reorder, fields or collection-version strategy, conflict errors and retained forms; test socials and reorder/edit races.

**B9-8 — Major — Incomplete authoritative-object restore (633–649).** Backups omit retained private-staging draft objects while DB references survive; restore strips privileges without reapplication. Include every authoritative bucket, distinguish disposable files, specify object restore ordering, reapply grants/ownership and rehearse reference/object consistency.

Read manifest: full codebase persona and implementation-readiness standard, manifest, all 788 target lines, all 16 baselines and additional source/configuration were read. Additional reads: `src/main.tsx`, `SmoothScroll.tsx`, `ProjectsSection.tsx`, `AboutSection.tsx`, `Footer.tsx`, `NavLink.tsx`, UI Dialog/Sheet, `src/lib/utils.ts`, Vite/TypeScript/ESLint/PostCSS configs, and Supabase task instructions. Bounded inventory/style searches, lockfile checks and read-only git status completed. No other reviewer reports opened; no edits, installs, builds or tests.

Missing/unverified: no required baseline reads missing. Future app/db/actions/recovery/status files are absent as expected, not findings by themselves. Live Supabase settings, deployment, historical build/lint output and visual behaviour were not verified. The Supabase changelog Markdown endpoint could not be fetched by the web tool; the reviewer did not claim that verification completed.
