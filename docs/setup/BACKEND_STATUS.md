# Portfolio CMS implementation checkpoint

Latest checkpoint: see [release readiness](../reviews/RELEASE_READINESS.md) for the 2026-11-10 owner confirmations, PDF correction, dependency audit and remaining release tests, and [Codex feature review](../reviews/CODEX_FEATURE_REVIEW.md) for the feature/security implementation. The dated record below describes the earlier 2026-11-09 baseline.

Date: 2026-11-09 (Asia/Dhaka)

## Connected and implemented

- Supabase project `mohammadardi-portfolio-backend` is connected. The ignored `.env.local` contains the project configuration, owner identity, server key, scoped database connections, and generated rate-limit/cleanup secrets. No credential values are included in this report.
- Drizzle schema and two tracked migrations create ten tables inside the private `portfolio` schema. Runtime and migration roles have no database-wide schema creation permission, superuser, role creation, or RLS bypass. The runtime cannot read the migration journal.
- The initial content was verified in the hosted database: one profile, eleven skills, three projects, two achievements, and five social links. Six original images were copied into owned private Storage. Seeding does not overwrite subsequent edits.
- Owner login requires password plus TOTP. The owner confirmed successful Google Authenticator enrollment and dashboard access. A hosted-database query confirmed one active admin authorization with an exact 86,400-second deadline.
- Dashboard editors cover profile/about/availability/contact email, portrait, PDF CV, skill icons/glow colors, projects with optional frontend/backend repositories, achievements, social links, item visibility, numeric ordering, and deletion. The owner confirmed that the lists load and saved edits update the public site.
- Public content now comes from the filtered Drizzle reader and tagged Next.js cache. Mutations invalidate the public page. Private/draft metadata is not part of the public projection.
- Navigation follows non-empty published sections, so hiding/deleting the final item does not leave a broken section link. The edited display name is shared by the hero, navigation, and footer.
- Uploads are bounded before multipart parsing; images are decoded/re-encoded as WebP, metadata is stripped, transparency is preserved, and portraits have a square-center-crop preview. The icon picker uses locally bundled allowlisted brand/interface icons or uploaded raster icons.
- Published media remains private in Storage and is served only through publication-checked, no-store routes. This is a deliberate tightening of the earlier public-bucket design. Dynamic images bypass the Next.js optimizer cache to preserve unpublish behavior.
- A CV dialog and protected-storage delivery endpoint implement open/download options, HEAD, byte ranges, request limits, and atomic monthly response-byte reservations. No resume was fabricated or imported; its public button appears after the owner uploads one.
- Durable cleanup uses queued locations, row locks, reference checks, leases, backoff, daily reconciliation, and an opportunistic drain after mutations. Deleted content has seven-day operator recovery retention before pruning.
- Public section animations use the current `motion/react` import, reduced-motion support, and server-visible content. Duplicate animation libraries were removed from direct dependencies.

## Verification evidence

- Final `pnpm build` succeeded with the connected database and all new routes. Next.js reported 173 kB homepage first-load JavaScript and 142 kB for the dashboard; these are build metrics, not Lighthouse scores.
- Final `pnpm typecheck` passed, run sequentially after the completed build.
- ESLint passed after excluding local browser-review artifacts from project checks.
- Five backend test groups passed using real isolated PostgreSQL semantics through PGlite: owner/AAL claims, PDF ranges, URL/icon/mass-assignment validation, image processing, and migration/session/rate-limit/version-conflict behavior. The session tests exercise the same production SQL builders.
- Initial HTTP checks: public home and login 200; unauthenticated `/admin` redirects to login; unauthenticated content API 401; unauthenticated cleanup 401. Admin responses carry private/no-store headers.
- The final browser-bundle scan found no configured private credential values in 41 generated JS/CSS/JSON/map files. The scan printed no secret values.
- The owner manually confirmed real password/TOTP login, authenticator setup, dashboard lists, save, and public update.
- `pnpm exec tsx tests/server-smoke.ts` passed against the final production preview: login 200, unauthenticated admin redirect 307, protected reads/writes/uploads 401, cross-origin write 403, published WebP delivery 200 with correct file signature/no-store, unknown media 404, anonymous permanent Storage URL blocked, cleanup without secret 401, and authenticated cleanup 200.
- The server smoke check confirmed no PDF is currently attached; real-file CV delivery remains pending. It did not read owner authentication cookies or credential values and did not substitute for the blocked browser review.

## Verification and release limits

- Automated browser observation was rejected because the approval-review service hit a usage limit. No alternate browser surface, raw CDP, or other UI workaround was used after that rejection. New dashboard screenshots, fresh five-viewport visual comparison, and automated positive UI CRUD/upload flows remain unverified by Codex.
- The real owner did not report testing a CV upload/preview/download or custom image upload in this checkpoint. Range parsing and image processing have automated tests, but those do not replace a real-file browser check.
- Offline MFA recovery was implemented but not executed against the enrolled owner, to preserve the working authenticator.
- The current CV endpoint reads the small blob through the Storage SDK before slicing a Range response. Its monthly response-byte accounting does not bound total provider egress; upstream full reads and image traffic must be considered before release.
- The portrait crop is centered; interactive focal-point/zoom adjustment is not implemented. Ordering is numeric rather than drag-and-drop; there is no dashboard trash/restore UI yet.
- Contact still uses the existing EmailJS/reCAPTCHA integration. The planned server-side contact/Turnstile replacement and live delivery verification remain outstanding. Weekly YouTube favorites remain deferred.
- Supabase's security advisor reports leaked-password detection disabled. Review the provider's password-protection setting before deployment; no paid-feature or billing settings were changed.
- Full backup/restore rehearsal, broader end-to-end review, Lighthouse measurements, hosting decision, deployment, and DNS cutover remain release work.

## Source control

This owner-requested checkpoint is saved on the current `main` branch after baseline commit `25da885`. It records the connected CMS and the remaining release checks; no push or deployment is included. The owner's pre-existing `.gitignore` edit and deletion of old review reports are left outside this commit. New operational documentation is at the root because the owner now ignores `docs/`.

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for configuration, migrations, recovery, cleanup, and development commands.
