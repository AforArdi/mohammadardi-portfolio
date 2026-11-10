# Production readiness — 2026-11-10

**Decision: not ready to declare a production release.** This checkpoint can be committed as working source. Neither a successful build nor the current unit suite establishes complete coverage. Publishing a source repository and deploying a production website are separate decisions.

## Evidence we have

- Twelve offline test groups cover validation, image budgets/orientation/animation, YouTube URL/metadata handling, private-schema permissions, nonce consumption, session deadlines, optimistic versions, and password-change workflow/generation rules.
- The earlier production build, lint, separate type check, API smoke test, live YouTube probe and known-secret browser-bundle scan passed. The PDF correction below requires its own fresh build/live check; final results will be appended.
- The owner explicitly confirmed successful password change, new login, and YouTube publishing in the real browser. This does not establish YouTube editing/unpublishing/deletion or all negative authentication cases.
- The owner uploaded a real PDF and reported that downloading saved a text file. Codex reproduced HTTP 500 for both preview and download. Server logs identified an unsupported raw JavaScript Date parameter in the Postgres quota query. The query now passes ISO timestamps with explicit casts; the dialog checks status, MIME type and PDF signature before creating a `.pdf` download. The separate Open PDF link is removed.
- MIT licensing for code/technical documentation was explicitly authorized. Personal content and third-party assets are excluded. A known-value scan of current files and textual Git history found none of the configured private credentials; that is not an exhaustive secret scan.

## Dependency audit: action required

`pnpm audit --prod` reported **four high and two moderate advisories** on 2026-11-10 (zero critical). These are affected-package findings, not proof that the application's exposed routes are exploitable. Resolve or document applicability with evidence before release; do not silently suppress them.

| Installed package | Advisory | Reported patched range |
| --- | --- | --- |
| Drizzle ORM 0.38.4 | [Identifier escaping / SQL injection](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9) | >= 0.45.2 |
| Next.js dependency PostCSS 8.4.31 | [GHSA-qx2v-qp2m-jg93](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93) | >= 8.5.10 |
| Same PostCSS copy | [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q) | >= 8.5.12 |
| Same PostCSS copy | [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) | >= 8.5.23 |
| Same PostCSS copy | [Source-map path traversal](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849) | >= 8.5.18 |
| Zod 3.25.76 | [Oversized collection validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | >= 4.6.6 |

Check current maintainer guidance and registry metadata again when implementing. Drizzle's advisory concerns untrusted identifiers; this app predominantly uses static schema objects and allowlists. PostCSS here processes application CSS rather than accepting visitor CSS. Zod request bodies are bounded. Those observations inform exposure analysis; they do not substitute for patching/compatibility checks.

## Missing automated tests

The existing tests are useful but not comprehensive. They largely exercise pure helpers, SQL builders and mocked workflow steps. Important remaining targets:

1. **Real CV response path:** production-driver-compatible timestamp serialization, actual PDF bytes and attachment filename, GET/HEAD/206/416/429/503, month rollover, exhausted quota, upstream Storage failure, and client refusal to save error responses as files.
2. **Authenticated route behavior:** wrong owner/AAL, expiry/revocation, fresh TOTP/current-password rejection, body/origin limits, isolated verification cookies, and failures at every password-change phase.
3. **Actual content mutation behavior:** video import/refresh failures, override retention, publish/unpublish, duplicate races, stale edit/delete conflicts, and cache invalidation. Calling a parallel test-only implementation is insufficient.
4. **Storage lifecycle:** live-reference protection, two cleanup workers, leases/retries, failed promotion/upload compensation, soft-delete retention, and public media denial after unpublish/delete.
5. **Image edge cases:** noisy inputs that reach retry exhaustion/floors, decoding/input-byte limits, invalid purpose and alpha/orientation handling through the upload boundary.
6. **Clean-checkout repeatability:** install with frozen lockfile, offline tests without owner credentials, environment placeholders, and a basic secrets-free CI gate.

The implementation task for these gaps and dependency remediation is [AGY_RELEASE_TEST_PROMPT.md](./AGY_RELEASE_TEST_PROMPT.md). The owner requested this next batch through agy CLI. Codex will review the resulting code/report before accepting release readiness.

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
