# Owner CMS setup and operation

The portfolio is one Next.js app. Supabase provides Postgres, owner authentication, and file storage; Drizzle manages the application tables. Neon and a separate backend service are not required.

## Local configuration

Use Node 22 LTS and pnpm 10.34.5. Copy `.env.example` to `.env.local` for a new checkout. The existing owner's local file has already been configured and is ignored by Git. Never paste or commit its contents.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe project API key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key, used for Storage and offline recovery |
| `OWNER_EMAIL`, `OWNER_USER_ID` | Owner account configuration; authorization uses the immutable user ID, not editable user metadata |
| `DATABASE_ADMIN_URL` | Local bootstrap/recovery only; omit from production hosting |
| `DATABASE_MIGRATION_URL` | Schema-owner connection for release migrations; omit from the running app |
| `DATABASE_POOL_URL` | Restricted `portfolio_app` connection for the running Next.js app |
| `IP_HASH_SECRET` | Random secret for hashing rate-limit identities |
| `CRON_SECRET` | Random secret for cleanup endpoint authentication |
| `APP_URL` | Exact application origin; set to your HTTPS domain before deploying |

Create the owner under Supabase Authentication → Users and confirm the email. Do not expose a public signup flow. Set the resulting user ID in `OWNER_USER_ID`.

```sh
pnpm install --frozen-lockfile
pnpm db:bootstrap
pnpm db:migrate
pnpm storage:setup
pnpm db:seed
pnpm dev
```

Open `/admin/login`, sign in with the privately chosen owner password, and follow authenticator enrollment. Keep a backup of the authenticator setup on a second trusted device or password manager. The account does not receive dashboard access until a valid TOTP code is verified.

Bootstrap generates restricted role passwords and application secrets into `.env.local` without printing them. Its pooler discovery currently targets the owner's Singapore project. For another region, use that project's session-pooler URL and adjust the discovery candidates before running bootstrap. The seed is non-destructive and keeps existing edits with `ON CONFLICT DO NOTHING`; it copies the original portfolio images into owned Storage. It does not fabricate or download a resume: upload your actual PDF in Profile & CV.

## Database boundary and migrations

All application tables and the migration journal live in the private `portfolio` schema. `anon`, `authenticated`, and `PUBLIC` have no schema/table access. Tables have RLS enabled with explicit policies for the restricted server runtime role. That runtime role cannot create schemas, tables, roles, databases, bypass RLS, or access the migration journal.

The migration role owns only this schema. Drizzle's stock migrator unconditionally issues `CREATE SCHEMA`, which requires a database-wide privilege on this PostgreSQL setup even when the schema exists. To keep that privilege withheld, `scripts/migrate.ts` uses Drizzle's `readMigrationFiles`, generated SQL, hashes, and journal format inside one advisory-locked transaction. The administrator creates the journal during bootstrap. Applied migration hashes are checked; never edit an already-applied migration.

```sh
pnpm db:generate
pnpm db:migrate
```

New tables require explicit runtime grants and RLS policies in a reviewed migration. Existing tables use optimistic version checks: updates/deletes with an outdated version return HTTP 409 instead of silently replacing newer edits. Display order is edited numerically; ties are sorted consistently by ID.

## Login and session rules

- Password login issues a random, HttpOnly fresh-login cookie. Only its SHA-256 hash is stored, bound to the verified owner and Supabase session ID, with a five-minute expiry.
- A maximum of three verification requests are reserved atomically. Password login alone cannot authorize any content or media endpoint.
- Successful Supabase TOTP verification is followed by verified `getUser`/`getClaims` checks for owner ID, audience, session ID, and `aal2`.
- A single SQL statement consumes the nonce and creates the admin authorization record once. Its deadline is exactly 24 hours after verification. Refreshes and repeated nonces cannot extend it.
- Dashboard rendering and every protected API check both the Supabase identity and the database authorization record. Middleware refreshes cookies and sets private/no-store headers; it is not the authorization boundary.
- Normal sign-out revokes the owner's portfolio admin authorizations before clearing authentication. Offline recovery revokes all portfolio authorizations and pending nonces before deleting lost factors through the official Admin API.

Recovery is deliberately an offline operator action, never a public email bypass:

```sh
pnpm exec tsx scripts/admin-recover-mfa.ts --execute
```

Use this only after losing authenticator access. Then sign in again with the owner password and enroll a new authenticator. Recovery revokes the portfolio authorization layer; do not describe it as immediate invalidation of every already-issued Supabase JWT.

## Dashboard and media

The dashboard edits profile text, public contact email, portrait, CV, skills/icons/glow colors, projects with optional frontend/backend repositories, achievements, social links, publication state, and display order. New collection items start as drafts. Removing a portrait shows a monogram; removing a CV hides its public button.

Library icons use an allowlisted, locally bundled Simple Icons/Lucide registry. Custom uploads accept PNG, JPEG, or WebP, preserve transparency, strip metadata, and are decoded/re-encoded to WebP. Arbitrary SVG/HTML and remote-fetch URLs are not accepted. The portrait uploader produces a square center crop and displays a preview before saving. Interactive focal-point/zoom cropping is a possible later enhancement.

Each file is limited to 3.5 MB and the complete upload body to 4 MB. The request body is bounded before parsing multipart data. Large images are resized on the client and rechecked on the server, with a 24-megapixel decoding limit. Uploads are limited to 40 per owner per hour. PDFs are checked for the PDF signature and served with fixed filenames, nosniff, and sandbox headers.

All three buckets are **private**, including the internally named `public-media`. This deliberately strengthens the earlier plan: drafts and previously published objects never have permanent anonymous Storage URLs. The public image routes check the current entity publication/deletion state for each delivery and return `no-store`. Dynamic media bypasses Next.js image-optimizer caching so an old cached optimizer response does not defeat unpublishing. Downloaded files/screenshots a visitor already saved cannot be recalled.

Uploads have durable cleanup entries before network writes. A daily reconciliation identifies abandoned assets, and dashboard mutations drain one queued job. Workers claim jobs with row locks, use expiring leases and retry backoff, recheck references, and hold the media row lock during removal. Soft-deleted content remains recoverable by an operator for seven days; then it is pruned and unreferenced media can be removed. No dashboard trash/restore UI is implemented yet.

Vercel's configured daily cleanup request uses `/api/cron/cleanup` with `Authorization: Bearer <CRON_SECRET>`; GET and POST are supported. Keep the schedule daily on Hobby. Non-Vercel hosting needs an equivalent authenticated schedule and a verified client-IP source.

## CV delivery

The shadcn dialog loads `/api/resume`, with separate open/download options. The endpoint implements HEAD, bounded/open-ended/suffix byte ranges, 416 responses, atomic per-IP request limits, and a 5,000,000,000-byte calendar-month response reservation. HEAD reserves no body bytes. Failed delivery may conservatively retain its reservation.

The current implementation downloads the small private blob through the SDK and slices the requested response. Its response-byte quota is **not a guarantee about total Supabase egress**: provider traffic also includes full upstream blob reads and images. Before production, review actual provider usage and consider authenticated upstream Range fetching if PDF traffic warrants it.

Client-IP rate limiting trusts Vercel's overwritten `x-vercel-forwarded-for` only when running on Vercel. Local/non-Vercel runs use one shared local bucket until a hosting-specific trusted proxy is configured.

## Validation and release boundary

```sh
pnpm test
pnpm lint
pnpm build
pnpm typecheck
```

With a local server running on port 3100, API-only integration checks are available with `pnpm exec tsx tests/server-smoke.ts`. They verify access denials, origin checks, actual published WebP delivery, private Storage, and authenticated cleanup. They do not inspect browser pages or exercise an authenticated owner browser session.

Run the build and separate type check sequentially because Next.js replaces generated route types while building. Tests use an isolated PGlite PostgreSQL instance for migration permissions, RLS, single-use MFA/session SQL, fixed deadlines, quota integer sizes, rate limits, and stale-version updates, plus validation and image-processing tests. A real owner login and authenticator enrollment must still be exercised in the browser; fixture SQL does not replace that end-to-end check.

The public contact form still uses the existing EmailJS/reCAPTCHA integration. Replacing it with the planned server-side contact action/Turnstile remains separate release work and requires provider configuration. My YT Week now supports manually published videos through the dashboard, with keyless YouTube metadata import and an optional title override. Production hosting, DNS cutover, a full backup/restore drill, and deployment are not performed by these setup scripts.

Supabase's current security advisor reports leaked-password detection disabled. Review [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) before production; no billing or paid-feature settings are changed automatically.

## Dashboard password change

Open `/admin/security` (Security in the studio header). Supply the current password, a different new password of at least 12 characters, confirmation, and a fresh six-digit code from a verified authenticator. Password verification uses an isolated memory-only Supabase session, not the browser's SSR session. On success, all portfolio authorizations/pending proofs are revoked and Supabase global sign-out is requested. Sign in again with the new password and TOTP. There is no forgot-password/reset route or email-only bypass.

A private `owner_security` row coordinates changes. Before the Auth write, a transaction durably blocks new authorizations, increments the proof generation, revokes admin sessions, and deletes pending proofs. Login proof issuance and finalization lock the same row; pre-change proofs cannot authorize afterward. The 24-hour session deadline remains fixed.

### Interrupted password-change recovery (offline only)

An uncertain Auth response, failed global sign-out, or server crash after beginning a change deliberately leaves dashboard access blocked. Never automatically expire this block: the provider may have accepted the write. This recovery clears only the interrupted-operation gate; it does not reset a password, delete MFA, or bypass a fresh password/TOTP login.

1. Stop every running instance of the application. Wait at least 15 minutes so outstanding requests can finish. Inspect provider logs privately and determine whether the password update completed; never paste credentials into chat or command arguments.
2. Run `pnpm exec tsx scripts/admin-recover-security.ts` locally with the existing ignored operator environment. It reports whether there is a pending operation and its non-secret UUID.
3. After confirming the app is stopped and the operation is no longer in flight, run `pnpm exec tsx scripts/admin-recover-security.ts --execute --confirm-app-stopped --operation=UUID`, replacing UUID with that exact operation ID. The script requires the gate to be at least 15 minutes old, increments the generation again, revokes application sessions/proofs, and clears the gate transactionally.
4. Restart the app and sign in privately with the password that the provider currently accepts and your authenticator. Provider refresh-token revocation is not claimed by this offline database-only recovery; application access still requires a new password/TOTP proof.

The existing lost-authenticator recovery script remains a separate procedure. No live owner password or authenticator is changed by automated tests.
