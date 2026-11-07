# Implementation plan: preliminary review

Date: 2026-11-07

Target: `docs/implementation-plan.md` supplied by Antigravity.

Status: Revise before implementation approval. This is Codex's source/document review, not an isolated EGM Goldfish review. Application code and the submitted plan have not been changed by this review. Antigravity's reported successful build has not been independently rerun here.

## Corrections required

### 1. Specify the actual authentication claims and fresh-login boundary

Section 4.3 refers to `user.app_metadata` and `session.id`. Supabase's `aal` and `session_id` are JWT claims; they must come from a verified access token belonging to the same user/session checked by the guard. `getUser()` does not make an arbitrary client-supplied claims object trustworthy. Use a verified claims API and spell out identity, issuer/audience, MFA, session lookup, revocation, and fixed deadline checks.

The MFA completion path also needs to explain how it rejects a stale elevated session attempting to obtain another 24 hours. An insert after a TOTP verification alone does not demonstrate a fresh primary login. State the server-controlled fresh-login proof and insert-once behaviour, with tests for repeat enrollment/challenge, retries, and attempts to reuse an old session. The signed `admin_session_sig` cookie appears in the diagram but is otherwise undefined; either justify its purpose and validation or remove it from the design.

Split login/enrollment/challenge routes from the fully protected dashboard layout so the owner's first login cannot redirect back to itself. Check the owner identity before allowing enrollment operations.

References: [JWT claims](https://supabase.com/docs/guides/auth/jwt-fields), [verified claims API](https://supabase.com/docs/reference/javascript/auth-getclaims).

### 2. Make the database boundary match the promised architecture

Section 3 promises excluded private application tables, but Section 6 uses unqualified `pgTable` definitions, normally creating tables in `public`. It supplies no private schema, role/grant plan, or concrete exclusion configuration. This is particularly important for sessions, audit records, drafts, and rate counters.

Specify a non-exposed application schema, separate migration-owner and limited runtime credentials, grants, and appropriate RLS policy strategy. Direct SQL does not inherently disable RLS: enforcement depends on the connected role, table ownership, and policies. Do not assume visiting-user claims appear on a SQL connection. Test access through both the intended runtime role and direct browser Data API paths. Add connection-pool settings compatible with the chosen driver/mode.

Also enforce the claimed profile singleton and skill provider/key/media combinations. Give the version fields actual compare-and-update semantics. Define which content gets restore support and when permanent deletion occurs.

### 3. Resolve the conflicting upload and publication designs

Section 7 permits 10 MB PDFs and 5 MB images, while Section 12 relies on uploads below 4 MB. Next.js Server Actions additionally default to a 1 MB body limit. Choose one transport, configure its limits, and account for multipart overhead. Client compression does not replace server validation or solve PDF uploads.

Specify private staging for unpublished uploads, then validation and deliberate publication of image derivatives. The current two-bucket description sends images into public storage without explaining draft privacy. Define retryable cleanup when storage deletion fails; an unawaited asynchronous delete in a serverless request is not a durable cleanup mechanism. Keep any direct-upload capabilities consistent with the 24-hour authorization deadline.

Reference: [Server Action body limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

### 4. Replace the internal-table recovery procedure

Sections 2.3 and 12.2 propose deleting directly from `auth.mfa_factors`. Prefer a documented Supabase administrative recovery flow/API, with protected project access and explicit identity verification. Supabase supplies `auth.admin.mfa.deleteFactor`; its documented verified-factor deletion logs the user out of active provider sessions. Explicitly revoke application `admin_sessions` records too, require fresh authentication/enrollment, and test the result. Keep administrative credentials out of the public app. A separate backup authenticator remains a reasonable proposed default, pending owner choice.

Reference: [Supported factor deletion API](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor).

### 5. Revalidate versions and deployment assumptions

The version table uses `next: 15.2.x`, React 19.0.0, and unverified Drizzle RC pairs. Choose an exact currently patched, supported framework/React pair and verified compatible ORM/Kit versions. A broad minor-version label is insufficient given published App Router security advisories. Verify MCP support against the installed versions rather than inferring it from the supplied RC examples.

Treat the $0 hosting claim as provisional. Vercel Hobby has personal/non-commercial restrictions; confirm eligibility for the intended portfolio use before adopting that target. Recheck current storage, bandwidth, email, inactivity/pausing, and backup limits. Avoid promising measured storage use before migration. Database autovacuum does not delete expired live rate-limit rows: specify retention, deletion, indexes, and how cleanup actually runs.

References: [Next.js security advisory](https://nextjs.org/blog/CVE-2025-66478), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Drizzle MCP](https://orm.drizzle.team/docs/drizzle-kit-mcp).

## Additional repairs before the final plan

* Section 9's `var(--skill-accent) 22` gradient stop is invalid CSS. Use a valid alpha colour representation and verify it for library and uploaded icons.
* Give CV handlers actual HEAD exports/behaviour, suffix/open-ended/invalid range handling, byte-based global budgeting, trusted proxy-IP extraction, and an explicit cache policy. Thirty range requests may not mean thirty preview opens; test real viewers rather than assuming the chosen budget is sufficient.
* Do not label browser-visible EmailJS/reCAPTCHA public identifiers as leaked secrets or assert provider-side CAPTCHA bypass without inspecting the provider configuration. Similarly, the original full-width certificate image does not itself prove clipping, and animation-package size claims need measurement. Distinguish evidence from inference.
* Add missing checks for upload deadlines, invalid/oversized media, draft privacy, cache isolation, simultaneous edits, recovery, failed cleanup, and access exactly at the 24-hour boundary.
* Include a concrete database AND object-storage backup/restore procedure and test it before cutover. A source snapshot and old hosting deployment do not restore subsequently changed database rows/files.

## Suggested handling of the three owner choices

These are recommendations, not recorded owner approvals:

1. Keep weekly videos optional. Defer the unused table until its feature is accepted; adding it later is a small migration.
2. Offer a backup authenticator and a documented administrative recovery procedure, corrected as above.
3. Treat free tiers as a development starting point; settle production eligibility, availability, and budget before deployment. These decisions do not need to block local source preservation and visual-parity planning.

## Next action for Antigravity

Revise `docs/implementation-plan.md` against every finding in this review. Add a short finding-to-resolution table and cite current primary documentation. Preserve the owner's content scope and 24-hour session requirement. Mark remaining product choices explicitly. Do not install packages, change the database, or deploy during this revision.

Once the corrected working hypothesis is reviewed and the owner confirms readiness, run the isolated EGM Goldfish review. Resolve its findings before authorising the relevant implementation phases.
