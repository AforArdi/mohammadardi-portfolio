# Codex review of the Next.js 16 batch — 2026-11-10

The migration and PDF/test improvements are retained. This report supersedes unqualified acceptance claims in the agy report. Changes remain uncommitted; no deployment was performed.

## Corrections applied

- Immediate publication invalidation: replaced revalidateTag's `max` profile with `{ expire: 0 }`. The max profile permits stale-while-revalidate content, contrary to immediate unpublish/delete expectations. The public route is also invalidated. Official reference: https://nextjs.org/docs/app/api-reference/functions/revalidateTag.
- CI now runs `next typegen` before TypeScript rather than relying on a local `.next` directory. The tsconfig explicitly includes `proxy.ts` instead of the removed middleware path.
- Content lifecycle tests now mock the external fetch boundary while calling the real metadata service/mutations. Their earlier supposedly offline imports could call YouTube.
- Worker synchronization fails the build when the source worker is absent; it no longer reports success while leaving a missing/stale public worker.
- Visual verification selects the hero's Download My CV trigger, not the first generic dialog button. It must find the resume title, download action and rendered canvas before claiming success. A typed verification result keeps that assertion checked by TypeScript.

## Invalid visual evidence

Directly inspecting `screenshots/resume-dialog.png` shows the Navigation sheet, not the PDF dialog. The original script selected the first button with aria-haspopup=dialog, which can be the navigation trigger. Its fallback allowed a generic muted-text element as the PDF container, then logged success without asserting the state.

The agent's PDF-browser-verification claim is therefore not accepted. Preserve the original screenshot as review evidence; repeat the check using the correct trigger, bounded loading waits, actual canvas visibility, wheel/touch/keyboard scrolling, absence of visible scrollbars and the exact downloaded filename. Verify download after preview, not just the standalone download URL. Do not regenerate it by running unapproved raw browser-control code in this Codex session; use the permitted browser workflow or return the task to the owner's agy workflow.

## Independent results

- Revised offline suite: 26/26 passed.
- Production dependency audit: no known vulnerabilities reported.
- ESLint: passed; focused lint after edits also passed.
- Fresh Next.js 16.4.6 production build: passed, with Proxy registered.
- Post-build type generation and TypeScript: passed.
- Running Next.js 16 preview on port 3102: API smoke passed, including unauthenticated admin redirect/401, origin 403, private WebP delivery, blocked Storage bypass, valid real PDF attachment bytes/name and HEAD ranges 206/416, and authenticated/unauthenticated maintenance checks.
- Known-value source/history secret scan is recorded after completion below. Such checks are not exhaustive secret detection.

Clean-source typecheck verification uses a temporary source copy without .env or generated .next files, linked to the already installed dependency tree. This checks type generation independence, not a full fresh network install or a real GitHub Actions run. Final result is recorded below.

## Remaining release work

Correct the invalid PDF visual evidence first. Google domain allowlisting, provider-side CAPTCHA enforcement and actual email delivery, isolated backup/restore rehearsal and final hosting/HTTPS configuration remain open. Production-boundary testing is substantially improved but not an assurance of every failure/race case; screenshots cannot prove all accessibility or performance behavior.

No owner password, authenticator, repository visibility or DNS settings were changed by this review. The smoke test called the existing maintenance endpoint. No commit/push was made.

Final results: clean-source type generation/typecheck passed without .env or pre-existing .next (installed dependencies reused). Known-value source/history scan passed for 210 current paths plus textual Git history; no private values were printed. The new review report was written after that scan. git diff --check passed.
