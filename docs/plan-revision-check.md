# Verification of the Goldfish-revised plan

Date: 2026-11-08

Target: `docs/implementation-plan.md`, 886 lines.

Reviewed SHA-256: `11D08702750384472DEF5178BEB0B451CD0188BF7F42E6C99D44C0235B95A5FA`.

**Decision: proceed with a bounded source/tooling baseline only; do not approve Phase 1 dependency installation or later infrastructure phases from this specification yet.** The revision improves the design, but its statement that all C01–C14 findings are resolved is not supported by the actual text.

This is a targeted primary-agent verification of the revised document, not another full isolated Goldfish run. The earlier consolidated report remains a historical review of the previous hash. No implementation, package installation, live database changes, or SureSale work was performed in this portfolio review.

## Concrete issues to fix first

### V1 — The dependency set cannot be installed as written

Plan lines 837–864 pin `@types/react@19.3.1` and `@types/react-dom@19.3.1`. Read-only npm registry queries returned `E404: No match found for version 19.3.1` for both packages. The React runtime and its independently released type packages do not need identical version numbers.

The same checks confirmed that `next@15.5.29`, `react@19.3.1`, and `react-dom@19.3.1` exist. Next's published peer range accepts React 19, and this React DOM version requires React `^19.3.1`. Existence and peer ranges are not a complete security audit or successful build. Replace the nonexistent type pins with published compatible versions and record the actual resolution evidence and applicable advisory checks before Phase 1 installation. Verify the optional Drizzle MCP pair rather than repeating an unverified RC claim.

Verification commands used: `npm view <exact-package@version> version peerDependencies engines --json --fetch-retries=0 --fetch-timeout=15000`. No dependencies were installed.

### V2 — The pinned Supabase SDK lacks the method the auth guard calls

Plan lines 269–272 call `supabase.auth.getClaims()`, but line 845 pins `@supabase/supabase-js@2.49.1`. Its published metadata fixes `@supabase/auth-js` to **2.68.0**. The published source for that version has no `getClaims` implementation. The guard therefore cannot be implemented against that dependency set as written.

Choose a verified compatible SDK/SSR version that exposes the planned API, or explicitly revise the guard to an alternative verified-token approach supported by the chosen SDK. Pin and check the corresponding versions together. Do not substitute unverified JWT decoding merely to make the method error disappear.

Evidence: [supabase-js 2.49.1 package metadata](https://registry.npmjs.org/@supabase%2Fsupabase-js/2.49.1), [auth-js 2.68.0 source](https://github.com/supabase/auth-js/blob/v2.68.0/src/GoTrueClient.ts). Both were inspected with read-only requests.

### V3 — The revised nonce flow has a schema mismatch and consumes proof on a wrong code

The insert at line 236 supplies `nonce`, `session_id`, and `expires_at`; the table at lines 547–553 additionally requires `user_id` with no default. A literal insert fails before the owner reaches MFA.

The diagram consumes the nonce at line 243 **before** calling `challengeAndVerify`. One mistyped or expired TOTP then destroys the fresh-login proof. The described flow still supplies no first-enrollment branch or safe retry outcome when provider MFA succeeds but session insertion fails.

Correction: include the verified owner ID in nonce creation; verify owner and fresh proof for the enrollment/challenge branch; perform provider factor verification without granting app authorization; then atomically conditionally consume the still-valid nonce and insert the fixed-deadline record in one database transaction. Define rate-limited wrong-code retry, transaction rollback, duplicate completion, expired proof and failed session insertion outcomes. An old elevated token must never create a new window. Specify cookie refresh plumbing and cookie flags alongside the flow.

### V4 — The byte counter cannot represent the promised quota

`bytesServed: integer('bytes_served')` at line 569 is signed 32-bit PostgreSQL `integer`, whose maximum is **2,147,483,647**. The proposed **5 GB** monthly counter exceeds that range. Use an appropriately handled `bigint` or exact numeric type.

The schema addition and a prose monthly key still do not supply an atomic reservation/check algorithm. Define request and byte accounting, response/stream-abort handling, reset keys, exhausted-budget and DB-failure responses, plus concurrent-request tests. [PostgreSQL numeric type limits](https://www.postgresql.org/docs/current/datatype-numeric.html).

### V5 — The cleanup schedule contradicts the proposed Hobby baseline

Line 605 specifies cleanup every ten minutes; the hosting baseline is Vercel Hobby. Vercel's documented Cron Jobs minimum interval on Hobby is once per day. Choose an actual supported scheduler/cadence, or explicitly cost and select a different hosting plan. Do not quietly assume the same cadence works on the free baseline. [Vercel cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

The worker also needs claims/locking, reference rechecks, retry exhaustion handling and orphan reconciliation, including the crash/DB-unavailable gap. Draft/publish/hide/restore transitions remain descriptions of storage locations, rather than a complete transition contract.

### V6 — Several claimed resolutions are not present in the referenced sections

* C04 still lacks role creation and a clean-environment bootstrap sequence, although future-object grants and journal location are improvements.
* C05 introduces `/api/media/avatar`, `/api/media/skill/:id`, `/api/media/project/:id` and `/api/media/achievement/:id` without defining those routes, public-state checks, or adding them to the file map. Its SQL template examples also omit the `sql` import. The new cached reader/filtering convention is an improvement, not a complete media-delivery contract.
* C08 fixes the factor-deletion argument and returned error handling, but `recoverOwnerMFA().catch(console.error)` reports failures without setting a failing exit code; its database connection closes only on success. Use a nonzero failure status and `finally` cleanup. Describe partial-factor-recovery behaviour and operator identity/environment checks.
* C09 supplies concrete source mappings but unconditional seed upserts can overwrite later owner edits. Make normal repeat runs non-destructive; require an explicit intentional reset mode before overwriting edited content. A missing initial PDF should hide the CV control rather than block the entire portfolio seed.
* C10 now backs up all three buckets but still provides no object-restore commands, consistency sequence, or required restore rehearsal. Synchronising remote objects to local folders is a backup direction, not the missing reverse restoration procedure.
* C11 claims atomic compare-and-update SQL, but no version predicate/increment or reorder transaction contract is supplied. Adding version columns and a conflict test does not implement those semantics. File mappings omit important routing/configuration/client-island actions and newly introduced media handlers.
* C12 still repeats the unsupported estimated bundle saving, universal blank-page statements, no-server-check assumption for EmailJS, and zero rollback claim. These are mostly editorial and must not hold up a safe source baseline; remove or attribute them instead of marking them calibrated.

## C01–C14 reconciliation

Statuses below concern the specification only, not implemented or tested software.

| ID | Verification status | Reason / required follow-through |
| --- | --- | --- |
| C01 | Open | Nonexistent type versions and incompatible Supabase API pin; V1–V2. |
| C02 | Partially addressed | Bounded upload direction is sound; explicitly cap total bytes/part count and per-type sizes. A 3.5 MB file alone does not guarantee a total multipart limit. TEST-20 must expect a gateway 413 when an oversized request is blocked before application code; canvas output size must be checked, not assumed. |
| C03 | Open | Missing nonce user ID and failure/retry flow; V3. |
| C04 | Partially addressed | Future grants/journal specified, clean bootstrap still missing. |
| C05 | Partially addressed | Reader/cache convention present, media handlers and public/private delivery contract missing. |
| C06 | Partially addressed | Batches/backoff/secret added, scheduler and full lifecycle remain incomplete; V5. |
| C07 | Open | Counter overflow and missing atomic byte accounting; V4. |
| C08 | Partially addressed | API signature/error checks improved; script failure/cleanup and recovery exercise pending. |
| C09 | Partially addressed | Source mappings improved; seed overwrite/partial-failure/missing-CV policy needed. |
| C10 | Partially addressed | All buckets included; reverse restoration and rehearsal still absent. |
| C11 | Partially addressed | Mapping and version columns improved; mutation/reorder contracts and complete phase file boundaries absent. |
| C12 | Partially addressed | Reference viewports and Lighthouse targets added; several old unsupported claims remain. |
| C13 | Addressed in the plan | Consequential choices and owner decision statuses are now recorded. Recheck current prices/eligibility at deployment. |
| C14 | Addressed in the plan | Useful primitives retained. Actual dependency/import checks must govern later pruning. |

## Next step

Use `docs/phase-0-agent-prompt.md` for a bounded handoff: correct the concrete plan defects and create a recoverable source/tooling baseline. Do not start dependency replacement, database setup, MFA implementation or deployment from the current pins. The narrow checks above can be verified directly; another full nine-reviewer cycle is unnecessary to detect whether a required insert field, published package version or integer range has been corrected.

The existing single-app architecture and the owner's fixed one-day session remain unchanged. Production hosting and recovery-device choices can remain explicitly pending until their relevant implementation/deployment gates.
