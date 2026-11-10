# Codex feature review and security checkpoint

Date: 2026-11-10 (Asia/Dhaka). Base: `b841777` on `main`. AGY's original report is retained as its handoff record; this document supersedes its acceptance/verification claims where noted.

## Review outcome

The image-budget and manually curated My YT Week implementation is retained, with the corrections below. Codex also implemented the separately reserved dashboard password-change feature. Nothing has been committed, pushed, or deployed in this checkpoint.

### Corrections to the AGY batch

- Fixed dimension calculations for EXIF orientations 5–8. The old implementation rotated pixels but resized against the unrotated bounding box, unnecessarily shrinking portrait-oriented photographs. A real orientation-6 JPEG regression now verifies 400 × 800 output from a 1200 × 600 source.
- Replaced the purported animated-image test (which created an unused joinChannel result and never asserted rejection) with an actual two-frame WebP fixture and rejection assertion.
- Tightened accepted YouTube paths: extra suffix paths after a video ID are rejected. Thumbnail validation now checks a specific video-thumbnail path and rejects query/hash additions, in addition to the CDN host allowlist.
- Added a video-save rate limit, not only a preview limit. Invalid video links return validation errors rather than generic 500 responses, and null preview input is handled.
- Explicitly disabled Next.js fetch caching for owner metadata requests so manual refresh can obtain fresh provider data.
- Made failed metadata refresh visible without overwriting saved content. Fetching metadata for an existing editor item now marks it for server-side refresh on save.
- Moved the owner description directly after the displayed video title, before channel attribution.
- Title-resolution tests now use the production helper instead of reproducing the implementation inside the test. Added request-policy, response-size and thumbnail-path assertions.

The AGY report names `db.dfrwfqnhovmupvvyjckq.supabase.co` for its migration. The connected project actually reviewed is `klwiaojcrxkbganysaep` (`mohammadardi-portfolio-backend`). Read-only hosted queries confirmed `youtube_videos` exists there, belongs to `portfolio_migrator`, has RLS, denies SELECT to anon/authenticated, and permits the restricted runtime's CRUD. It contained zero videos at review time. The report's host reference is inaccurate; it was not evidence that another project needed to be changed.

## Password change implemented by Codex

- New owner-only `/admin/security` screen and independently guarded `/api/admin/security/password` endpoint. Security is linked from the studio header.
- Requires the current password, a different new password (at least 12 characters), matching confirmation, a selected verified TOTP factor, and a freshly accepted six-digit code. Five attempts per owner per 15 minutes, strict request bounds and same-origin protection apply.
- Current-password/TOTP verification uses a separate memory-only publishable-key Supabase client. It cannot replace or downgrade browser SSR cookies. Password updates use the signed-in owner's API, not service-key impersonation or direct Auth table edits. The installed SDK's `current_password` parameter was checked against its source/types and the official password-security guide.
- A new private `owner_security` table stores a generation and pending operation UUID; pending nonces store their generation. Durable revocation/blocking commits before the external Auth write. Login proof issuance and authorization finalization lock the security row. An earlier password/login proof cannot cross a credential-change boundary and authorize afterward.
- Successful changes request Supabase global sign-out, invalidate application sessions/proofs, then unblock fresh password/TOTP login. Existing 24-hour authorization deadlines are preserved.
- An uncertain Auth write, failed sign-out, or crash leaves access blocked rather than guessing that nothing changed. The documented offline `scripts/admin-recover-security.ts` procedure requires the application stopped, the exact operation ID, and a 15-minute minimum age; it invalidates application sessions/proofs and clears only the interrupted-operation gate. It does not reset passwords, remove MFA, or claim provider refresh-token revocation.
- No forgot-password route, reset email flow, or email-only MFA bypass was added. Automated checks did not change the real owner's password or authenticator.

Migration `0003_tough_weapon_omega.sql` was generated with Drizzle, tested with the real earlier migrations in isolated PGlite, and applied with the existing restricted migration runner. Hosted queries confirmed four migration journal entries and private RLS/grants on both new tables. Applied migration 0002 was not rewritten. No broader role grants or bucket-publicity changes were made.

## Verification

- Final unit/database suite: 12 test groups passed, including image budgets/orientation/animation, metadata limits and URL validation, actual migration permissions, nonce generations/revocations, overlapping change rejection, fixed deadlines, version conflicts, and password workflow failure handling.
- `pnpm lint` passed. `pnpm build` passed, including the new `/admin/security` screen and password API; the public homepage build metric remains 173 kB first-load JavaScript (not a Lighthouse measurement). A separate `pnpm typecheck` passed after the build.
- `tests/server-smoke.ts` passed against the production preview on port 3101: new security GET/POST and video endpoints deny unauthenticated access; cross-origin password/content writes return 403; published WebP delivery/private Storage and cleanup authentication checks pass. The authorized cleanup check executed the existing maintenance endpoint. No owner cookies or credentials were inspected.
- Additional HTTP observations: homepage 200, unauthenticated `/admin/security` redirects 307 to `/admin/login`. There is still no attached PDF, so actual PDF upload/preview delivery remains pending.
- Browser-asset scan checked 44 JS/CSS/JSON/map assets; no configured private environment values were found. It printed no values. This checks known configured strings, not every possible class of secret exposure.
- Independent live provider probe passed through the production metadata helper: a known public video returned title/thumbnail, and an unavailable ID failed cleanly. Run it separately with `pnpm exec tsx tests/youtube-live.ts`; it creates no portfolio content.
- The hosted security advisor reported only the pre-existing disabled leaked-password-protection notice; no new table/RLS findings were reported. This provider feature is paid and was not enabled. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Supabase's current changelog was read; the surfaced Flutter/CLI breaking changes do not alter this pinned JavaScript/Drizzle implementation. Official references: https://supabase.com/docs/guides/auth/password-security and https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify.

## Remaining checks and limits

- Real owner browser checks remain necessary: import a YouTube link, verify the fetched title/thumbnail, save a description and title override, clear the override, publish/unpublish/delete, and confirm the public section/navigation behavior.
- A real password change must be tested privately by the owner in the Security screen. Confirm wrong-password/wrong-code rejection, successful change, fresh password/TOTP login, and rejection of an older dashboard session. No passwords or codes should be supplied in chat.
- Five-viewport screenshots, keyboard/screen-reader review, and certificate text legibility on representative real uploads are not claimed by the code/test checks.
- Compression budgets help Storage use but cannot guarantee permanent free hosting at arbitrary traffic levels. The existing private-image delivery can download blobs repeatedly; CV Range delivery still downloads a full PDF before slicing. The 5 GB application response-byte reservation is not a cap on total provider egress. The AGY report's total-egress wording should not be treated as a provider billing specification.
- Contact delivery verification, a complete backup/restore drill, hosting choice, and deployment remain separate release work. No SureSale source was edited.

## Resume here

Later owner feedback on 2026-11-10 confirms successful real password change/new login and YouTube publishing. A real PDF was uploaded and exposed a previously untested Date-serialization failure in its quota query. See `RELEASE_READINESS.md` for that correction, the public-reuse MIT license decision, current dependency audit findings, and the next agy testing task. These newer observations supersede the earlier no-PDF/manual-check status above.

The production preview is running at http://localhost:3101/admin. Owner checks can be performed there privately. Changes remain uncommitted on `main`, including the AGY batch and Codex corrections/security work. After those checks, address any reported issues and save an owner-authorized commit; do not deploy or change DNS as part of this checkpoint.
