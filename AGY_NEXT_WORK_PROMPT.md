# Portfolio: image budget and My YT Week implementation handoff

Date: 2026-11-10. Implement the two scoped features below in `C:\projects\mohammadardi-portfolio`. Read this entire file before changing code. This is an implementation task, not another planning exercise.

## Context and working rules

- Inspect the current branch, working tree, root operational docs (`BACKEND_SETUP.md`, `BACKEND_STATUS.md`), relevant source, tests, and any applicable repository instructions. The inspected checkpoint was `b841777`; discover the actual current HEAD rather than resetting to that hash. Preserve unrelated owner changes.
- This is an existing Next.js App Router portfolio with Supabase Auth/Storage, a private `portfolio` database schema accessed through Drizzle, an owner CMS, mandatory TOTP, and fixed 24-hour admin authorization. Preserve the working dark/purple design and existing behavior.
- Supabase Free is the target. Add no paid service, second database, YouTube API key requirement, paid image transformations, or new animation library. Use the existing `motion/react`, Reveal, reduced-motion support, and server-rendered content.
- Credentials already belong in the ignored `.env.local`. Never print, copy into reports, or commit credential values. Do not ask for passwords or authenticator codes in chat.
- The SureSale backend is a READ-ONLY reference: `C:\projects\rise-together\suresale-new\suresale-backend-v2`. Do not edit it.
- Do not commit, push, deploy, change billing, or modify the enrolled owner's authentication. Return the local implementation and a review report for Codex.

## A. Enforce a bounded WebP output budget

The portfolio already uses Sharp in `src/lib/storage/images.ts`; Next.js handles its multipart upload route. Do NOT add Multer or Express. Read the SureSale `src/modules/upload/image-processor.ts` for its bounded quality/dimension retry pattern, but do not copy its watermark, broad MIME acceptance, or 100 MB Multer limit.

1. Enforce a hard maximum of **400,000 bytes per newly stored image** (decimal 400 KB). Smaller files stay smaller; do not pad or unnecessarily degrade them.
2. Use a small, centrally defined set of image purposes. Suggested starting budgets: icon 256px/40,000 bytes; portrait 800px/160,000 bytes; project 1600px/250,000 bytes; certificate up to 2400px/400,000 bytes. Keep certificate text legible. Adjust these smaller targets only with documented visual evidence; never exceed the universal ceiling.
3. Decode only supported JPEG/PNG/WebP with the existing input-byte and decoded-pixel bounds. Preserve EXIF orientation and alpha, strip metadata, avoid upscaling, and explicitly handle/reject animated inputs. Do not accept arbitrary SVG. Keep PDF validation and the 3.5 MB PDF limit separate.
4. Compress from the decoded source with a bounded number of attempts: lower quality to an explicit clamped floor, then reduce dimensions within a documented readability floor. Do not repeatedly encode the previous lossy output, run an unbounded loop, or return an oversize file when attempts run out. Give a useful validation error if it cannot fit safely.
5. Wire the purpose through upload handling, client preparation, and relevant editor controls. Validate purpose server-side against an allowlist. The server is authoritative; client canvas downscaling only helps fit the transport limit. Retain the bounded multipart request reader (4,000,000 bytes) and input file cap (3,500,000 bytes).
6. Reuse the same image policy for future seed imports instead of keeping a separate quality-only Sharp path. Preserve seed IDs and non-destructive defaults. Do not reset content, re-upload existing assets, or bulk rewrite stored objects.
7. Keep UUID object paths, private buckets, publication checks, cleanup queue, and reference protection. The bucket named `public-media` intentionally remains private.

Codex's read-only metadata inventory found seven WebP asset records, totaling 656,324 bytes, largest 144,584 bytes, with none over 400,000. This is not an inventory of all Storage objects. No bulk recompression is justified by those records.

## B. Implement manually curated My YT Week

The owner explicitly chose **manual published selection**: videos remain visible until edited, unpublished, or deleted. Do not add calendar-week filtering, automatic expiry, archive jobs, or scheduling.

### Data and admin

- Add an additive Drizzle migration for a `portfolio` video collection. Include UUID, canonical YouTube video ID/URL, fetched title, nullable owner title override, owner description, validated thumbnail URL, metadata-fetch timestamp, display order, publication flag, soft deletion, timestamps, and optimistic-concurrency version. Retain useful channel attribution if returned by the provider.
- Reuse the existing content CRUD conventions, owner guard, same-origin checks, input limits, rate limiting, version conflicts, and public-cache invalidation. Provide dashboard import, preview, edit, publish/unpublish, order, delete, and explicit metadata refresh.
- Save the original fetched title separately. Display `trimmed owner override || fetched title`; clearing the override restores the fetched title. The owner's short description appears immediately after the displayed title. Do not erase the description or override during metadata refresh.
- Validate duplicate active video IDs deliberately and return a useful conflict error instead of silently creating duplicate cards.

### Metadata fetching

- Prefer YouTube oEmbed for title and thumbnail, with no API key. Verify current provider behavior against an actual known public video; record the result honestly. Do not scrape arbitrary pages or download videos.
- Parse only supported, exact YouTube hosts and known watch/short-link/shorts/live/embed paths. Require a valid 11-character video ID; reject credentials, unexpected ports, lookalike hosts, non-HTTPS input, malformed IDs, and playlist-only links. Normalize to a canonical watch URL and strip tracking parameters.
- Construct a fixed YouTube oEmbed request from the validated ID. Never server-fetch the submitted URL or a returned arbitrary thumbnail URL. Disable redirects or strictly validate every redirect destination. Apply a short timeout, bounded response size, JSON shape checks, and owner rate limits.
- Never inject oEmbed HTML. Allow only explicitly trusted YouTube thumbnail CDN hosts and safe URL shapes. Render the remote thumbnail directly and lazily; do not copy it into Supabase Storage or proxy/optimize it through Supabase. Do not introduce Next.js image-proxy fetching of arbitrary provider URLs.
- Fetch metadata only on owner import/explicit refresh, never on public page requests. Handle unavailable/private/deleted videos and provider failures without breaking existing content. Allow a draft with a manual title and neutral placeholder when metadata is unavailable; explain the fallback in the editor. Do not fabricate a fetched title or silently publish broken metadata.

### Public section

- Add a responsive section titled `My YT Week` with the existing purple hash-heading style and anchor `my-yt-week`. Hide it and its navigation entry when there are no published, non-deleted entries.
- Render a lightweight thumbnail, chosen display title, owner description, and clear YouTube destination. Prefer a normal external watch link, not an automatically loaded player. No autoplay or video storage. Use safe external-link attributes and accessible names.
- Match the portfolio cards/glow/spacing and apply restrained existing Motion reveals/hover behavior. Respect reduced motion and preserve content when JavaScript is unavailable.
- Recheck navigation with the additional section, particularly tablet widths; desktop links and the mobile sheet must use matching breakpoint behavior. Check 375, 768, 1024, 1280, and 1440 px if browser tools are available. Do not claim visual checks that were not performed.

### Database application

- Generate and inspect the additive migration and snapshot/journal metadata. Test locally first using the existing isolated database approach. Do not edit previously applied migrations.
- Retain restricted roles, RLS, and revocations from PUBLIC/anon/authenticated for the new table. Use the existing custom migration runner and scoped credentials; do not grant database-wide CREATE or use a replacement migrator that requires broader permissions.
- If the existing configured environment is available and local checks pass, apply only this additive portfolio migration with the existing runner. Do not reset, reseed, or change Auth/Storage configuration. Record exactly which migration was applied; if access is unavailable, leave it ready and identify the blocker without claiming completion.

## Separate Codex-owned security work: password change

Do not implement a password form, endpoint, authentication refactor, or session-cache changes in this batch. Codex will handle the password-change backend and review its failure/race behavior separately. These are the owner's confirmed requirements, not a request for another owner decision:

- Owner must already be inside the authorized dashboard and provide current password, new password/confirmation, and a freshly verified authenticator code.
- Existing AAL2 alone is insufficient for the sensitive action. Current-password verification must not replace/downgrade the active SSR cookie session; use an isolated memory-only auth client for re-verification.
- Successful change forces fresh password-plus-TOTP login and invalidates old dashboard authorizations and pending login proofs. Resolve concurrent login/change operations and partial failures explicitly; Supabase Auth writes and application SQL are not one atomic transaction.
- Verify exact APIs against the installed SDK and official documentation. Its installed UserAttributes exposes `current_password`; do not guess parameter spellings or hide incompatibility with `as any`. Supabase email reauthentication is not the requested TOTP verification.
- No public or dashboard forgot-password/reset feature, email-only bypass, credential logging, or direct editing of Supabase Auth internals.

## Free-tier efficiency boundaries

Keep the existing private media/no-store/unpublish behavior. Do not make buckets public, expose signed source URLs, or enable persistent public image caching just to reduce bandwidth. Do not add a cache of publication/auth decisions.

In the report, briefly assess two existing costs for a later Codex pass: repeated private image blob downloads, and the CV endpoint downloading the whole PDF before slicing a Range response. Its 5 GB monthly response-byte reservation does not cap all Supabase egress. No CV delivery or security-sensitive caching rewrite is included in this batch. A future bounded server-only cache of immutable image bytes would still need a live publication check before every response.

## Verification and handoff

Add meaningful tests for compression limits and invalid images; YouTube parsing and SSRF cases; metadata timeout/invalid responses; title override/fallback; published-only projection; optimistic edit conflicts; and migration grants. Confirm the existing tests remain green. Mock external failures in tests instead of relying on the live network.

Run `pnpm test`, `pnpm lint`, `pnpm build`, then `pnpm typecheck` sequentially (avoid competing generated Next.js types/build outputs). Exercise authenticated CRUD through the existing supported approach without asking for or extracting the owner's browser cookies. If an owner-only manual check remains, identify it accurately.

Write `AGY_IMPLEMENTATION_REPORT.md` at the repository root with:

1. Actual base commit, changed files, implemented behavior, and deliberate scope exclusions.
2. Exact command results and test counts; distinguish automated checks, live provider checks, and unperformed/manual checks.
3. Image purpose settings, measured outputs, attempts/floors, and difficult-image behavior.
4. YouTube URL/fetch rules, unavailable-video behavior, title override behavior, and migration/grant results.
5. Any hosted migration actually applied, operational limitations, and remaining issues for Codex review.
6. Confirmation that SureSale was unchanged; no secrets were printed; no password/auth/billing/deployment changes were made; and no commit/push occurred.

Finish with the working tree ready for Codex to inspect. Do not label the whole portfolio production-ready based on this feature batch.
