# Agy task: close release test gaps and remediate dependencies

Work in `C:\projects\mohammadardi-portfolio`. Read `README.md`, `RELEASE_READINESS.md`, `CODEX_FEATURE_REVIEW.md`, and `BACKEND_SETUP.md`, then inspect the current HEAD/worktree. This task implements the remaining automated checks and necessary compatibility fixes. Do not merely restate this plan.

## Boundaries

- The owner wants these remaining tests implemented through agy CLI, then reviewed by Codex. Preserve unrelated work. Do not commit/push/deploy or change repository visibility; return a report and code for review.
- Never print `.env.local`, passwords, tokens or TOTP codes. Offline tests and CI must not need the real owner account or production database. Use isolated database/provider fixtures. Never reset/seed the owner's project or run MFA/password recovery against it.
- Keep private buckets/schema, restricted roles, fixed 24-hour sessions, nonce generations and the interrupted-password-change gate. Do not replace verified guards with cookie-only checks, add forgot/reset-password features, or weaken publication privacy to make tests pass.
- Applied migration files must remain byte-identical. A dependency update should not require hosted schema changes. If a genuine schema correction is needed, generate an additive migration and leave it for Codex review before applying it.
- Use the existing test runner and PGlite where appropriate. Extract small production services/SQL builders for testability if necessary; tests must exercise production logic, not a duplicated toy implementation. Do not add broad production-only test backdoors or new paid services.

## 1. Dependency remediation

Run a fresh `pnpm audit --prod` and read the linked maintainer advisories. The reviewed lockfile had four high/two moderate findings: Drizzle 0.38.4 (patched >=0.45.2), PostCSS 8.4.31 through Next.js (the listed advisories together require >=8.5.23), and Zod 3.25.76 (registry advisory patched >=4.6.6).

Verify published stable versions and compatibility before choosing exact pins. Upgrade Drizzle/Kit as a compatible stable pair if needed, adapt Zod usage and resolver compatibility, and resolve Next's PostCSS dependency with a supported framework update or narrowly scoped, tested override. Do not blindly run `audit --fix --force`, switch to release candidates, rewrite migration history, suppress advisories, or claim that an audit finding proves route exploitability. Inspect the actual locked graph and document exposure/mitigations for any finding that remains.

Retest private-schema policies, production SQL result shapes, existing migration reading/hash validation and installed SDK typing after changes. Preserve the working database and login behavior.

## 2. CV regression and requested preview behavior (highest functional priority)

The owner uploaded a real PDF. Preview/download returned HTTP 500 because `app/api/resume/route.ts` interpolated raw JS Date values that the production postgres driver could not serialize. Codex changed these to ISO strings with timestamptz casts, added a bounded error response, and made the download button verify success/MIME/%PDF- before saving `Resume.pdf`. The Open PDF/new-tab action was removed.

Add regression tests that catch this original failure. PGlite alone accepts values the production driver may reject: inspect actual production query parameters/encoders or use an isolated real-Postgres integration check; do not reintroduce Date interpolation while extracting builders.

Cover GET/HEAD and full/open-ended/suffix ranges; 416; correct PDF type, bytes, content length and attachment filename; absent CV; exhausted IP/monthly limits; month rollover; Storage failure; and client rejection of 429/5xx, non-PDF MIME or invalid signature without downloading an error as `.txt`. Assert that HEAD performs no Storage download. Mock the external storage/provider; don't modify the owner's resume or spend production bandwidth for automated tests.

The owner wants **preview inside the dialog and Download only**, with scrolling available but scrollbars visually hidden. The existing native iframe uses PDF viewer hints, which browsers may ignore. Verify this honestly. If needed, implement a controlled PDF canvas renderer (e.g. a currently patched PDF.js version, lazy loaded only when the dialog opens), with a matching same-origin worker, accessible keyboard/touch scroll area, loading/error states, cleanup on close, and no new-tab action. Hide scrollbar chrome without disabling scrolling/focus. Reuse one fetched buffer where practical instead of fetching all bytes per page. Keep PDFs private and rate limited; do not add a public bucket or signed URL shortcut. No unsupported promise that iframe CSS controls native browser PDF toolbars.

## 3. Authenticated route and password-change tests

Test actual guarded production paths with controlled dependencies: unauthenticated/wrong owner/AAL1, missing verified factor, expired/revoked session, blocked security operation, wrong origin, malformed/oversized body, wrong current password, wrong/non-owned factor and wrong fresh TOTP. Verify the temporary client is memory-only and cannot replace SSR cookies.

Assert no credential mutation/revocation occurs before valid password and TOTP proofs. Test every post-begin failure: provider 4xx, 5xx, network ambiguity, global sign-out failure, database finish failure and interrupted operation. Check response status/signInAgain, persistent gate state, old session/proof rejection and new-login behavior. Preserve serialization between primary-login proof issuance, final MFA authorization and password changes; include meaningful interleaving/race tests rather than only sequential success cases. Do not invoke a real owner password change.

## 4. Content and media lifecycle tests

- Call production video mutations: import succeeds/fails; fallback draft; duplicate insert/update race; URL replacement; refresh failure retains saved metadata/edits; override survives refresh and clears back to provider title; publish/unpublish/delete; stale versions return 409; public projection excludes drafts/deleted rows; public cache invalidation occurs only as appropriate.
- Test upload boundaries and media lifecycle: invalid purpose/format, oversized body/input/pixels, animated input, transparency/orientation, hard byte ceiling and difficult-image failure. Do not claim exhaustion testing from a solid-color image that compresses on the first attempt.
- Test promotion/cleanup failures and compensation, referenced object protection, row locking/two workers, lease expiry, retry backoff and retention. Verify unpublishing/deletion denies the old public media URL even after prior successful reads.
- Inspect reconciliation for the new YouTube table: deleted videos should have the same documented retention/pruning policy as other editorial collections, without deleting live rows or touching Storage unnecessarily. Fix with a regression if missing.
- Cover same-origin/body/rate validation and safe errors, including null JSON and invalid URLs. Do not loosen guards or limits to simplify fixtures.

## 5. Repeatability, CI and report

Add a minimal secrets-free GitHub Actions check for frozen install, lint and the offline test suite. Pin/verify action releases and minimal read-only permissions. Never make PR CI depend on production secrets or run destructive bootstrap/cleanup there. If a fresh-checkout type check/build needs generated Next.js types, database content or font access, handle that explicitly and document the distinction; don't invent a success from a warm `.next` folder.

Run `pnpm test`, `pnpm lint`, `pnpm build`, then `pnpm typecheck` sequentially, plus the fresh audit. Build/integration checks needing configured services must be separated from offline tests. Never report a percentage of coverage without a real coverage command/output and clear scope. Broad coverage percentages don't replace the failure cases above.

Write `AGY_RELEASE_TEST_REPORT.md` at the root with actual base commit, changed files, dependency before/after graph and advisory results, a requirement-to-test matrix (test names/files), actual commands/results, fixture/isolation details, browser/PDF observations, remaining manual/release gates and limitations. Update readiness docs to match evidence. Preserve owner-confirmed password change/new login/YouTube publish; don't extrapolate that confirmation to other cases.

Return code and the report for Codex review. Do not declare the whole site production-ready or "tested in all angles" based on this batch alone.
