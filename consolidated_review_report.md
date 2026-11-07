# EGM consolidated review: revised portfolio plan

Date: 2026-11-07

**Verdict: revise before implementation approval.** All five review stages completed. Nine fresh-context reviewer runs produced 47 finding records, consolidated below into **2 Blockers, 11 Majors and 1 Nit**. These are 14 action groups, not 47 independent problems. One additional root-verified recovery-API issue is explicitly identified as R-1.

The core direction remains appropriate for the stated scope: one Next.js application, Supabase PostgreSQL/Auth/Storage, a simple owner dashboard, and a database-backed fixed 24-hour authorization window. The review does not justify adding Neon, a separate backend, Redis, or a second parallel session system. The problems are unresolved or incorrect implementation contracts in the plan.

## Scope, provenance and limits

Target: `docs/implementation-plan.md`, 788 lines. Reviewed SHA-256: `834D82742452E52F97EA799F49B637DDDB7F0105567F728EFCCD6E30A3184A26`.

Feature scope: lines 1–125. Implementation scope: lines 126–788. This is an explicit interpretation of the mixed document structure: concrete SQL begins at Section 3; the later roadmap is not the beginning of implementation detail.

Each reviewer used `fork_turns: none`, its installed EGM persona and applicable standard. Reviewers confirmed all required reads; none reported missing baseline files. This isolates conversation history, not the shared filesystem or host instructions. Three Stage 7 first attempts failed at a usage limit; each completed on its one retry. No reviewer is counted as a clean result merely for having launched.

| Stage | Reviewers | Status | Findings |
| --- | --- | --- | --- |
| 5: Initial zoom out | `stage5_zoom` | Completed | 4 |
| 6: Comprehension | `stage6_comprehension` | Completed; target alone | 6 |
| 7: Critic | `stage7_design`, `stage7_structural`, `stage7_style` | All completed after retry | 10 |
| 8: Intermediate zoom out | `stage8_zoom` | Completed | 5 |
| 9: Implementation readiness | `stage9_readiness`, `stage9_codebase`, `stage9_style` | All completed | 22 |

Raw findings and read attestations are saved in [initial zoom out](zoom_out_report.md), [comprehension](comprehension_report.md), [critic](critic_report.md), [intermediate zoom out](intermediate_zoom_out_report.md), and [implementation readiness](implementation_readiness_report.md). The [review manifest](egm_review_manifest.md) records selected context and dispatch rules.

This is a completed review pass, **not a passed plan**, an implementation audit, or convergence across repaired revisions. No application code, target plan, dependency, database, deployment or domain was changed. Reviewers did not run builds/tests or inspect live Supabase settings. Historical build/lint statements remain attributed to the author of the plan. Primary documentation was checked for relevant technical assertions.

## Blockers

### C01 — Select a currently patched dependency set

Target: lines 21, 109, 752–755. Needed before Phase 1 dependency installation.

The plan calls `next@15.1.7` patched, but it predates the App Router remote-code-execution fix documented by Next.js. The historical fix in that minor line was 15.1.9; this does **not** establish that 15.1.9 is safe or supported today. Verify all applicable advisories and pin a current supported Next.js/React/react-dom/type-package combination, with compatible ORM/Kit and Supabase packages. Verify that any optional Drizzle MCP version actually supplies the advertised tools. [Next.js advisory](https://nextjs.org/blog/CVE-2025-66478), [React advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components).

Acceptance: the version table, scripts and lockfile strategy agree; every security assurance cites a dated verification. Do not infer that the existing Vite deployment is affected by a server framework it does not yet use.

### C02 — Choose an upload transport the selected host supports

Target: lines 473–484, 628, 780–782. Needed before accepting upload architecture.

Changing from a Server Action to a Route Handler does not remove Vercel's 4.5 MB function request-body limit. `serverActions.bodySizeLimit` configures a different mechanism; it cannot grant the proposed 12 MB Route Handler capacity. [Vercel limits](https://vercel.com/docs/functions/limitations), [Next.js setting](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

Choose one concrete contract: smaller total requests under the gateway limit including multipart overhead; a host with the required capacity; or private direct-storage uploads with guarded validation/finalization. For this portfolio, small bounded requests are the lowest-complexity starting point if their file limits meet the owner's actual needs. If direct upload is selected, specify capability lifetime, immutable keys, content validation and how finalization/direct access obey the fixed admin deadline. Test at, below and above actual limits on the chosen host.

## Major corrections

### C03 — Complete one owner authentication flow

Target: lines 179–262, 298–301, 689–693.

Owner provisioning, first enrollment, ordinary challenge and post-recovery enrollment need one coherent flow. Bind the fresh-login proof to the verified owner/session; atomically conditionally consume it and establish the insert-once 24-hour record. Define concurrent submission, expired challenge, successful provider MFA followed by DB failure, and retry outcomes. A nonce name and random value do not prove atomic single use.

Specify server/client cookie utilities, refresh propagation files appropriate to the selected framework, cookie flags and error results. Keep token refresh separate from authorization-window renewal. Test exact deadline denial, concurrent nonce requests, enrollment, recovery, logout failure/revocation and attempts to renew with an old elevated token. Retain the DB session record: it serves the concrete deadline/revocation requirement, so replacing it with a separate signed authorization system is unnecessary.

### C04 — Make database bootstrap reproducible

Target: lines 128–175, 681–687.

Create the named roles, set schema ownership and login attributes, choose the migration journal schema, and specify bootstrap/migration/grant ordering. Grants on all existing tables do not grant access to future tables. Define owner-scoped default privileges or repeatable post-migration grants and keep elevated credentials separate from runtime credentials. Verify the configured Data API schemas and role access explicitly rather than relying on a stated default.

Acceptance: a clean environment replay works; runtime DML succeeds where intended, runtime DDL/internal Auth access fails, browser API roles cannot read private tables, and a later migration preserves the intended grants. A private schema does not prevent collection of intentionally public website content; narrow that security claim.

### C05 — Define public content selection and caching together

Target: lines 147–155, 509–531, 681–687, 736, 777–779.

Name one server-only public-content reader. Define published/non-deleted predicates, permitted fields, media-state restrictions and the public data shape. Private settings, drafts, storage credentials and owner-only metadata must never enter public props or shared caches. Direct Drizzle queries do not become cached/tagged merely because prose names `portfolio-content`.

Specify a version-compatible cache wrapper/lifetime and shared post-commit invalidation convention for create, update, reorder, publish, hide and delete. Keep owner/auth responses outside shared caches. Clarify that visitors can preview/download the active public-facing CV without owner login; protected admin image/draft previews are a separate access class. Test cache and draft isolation as well as update visibility.

### C06 — Complete the media lifecycle and cleanup mechanism

Target: lines 486–503, 695–700, 739–744.

Define upload, draft retention, publish, hide, replacement, restore and final purge transitions. Distinguish disposable raw staging from authoritative saved draft derivatives. Define immutable keys, references and cleanup eligibility, including shared assets and concurrent replacement. Hiding a record cannot retroactively make a previously distributed public image confidential.

Specify content/pixel/dimension/PDF limits and validation. Cover crashes between public copy and DB commit and cases where the database is unavailable, so compensation cannot itself be enqueued immediately. Use durable intent/reconciliation appropriate to this small app rather than promising zero leaked files.

Select one authenticated scheduled worker, including cadence, bounded batches, idempotent claiming/deletion, reference rechecks, retry limits and persistent-failure reporting. The proposed formula is linear, not exponential. A post-response task alone is not the same as a durable scheduled retry mechanism. Do not add another service unless this mechanism actually needs one.

### C07 — Specify request and byte accounting for CV delivery

Target: lines 449–455, 509–561, 742.

The integer request counter cannot by itself enforce a 5 GB monthly byte budget. Define atomic request/byte reservations, appropriately sized counters, monthly reset keys and responses when limits or the database are unavailable. Account for HEAD, bad/partial/suffix/open-ended ranges, full-file fallback, retries and aborted streams. Verify real PDF viewers, not only synthetic 31st-request tests.

Specify trusted IP extraction per chosen deployment. Vercel supplies its forwarding headers, but the same fallback code is not automatically trustworthy behind an arbitrary self-hosted proxy. Preserve rate-controlled delivery and ensure public caching or storage redirects do not bypass the intended limits.

### C08 — Repair and test the administrative recovery script

Target: lines 264–286. **Root supplemental finding R-1**, supported by the documented API signature; related reviewer authentication findings reinforce the need for an executable recovery path.

The snippet calls `deleteFactor({ userId, factorId: factor.id })`, whereas the current documented admin API uses `{ userId, id }`. It also ignores per-deletion returned errors while reporting success. Align the call with the selected pinned SDK, handle every error, supply the database dependencies and actual script entrypoint, and verify the owner ID deliberately. Revoke app authorization records and handle partial recovery failures without a false success message. [Supabase factor deletion](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor).

Acceptance: an isolated lost-device exercise demonstrates factor removal, invalidation of old app access, fresh owner sign-in and successful new enrollment. No public email-only bypass or administrative secret enters the web client.

### C09 — Define the initial content/media import

Target: lines 330–342, 390, 408, 681–687.

Source arrays contain local imports and remote URLs; required `media_assets` references cannot be populated by copying those arrays alone. Name the seed/import script, exact field mapping and verified asset inventory. Specify deterministic IDs or conflict keys, immutable storage keys, metadata extraction, image processing and retries/cleanup after partial failure. Preserve separate HeroRide frontend/backend links and certificate verification URLs. State how the initial CV is supplied rather than inventing a PDF from the current Drive link.

Acceptance: a clean seed succeeds and a repeated seed changes no unintended records or objects.

### C10 — Restore the complete application, not just two buckets

Target: lines 633–650, 712–716.

Saved drafts live in `private-staging` but are absent from the proposed object backup. Include every authoritative referenced object, with a policy for disposable raw files. Add actual object restoration, matching metadata, bucket/policy reconstruction, role/grant restoration and owner identity handling. Invalidate restored admin sessions and unused login proofs rather than resurrecting old authorization.

Document retention and consistency during capture, then rehearse a restore into an isolated target before cutover. `pg_restore` with stripped privileges needs a following ownership/grant procedure. Keeping the old static deployment is useful presentation rollback but does not restore database content or files.

### C11 — Turn phases into bounded, verifiable changes

Target: lines 294–317, 654–710, 743.

List exact create/modify/delete paths and old-to-new mappings. Resolve Vite scripts/configs, TypeScript aliases, root layout/CSS/fonts/providers and named client islands. Remove every `getLenis`/GSAP dependency before removing its package. Server database code must not be pulled into a whole-page client component.

Define inputs, validation, errors, transactions and version-conflict semantics for security-sensitive and content mutations. Specify atomic compare-and-update/version increments and reorder conflicts, including socials, which currently lack a version field. Give build/typecheck/lint/test commands and pass criteria per phase. Routine coding details need not become an oversized specification, but publication, authorization and concurrency rules cannot be left to guesswork.

### C12 — Make acceptance and evidence claims match

Target: lines 13–24, 46–49, 63, 75–87, 94–105, 604, 708–710, 745.

Change “Implemented” to proposed specification changes and “tested” to planned checks unless actual attributable records exist. Add reference viewports, approved differences for spacing repairs, repeatable production-build performance/regression measurements and explicit release gates. Define server-rendered content visibility separately from JavaScript-dependent CV/contact controls, with useful fallbacks where required.

The raw style reviewer rated all evidence-calibration issues Major. Root assessment keeps false completion/testing claims and missing acceptance criteria Major; overbroad wording about Git recovery, bundle savings, cropping, blank pages and uninspected EmailJS settings are editorial corrections, not additional security blockers. Attribute observations and remove unsupported numerical/universal claims.

### C13 — Record consequential choices and remaining owner decisions

Target: lines 107–122; related Section 16.

Incorporate or link the brief's alternatives, then record selection reasons for Drizzle runtime versus SDK/JWT data policies, request metering, and database session records. Concrete tradeoffs are sufficient; the reviewer questions are not instructions to add more infrastructure.

Keep hosting eligibility/budget, recovery policy and optional YouTube scope labelled with their actual approval status. Verify prices/quotas at deployment rather than presenting a universally portable $0 production promise. These choices need not block a recoverable local baseline, but the chosen host must be settled before its transport and operating limits become requirements.

## Nit

### C14 — Retain useful primitives before pruning

Target: lines 64–66, 695–699.

Existing Command, Dialog, Sheet, Tabs and Slider components can supply dashboard foundations. Identify retain/adapt/remove choices after the actual imports are known. New domain controls are justified; replacing the entire existing UI library is not a review requirement.

## Finding traceability

All raw finding IDs are accounted for; overlaps map to one corrective action rather than adding to its severity count.

| Action | Raw reviewer IDs |
| --- | --- |
| C01 | D7-1, I9-1, B9-1, E9-1 |
| C02 | C6-1, I9-2, B9-2, E9-2 |
| C03 | C6-3, Z8-4, I9-4, E9-4 |
| C04 | I9-5, B9-4, E9-6 |
| C05 | Z5-1, C6-2, C6-5, Z8-1, B9-6 |
| C06 | Z5-2, C6-4, Z8-2, I9-6, E9-3 |
| C07 | I9-7 |
| C08 | R-1 (root supplemental API verification; not attributed to Goldfish) |
| C09 | B9-5 |
| C10 | Z5-3, C6-6, Z8-3, I9-8, B9-8 |
| C11 | I9-3, B9-3, B9-7 |
| C12 | D7-3, S7-1, S7-2, S7-3, S7-4, S7-5, S7-6, E9-5 |
| C13 | D7-2, T7-1 |
| C14 | Z5-4, Z8-5 |

## Next handoff to Antigravity

Revise `docs/implementation-plan.md` against C01–C14. Add a resolution matrix with the precise changed section, verification source or intended test, and any explicitly contested finding. Resolve the two blockers before prescribing dependency installation or upload implementation. Preserve the owner's scope and fixed one-day session. Keep the single-app architecture and avoid introducing services merely to answer a review question. Complete publication, recovery and restoration contracts before the affected phases.

This handoff requests a plan revision, not package installation, database mutation, deployment or DNS changes. After the revised plan is checked, targeted review of repaired critical sections can verify the changes. This pass has not declared convergence or approved implementation.
