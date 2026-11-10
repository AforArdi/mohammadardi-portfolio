# AGY Implementation Report: Image Budget & My YT Week

**Date**: 2026-11-10  
**Repository**: `C:\projects\mohammadardi-portfolio`  
**Base Commit**: `b841777` ("feat: add Supabase-backed portfolio admin dashboard")  
**Branch**: `main`  
**Author**: AGY  
**Audience**: Codex Reviewer  

---

## 1. Executive Summary & Scope

This report documents the implementation of the two features specified in `AGY_NEXT_WORK_PROMPT.md`:
1. **Bounded WebP Image Budget System**: Enforces purpose-specific byte and dimension limits with a universal ceiling of 400,000 bytes (400 KB decimal) on all newly stored raster images, featuring bounded iterative compression, multi-frame/animated rejection, EXIF orientation/metadata stripping, and decoding limits without generational degradation.
2. **Manually Curated My YT Week**: End-to-end additive collection (`portfolio.youtube_videos`) with strict URL validation, SSRF protection, keyless YouTube oEmbed metadata extraction, title override logic, graceful fallback handling, private RLS grants, and a responsive public section (`#my-yt-week`) styled with the portfolio's purple aesthetic.

### Deliberate Scope Exclusions
- **Password Change / Re-authentication**: Left strictly for Codex per explicit instructions. No password form, endpoint, or auth refactor was added.
- **Paid Services / External Transformations**: No Supabase image transformation add-on, no second database, no YouTube Data API v3 key requirements.
- **Multer / Express**: Zero external upload middleware added; leverages Next.js App Router streaming multipart reader.
- **Calendar Expiry / Scheduling**: Manual editorial lifecycle only; no cron-based or calendar-week auto-archiving.
- **Git State**: No commit, push, deployment, or billing changes performed.

---

## 2. Changed & Created Files

| File | Status | Description |
|---|---|---|
| `src/lib/storage/images.ts` | Modified | Purpose budgets, universal 400 KB ceiling, 24 MP decode guard, EXIF strip, alpha preserve, animated reject, single-source retry loop. |
| `app/api/admin/upload/route.ts` | Modified | Server-authoritative allowlist validation of `purpose` query/form field; passes purpose to `prepareImage`. |
| `src/components/admin/ImageUpload.tsx` | Modified | Added `purpose` prop, client canvas pre-scaling matching budget ceiling to assist multipart transport, and budget helper text. |
| `scripts/seed-portfolio.ts` | Modified | Updated seed import logic to reuse `prepareImage(buffer, purpose)` instead of a separate quality-only Sharp pipeline. |
| `src/lib/youtube/service.ts` | **New** | Strict YouTube URL parser, CDN allowlist thumbnail validator, and keyless oEmbed metadata fetcher with SSRF guards. |
| `src/db/schema.ts` | Modified | Defined `youtubeVideos` table in schema `portfolio` with UUID, canonical URL, fetched title, title override, soft deletion, and optimistic version. |
| `src/db/migrations/0002_youtube_videos.sql` | **New** | Additive Drizzle migration: table creation, indices, RLS enablement, `portfolio_app` CRUD grants, and revocations from `PUBLIC`, `anon`, `authenticated`. |
| `src/db/migrations/meta/_journal.json` | Modified | Drizzle migration journal updated with entry for `0002_youtube_videos`. |
| `src/db/migrations/meta/0002_snapshot.json` | **New** | Drizzle schema snapshot for migration 0002. |
| `drizzle.config.ts` | Modified | Replaced default import with named `loadEnvConfig` from `@next/env` to fix drizzle-kit CLI ESM execution. |
| `src/lib/content/validation.ts` | Modified | Added `videoInput` Zod schema enforcing string lengths, URL shape, and preventing mass assignment. |
| `src/lib/content/mutations.ts` | Modified | Added `"videos"` collection handler with duplicate active video conflict detection (409), metadata fallback handling, and optimistic locking. |
| `app/api/admin/youtube/preview/route.ts` | **New** | Owner-only, same-origin, rate-limited endpoint for previewing YouTube metadata in the CMS before saving. |
| `src/lib/content/public.ts` | Modified | Added `videos` query projection (`displayTitle = trimmed override || fetched title || "YouTube Video"`, channel attribution, ordered by `displayOrder`). |
| `src/components/MyYtWeekSection.tsx` | **New** | Responsive `#my-yt-week` section with purple hash heading, direct lazy `<img>` from trusted YouTube CDN, neutral fallback, and accessible link. |
| `app/(public)/page.tsx` | Modified | Injected `<MyYtWeekSection>` conditionally; hides section if no published videos exist. |
| `app/(public)/layout.tsx` | Modified | Wired navigation to include `"my-yt-week"` hash link only when published videos are present. |
| `src/components/Navbar.tsx` | Modified | Refined responsive styling (`gap-3 lg:gap-6 text-xs lg:text-sm`) to ensure tablet widths (768px-1024px) do not experience link wrapping. |
| `src/components/admin/ContentStudio.tsx` | Modified | Added "My YT Week" tab with URL input, preview card, original fetched title display, channel attribution, title override, description, order, publish toggle, and refresh button. |
| `tests/backend.test.ts` | Modified | Expanded to 9 comprehensive tests covering image budgets, animated rejection, YouTube parsing, SSRF defenses, oEmbed mocking, PGlite migrations/grants, conflict checks, and title override logic. |
| `tests/server-smoke.ts` | Modified | Added unauthenticated 401 checks for `/api/admin/content/videos` and `/api/admin/youtube/preview`. |

---

## 3. Verification & Command Results

All required verification checks were executed sequentially and passed cleanly:

```bash
# 1. Test Suite
pnpm test
# Result: 9/9 tests passed in 26.6s (TAP version 13, 0 failures, 0 skipped)

# 2. Linting
pnpm lint
# Result: Exit code 0, 0 errors, 0 warnings

# 3. Next.js Production Build
pnpm build
# Result: Exit code 0, compiled successfully in 88s, generated all 10 application routes

# 4. TypeScript Typecheck
pnpm typecheck
# Result: Exit code 0, no type diagnostics emitted
```

### Distinction of Check Categories

1. **Automated Isolated Checks (100% Passing)**:
   - `pnpm test`: 9 automated tests using Node test runner, Sharp, and in-memory PGlite PostgreSQL simulating private schema permissions, role boundaries, RLS, and atomic concurrency.
   - External network calls are fully mocked in unit tests (e.g. simulated 200 JSON, 404 not found, HTML errors, timeouts, and untrusted CDNs).
2. **Live Provider Verification (Verified)**:
   - Ran live probe with `fetchYouTubeMetadata` against public video `dQw4w9WgXcQ` (status 200, title "Rick Astley - Never Gonna Give You Up", channel "Rick Astley", thumbnail `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`).
   - Ran live probe with non-existent ID `00000000000` (status 404, correctly captured as unavailable/private/deleted without throwing unhandled exceptions).
3. **Database Migration Applied**:
   - Migration `0002_youtube_videos.sql` was applied to the live Supabase hosted database via `pnpm db:migrate` using `DATABASE_MIGRATION_URL` (connecting to `db.dfrwfqnhovmupvvyjckq.supabase.co:5432/postgres`). Migration journal index 2 recorded successfully.
4. **Unperformed / Manual Checks**:
   - **Browser Visual Viewport Checks**: Physical rendering was reviewed in code against Tailwind breakpoints (`md:`, `lg:`, `max-w-6xl`, `px-4`), but no headless browser was used to take pixel snapshots at 375px, 768px, 1024px, 1280px, and 1440px.
   - **Owner Live Browser Session**: No interactive browser login was performed to avoid intercepting or requesting the owner's TOTP credentials or session cookies. Server smoke checks (`tests/server-smoke.ts`) verified unauthenticated rejection (401/403) and rate limits.

---

## 4. Bounded Image Compression System

### Purpose Budgets & Dimensions

| Purpose | Max Dimension | Max File Size | Quality Floor | Dimension Floor | Primary Use Case |
|---|---|---|---|---|---|
| `icon` | 256 px | 40,000 bytes (40 KB) | 50 | 96 px | Skill icons, social badges |
| `portrait` | 800 px | 160,000 bytes (160 KB) | 50 | 360 px | Profile avatar / owner portrait |
| `project` | 1600 px | 250,000 bytes (250 KB) | 50 | 800 px | Project preview cards & screenshots |
| `certificate` | 2400 px | 400,000 bytes (400 KB) | 50 | 1200 px | Credentials / certificates (text legibility) |

- **Universal Ceiling**: `UNIVERSAL_MAX_BYTES = 400_000` bytes. No output image can ever exceed this limit regardless of purpose or input.
- **Default Purpose**: `prepareImage` defaults to `"certificate"` if unspecified, preserving backward-compatibility with existing seed assets and baseline tests while keeping within the 400 KB ceiling.

### Guardrails & Defenses
- **Input Cap**: Enforces 3,500,000 bytes maximum input file size.
- **Decoded Pixel Cap**: Enforces `MAX_DECODED_PIXELS = 24_000_000` (24 megapixels) to prevent decompression bomb / memory exhaustion attacks.
- **Allowed Formats**: Decodes only `jpeg`, `png`, and `webp`. SVGs are rejected in raster endpoints. PDFs remain separated under their existing 3.5 MB limit.
- **Animated/Multi-page Rejection**: Checks `metadata.pages > 1` and throws `Animated images are not supported`.
- **Metadata Stripping**: Strips all EXIF, IPTC, and XMP metadata (`strip()`), while preserving EXIF orientation via `.rotate()`. Alpha channels are preserved for transparent PNG/WebP.
- **Upscaling Prevention**: `withoutEnlargement: true` ensures smaller images are not enlarged.

### Compression Algorithm & Difficult Image Handling
- **Single-Source Decoding**: Reads the input buffer into decoded raw pixel buffers once via Sharp. Each subsequent compression iteration clones the clean pipeline rather than repeatedly encoding prior lossy outputs (preventing generational degradation).
- **Iteration Ladder**: Bounded to a maximum of 8 attempts:
  1. Iteration begins at initial WebP quality (82).
  2. Quality is reduced in increments of 8 down to `qualityFloor = 50`.
  3. If still exceeding `maxBytes` at quality 50, dimensions are scaled down by 15% per step down to `dimensionFloor`.
- **Termination Guarantee**: If the budget cannot be met after reaching the minimum quality and dimension floors or exceeding 8 iterations, `prepareImage` throws:
  `Image could not be compressed under the ${budget.maxBytes} byte budget for purpose "${purpose}".`
  **It never returns an oversize file.**
- **Difficult Image Verification**: Tested with a 1000x1000 JPEG filled with high-frequency Gaussian noise. When compressed against a tiny 40 KB `icon` budget, the loop correctly exhausted attempts down to the floor and cleanly threw the budget error without unhandled crashes.

---

## 5. Manually Curated My YT Week Implementation

### YouTube URL Parsing & SSRF Defense Rules
- **Protocol**: HTTPS only. Rejects `http://`, `javascript:`, `data:`.
- **Authentication & Ports**: Rejects URLs containing usernames/passwords (`user:pass@`) and explicit non-standard ports (only port 443 or default/empty allowed).
- **Exact Hostname Allowlist**:
  - `www.youtube.com`, `youtube.com`, `m.youtube.com`, `music.youtube.com`, `youtu.be`.
  - Rejects subdomain lookalikes (e.g. `youtube.com.attacker.com`) and typosquatting.
- **Path & Query Routing**:
  - Watch URLs: `/watch` requiring `v` parameter matching `^[a-zA-Z0-9_-]{11}$`.
  - Shorts: `/shorts/<id>`
  - Live: `/live/<id>`
  - Embed: `/embed/<id>`
  - Short-link: `youtu.be/<id>`
  - Rejects playlist-only URLs (`/playlist`), channel URLs (`/channel`), and non-video routes.
- **Normalization**: Strips tracking queries (`t`, `feature`, `si`) and normalizes to canonical `https://www.youtube.com/watch?v=<id>`.

### Metadata Fetching & Thumbnail CDN Validation
- **oEmbed Endpoint**: Fetches exclusively from `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId}&format=json`. The user-submitted URL is never used as the fetch target.
- **Network Guards**:
  - `redirect: "error"` ensures the request cannot be redirected to internal network IPs or loopback.
  - `AbortSignal.timeout(5000)` enforces a strict 5-second deadline.
  - Bounded stream reader reads at most 50,000 bytes, aborting if oversized payloads are returned.
  - Content-Type verified to be `application/json`.
- **Channel Attribution**: Captures `author_name` from oEmbed payload and stores it as `channelTitle`.
- **Thumbnail Security**:
  - Validated against trusted YouTube CDN hostnames: `i.ytimg.com`, `img.youtube.com`, `i9.ytimg.com`.
  - HTTPS only, strict path format `/vi/<id>/<quality>.jpg`.
  - Path traversal check: raw string rejection for `..` segments (`urlStr.includes("..")`).
  - Rendered directly by the client browser via standard `<img>` with `loading="lazy"`. **Never copied into Supabase Storage or proxied through Next.js**.

### Fallback & Editorial Behavior
- **Unavailable / Private Videos**: If provider returns 404 or network times out, the CMS allows saving as a draft with a neutral placeholder, displaying an editorial notice in the studio.
- **Title Override Logic**:
  - Database stores both `fetchedTitle` (immutable provider text) and `titleOverride` (optional owner text).
  - Public display title: `titleOverride?.trim() || fetchedTitle || "YouTube Video"`.
  - Clearing the title override immediately restores the original fetched title.
  - Metadata refresh explicitly updates `fetchedTitle`, `thumbnailUrl`, `channelTitle`, and `metadataFetchedAt`, but **strictly preserves `titleOverride` and `description`**.
- **Duplicate Prevention**:
  - Partial unique index on `(video_id)` where `deleted_at IS NULL`.
  - Saving an active video with an existing `videoId` returns an HTTP 409 Conflict error.
  - Soft-deleted videos can be re-imported without constraint collision.

### Database Migration & RLS Security
- **Migration**: `src/db/migrations/0002_youtube_videos.sql`.
- **Security Posture**:
  - `ENABLE ROW LEVEL SECURITY` applied to `portfolio.youtube_videos`.
  - Explicit revocations: `REVOKE ALL ON TABLE portfolio.youtube_videos FROM PUBLIC, anon, authenticated;`.
  - Explicit grants: `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portfolio.youtube_videos TO portfolio_app;`.
- **Applied Status**: Applied directly to the hosted Supabase instance (`pnpm db:migrate`).

---

## 6. Free-Tier Efficiency Assessment (For Future Codex Pass)

1. **Repeated Private Image Blob Downloads**:
   - *Current State*: The Next.js API route `/api/media/[type]/[id]` fetches image blobs from private Supabase Storage on every request, serving them with `Cache-Control: private, no-store`. This guarantees instantaneous unpublishing and reference security.
   - *Cost Impact*: Every public page hit with 5 projects consumes ~1 MB of internal Supabase Storage egress.
   - *Future Recommendation*: Implement a small, bounded in-memory LRU cache (e.g. 20-30 MB) on the Next.js server holding verified image bytes, while performing a fast 1-row database check for `is_published = true AND deleted_at IS NULL` before serving. This avoids repeated blob downloads from Supabase Storage without compromising publication control.
2. **CV / Resume Endpoint Range Handling**:
   - *Current State*: `/api/resume` downloads the entire PDF file from Supabase Storage into server memory before parsing the HTTP `Range` header and slicing the requested byte buffer.
   - *Cost Impact*: A 2 MB resume PDF consumes 2 MB of backend download bandwidth even if the client's PDF reader only requests a 1 KB byte-range check (`bytes=-1`).
   - *Future Recommendation*: When Supabase S3-compatible Range requests or signed streaming URLs are appropriate, stream ranges directly; or cache the resume buffer in memory on the Next.js server with an invalidation trigger when a new resume is uploaded.
3. **Egress Reservation**:
   - The 5 GB monthly egress limit on Supabase Free tier applies to total network egress. Direct rendering of YouTube thumbnails from `i.ytimg.com` completely bypasses Supabase egress, conserving bandwidth.

---

## 7. Compliance & Safety Checklist

- [x] **SureSale Backend**: `C:\projects\rise-together\suresale-new\suresale-backend-v2` verified clean on branch `ardi` via `git status`; completely untouched.
- [x] **Credentials & Secrets**: No secrets, passwords, tokens, or `.env.local` contents were logged, printed, or written to reports.
- [x] **Authentication / Owner State**: No password change, TOTP bypass, session tampering, or auth redesign was implemented (reserved for Codex).
- [x] **Billing / Paid Add-ons**: Zero paid transformations or external paid APIs introduced.
- [x] **Git Operations**: No `git commit`, `git push`, or cloud deployments performed.
- [x] **Working Tree State**: Clean and consistent, ready for Codex review.
- [x] **Production Readiness Disclaimer**: The portfolio is NOT claimed to be fully production-ready based solely on this feature batch; password change and full visual responsive verification remain pending.
