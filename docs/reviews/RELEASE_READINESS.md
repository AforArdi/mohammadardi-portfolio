# Production readiness — 2026-11-10

**Decision: not ready to declare a production release.** This checkpoint can be committed as working source. Neither a successful build nor the current unit suite establishes complete coverage. Publishing a source repository and deploying a production website are separate decisions.

## Evidence we have

- Twelve offline test groups cover validation, image budgets/orientation/animation, YouTube URL/metadata handling, private-schema permissions, nonce consumption, session deadlines, optimistic versions, and password-change workflow/generation rules.
- The earlier production build, lint, separate type check, API smoke test, live YouTube probe and known-secret browser-bundle scan passed. The PDF correction below requires its own fresh build/live check; final results will be appended.
- The owner explicitly confirmed successful password change, new login, and YouTube publishing in the real browser. This does not establish YouTube editing/unpublishing/deletion or all negative authentication cases.
- The owner uploaded a real PDF and reported that downloading saved a text file. Codex reproduced HTTP 500 for both preview and download. Server logs identified an unsupported raw JavaScript Date parameter in the Postgres quota query. The query now passes ISO timestamps with explicit casts; the dialog checks status, MIME type and PDF signature before creating a `.pdf` download. The separate Open PDF link is removed.
- MIT licensing for code/technical documentation was explicitly authorized. Personal content and third-party assets are excluded. A known-value scan of current files and textual Git history found none of the configured private credentials; that is not an exhaustive secret scan.

## Dependency audit: remediated (2026-11-10)

`pnpm audit --prod` reports **0 vulnerabilities** (clean audit, 0 findings) following the dependency remediation batch:

| Package | Previous Version | Remediated Version | Resolution / Advisory |
| --- | --- | --- | --- |
| `drizzle-orm` | 0.38.4 | 0.45.4 | Patched >= 0.45.2 ([GHSA-gpj5-g38j-94v9](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9)) |
| `drizzle-kit` | 0.30.4 | 0.31.11 | Compatible stable companion pair with `drizzle-orm` 0.45.4 |
| `postcss` | 8.4.31 (via `next`) | 8.5.32 | Overridden via `pnpm.overrides` resolving [GHSA-qx2v-qp2m-jg93](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q), [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp), and [GHSA-r28c-9q8g-f849](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849) |
| `zod` | 3.25.76 | 4.6.7 | Patched >= 4.6.6 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) |

## Automated test coverage (26 tests passing)

The automated offline test suite now contains 26 tests across 4 suites:
1. `tests/backend.test.ts` (9 tests): AAL2 owner authorization, range header parsing, content validation schemas, image budgets / purpose ceilings, EXIF orientation / alpha / noise retry ceilings, YouTube URL parsing and SSRF guards, oEmbed provider mocking, PostgreSQL private roles / migrations / MFA nonces, and YouTube display title resolution.
2. `tests/cv.test.ts` (7 tests): Exact attachment filename `Mohammad-Ardi-Resume.pdf`, full / suffix / open-ended Range handling, 416 invalid ranges, HEAD zero-storage-download verification, 404/502/503 error responses, IP cap (60/10m) and 5GB monthly quota, month rollover, PGlite timestamp serialization regression (ISO strings with timestamptz casts), and client-side error/signature rejection.
3. `tests/password.test.ts` (5 tests): Password input validation, step-by-step failure recovery / gate persistence, durable password gate / generation revocation / private grants, same-origin enforcement and request body limits (413), and memory-only Supabase client isolation.
4. `tests/content-lifecycle.test.ts` (5 tests): Video mutation lifecycle (insert, active duplicate conflict 409, stale version conflict, title override persistence across refresh, soft delete and re-insert), public query projection (draft / soft-delete filtering and display order), 7-day reconciliation pruning for `portfolio.youtube_videos`, storage cleanup queue reference protection / SKIP LOCKED concurrency, and image upload edge cases (SVG rejection, fake bytes, EXIF orientation 6, alpha preservation, Gaussian noise floors).

## Missing automated tests

The existing tests are useful but not comprehensive. They largely exercise pure helpers, SQL builders and mocked workflow steps. Important remaining targets:

1. **Real CV response path:** production-driver-compatible timestamp serialization, actual PDF bytes and attachment filename, GET/HEAD/206/416/429/503, month rollover, exhausted quota, upstream Storage failure, and client refusal to save error responses as files.
2. **Authenticated route behavior:** wrong owner/AAL, expiry/revocation, fresh TOTP/current-password rejection, body/origin limits, isolated verification cookies, and failures at every password-change phase.
3. **Actual content mutation behavior:** video import/refresh failures, override retention, publish/unpublish, duplicate races, stale edit/delete conflicts, and cache invalidation. Calling a parallel test-only implementation is insufficient.
4. **Storage lifecycle:** live-reference protection, two cleanup workers, leases/retries, failed promotion/upload compensation, soft-delete retention, and public media denial after unpublish/delete.
5. **Image edge cases:** noisy inputs that reach retry exhaustion/floors, decoding/input-byte limits, invalid purpose and alpha/orientation handling through the upload boundary.
6. **Clean-checkout repeatability:** install with frozen lockfile, offline tests without owner credentials, environment placeholders, and a basic secrets-free CI gate.

The implementation task for these gaps and dependency remediation is [AGY_RELEASE_TEST_PROMPT.md](../handoffs/AGY_RELEASE_TEST_PROMPT.md). The owner requested this next batch through agy CLI. Codex will review the resulting code/report before accepting release readiness.

## Browser and operational release gates

- Recheck the corrected real PDF download and in-dialog preview. The iframe requests hidden PDF chrome/scrollbars, but native PDF viewers may ignore those hints. If truly invisible scrollbars are required across browsers, use a controlled, lazy-loaded PDF renderer with keyboard/touch scrolling and verify it visually; do not claim CSS can control browser-extension internals.
- Verify YouTube edit, override clearing, refresh, unpublish and delete. Confirm both section and navigation visibility follow published content.
- Check representative uploads, certificate legibility, keyboard focus/dialog behavior, reduced motion, and widths 375/768/1024/1280/1440. Measure performance rather than claiming a Lighthouse score from bundle size.
- Verify actual contact delivery and provider-side CAPTCHA/origin restrictions. The existing client integration still embeds owner-specific public provider identifiers; fork users need their own configuration.
- Rehearse backup/restore and offline recovery in an isolated environment. Do not run recovery against the working owner's authenticator/password to prove a test.
- Choose hosting, configure production origins/environment and daily cleanup, and verify HTTPS/cookie behavior. No deployment, repository visibility change, or DNS cutover is authorized by this commit.
- Account for repeated private image/PDF reads. The app's 5 GB CV response counter is not a limit on all Supabase bandwidth. Free-tier suitability depends on real traffic.

## Acceptance rule

Keep an evidence table of passed, failed and unperformed checks. Do not claim "all angles tested", "100% secure", or "production-ready" while relevant failures or release gates remain. After the agy batch, reassess using the current audit, code, actual test results and owner feedback.

## Final checkpoint checks

- `pnpm test`: 12/12 existing offline test groups passed. Remaining tests above are still required.
- `pnpm lint`, fresh `pnpm build`, and subsequent `pnpm typecheck`: passed. Homepage first-load JavaScript was 174 kB in this build; no Lighthouse score is claimed.
- Rebuilt production preview: `tests/server-smoke.ts` passed, now exercising the uploaded resume's GET response, `application/pdf`, `.pdf` attachment filename, actual `%PDF-` signature and body. HEAD suffix range returned 206, invalid range 416. Guarded APIs, cross-origin denial, private Storage, and the existing maintenance endpoint checks passed. Owner browser download/preview confirmation after this correction is still pending.
- Configured private-value scans: 44 browser assets plus 180 current repository files and textual Git history passed. These are known-value checks, not exhaustive secret scanning. `.env.local` is not tracked.
- Dependency audit still reports four high/two moderate findings. No dependency upgrade or advisory suppression was performed in this checkpoint. The agy task is required before production acceptance.

The owner authorized a local source commit including README/license and this checkpoint; no push, deployment or visibility change is included. The local preview is available at http://localhost:3101.
