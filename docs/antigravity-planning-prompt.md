# Antigravity planning prompt

Status: Updated working prompt, 2026-11-07. The owner has confirmed the core editing scope and a one-day admin session. Interpret one day as a fixed 24 hours after successful 2FA, not a sliding inactivity window. Hosting/budget, account recovery details, and the optional YouTube section remain open. The owner has supplied an optional Drizzle MCP setup and reports connecting the Supabase plugin in Codex; verify actual tool access separately in each client.

Copy the prompt below into Antigravity with this repository open. Keep `concepts_brief.md` available in the same repository.

---

Act as a senior Next.js engineer planning the migration of my existing portfolio. Inspect the whole repository and read `concepts_brief.md` before proposing changes. Write the reviewable implementation plan to `docs/implementation-plan.md`. This is the planning stage; do not start implementation, install dependencies, apply database changes, or provision external services yet. Identify any optional tool setup that will help implementation without blocking the planning work on it.

My current site is https://mohammadardi.online. The repository was generated with Lovable and currently uses Vite, React, TypeScript, Tailwind, and shadcn-style components. Preserve the recognisable dark navy/purple visual identity, monospace headings, glowing portrait, skills grid, project cards, certificates, and social links. Improve spacing, responsiveness, accessibility, animation consistency, and loading. My supplied screenshots identify editable areas with yellow rectangles; do not reproduce the rectangles as design elements.

## Confirmed scope

Build one Next.js App Router application containing the public portfolio, owner dashboard, and server functionality. Use Supabase Auth, Storage, and PostgreSQL. Evaluate Drizzle against that same database. A separate Neon database or backend project needs a demonstrated requirement, not just another tool in the stack.

From the dashboard I must be able to:

* Upload, replace, and remove my PDF resume; visitors open a shadcn dialog with preview, download, and a usable mobile fallback.
* Upload/replace/remove my portrait with a useful crop preview.
* Edit my About heading and text.
* Create/edit/reorder/hide/delete skills, including their name, icon, and glow colour.
* Choose skill icons through a searchable brand/general icon picker or upload my own transparent icon image.
* Create/edit/reorder/hide/delete projects with title, image, description, live link, and optional GitHub link. Preserve the existing separate frontend/backend repository links where present.
* Create/edit/reorder/hide/delete achievements with image, title, certificate type, description, and certificate target URL.
* Manage social/media links in one place, updating both sidebar and footer.

The original idea also includes weekly favourite YouTube videos. Keep this visible as an optional scope decision until confirmed; propose simple manually managed cards and no automatic import dependency. Recommend making remaining hero/contact text editable without building a general page editor.

## Agent tools and review handoff

Use the Supabase and Drizzle tools when they are actually available and useful. They assist development and inspection; the deployed website must not depend on an agent MCP connection.

**Drizzle MCP, optional.** The owner supplied this documented RC setup for the package containing the schema and Drizzle config:

```sh
pnpm add drizzle-orm@rc
pnpm add -D drizzle-kit@rc
```

```json
{
  "mcpServers": {
    "drizzle": {
      "command": "pnpm",
      "args": ["exec", "drizzle-kit", "mcp"]
    }
  }
}
```

Use Antigravity's supported configuration location and set the working directory to this repository's Drizzle package, where `drizzle.config.*` lives. Check its actual connection/tool list. On Windows, use the launcher form supported by the client; do not assume configuration for another editor will work unchanged. If dependencies/config do not exist yet, record these implementation prerequisites and continue planning from source and docs.

Before implementation, verify whether the chosen stable versions provide the needed MCP features. If the RC path is required and used, resolve and pin exact compatible ORM/Kit versions, commit `pnpm-lock.yaml`, and record the prerelease choice and compatibility checks. Do not leave floating RC versions as the reproducibility strategy or upgrade the runtime solely for an optional agent convenience without explaining the tradeoff.

Distinguish inspection, local migration-file generation, and database mutation. The documented rc5 MCP does not expose a `migrate` tool; inspect the installed version's real capabilities instead of inventing one. Use the selected CLI/deployment workflow to apply committed, reviewed SQL during implementation. [Drizzle MCP documentation](https://orm.drizzle.team/docs/drizzle-kit-mcp).

**Supabase tools.** Discover the actual available project tools and verify the project/environment before reading data. Prefer project-scoped read-only inspection during planning. Use current docs, schema/migration inspection, narrowly scoped logs, and security/performance advisors as needed. A plugin installed in Codex does not automatically connect Antigravity or prove this chat can inspect a live project. Report unavailable capabilities plainly and continue unaffected repository work.

Choose one migration authority for application tables: committed Drizzle migrations if Drizzle is selected. Track Auth/Storage policy and configuration changes explicitly, with a clear owner and replay order. Avoid independent dashboard/MCP/CLI edits that leave the application schema different from its committed migrations. Leave Supabase-managed system schemas under provider management. Check current CLI version/help and explicitly identify local vs hosted targets before commands; Supabase CLI v3 changed these defaults.

**Coordination with Codex.** Keep the plan and later implementation status in this shared repository. During implementation, maintain `docs/implementation-status.md` after each completed phase with changed files, exact non-secret verification commands/results, migration filenames and applied target, remaining work, failures, and deliberate plan deviations. Record the non-secret project reference/environment where needed, never credentials. Identify the current source snapshot/commit. Antigravity owns edits while Codex reviews the current saved state; avoid simultaneous changes to the same files or database. Publish a handoff checkpoint before another agent takes over. This file supports requested reviews; it does not imply an automatic background monitor is running.

## Plan the difficult details explicitly

1. **Source and version baseline.** Inspect actual files and current dependency support. The earlier local build failed loading an SWC native binding, and lint reported 3 errors/8 warnings; distinguish environment issues from source issues. Multiple lockfiles exist. Verify source control/snapshot availability before migration. Use pnpm as the working package-manager choice, consistent with the supplied MCP setup, unless an actual repository constraint prevents it. Select compatible supported versions and explicitly document any Drizzle RC exception.

2. **Server/client split.** Render meaningful portfolio content on the server and isolate navigation, dialogs, forms, and animation as small client components. Explain what replaces React Router, Helmet, and Vite. Avoid making the entire page a client component. Keep only used UI components and justified dependencies.

3. **Database and authorization boundary.** Provide schema, constraints, foreign keys, ordering, optional-link handling, publication/deletion state, media metadata, and stale-edit handling. Select one runtime query path. If Drizzle connects directly, explain that SQL credentials do not inherit Supabase user/MFA claims: enforce owner + MFA in shared server guards, use a limited runtime database role and separate migration credentials, and exclude private application tables from direct browser Data API access. If using user-JWT Data API calls instead, specify and test row policies. Do not mix these models without a reason.

4. **Mandatory owner 2FA and one-day session.** Assume one deliberately provisioned owner and disabled public signup, marking the assumption. Propose email/password plus authenticator TOTP. Require enrollment and a second factor on every fresh login. The owner selected one day: use a fixed 24-hour authorization deadline established only after the server verifies successful 2FA for that fresh login. Refreshing tokens, visiting pages, or reopening the browser must not extend the deadline; a normal page refresh within it should keep the owner signed in. After expiry, require a new primary sign-in and second-factor verification. Keep ordinary access tokens short-lived; do not implement this by setting JWT expiry to 24 hours. Verify signed identity, owner ID, `aal2`, session validity, and the fixed deadline at every admin read/mutation/upload/preview/delete entry point. A UI timer/redirect or password-only session must never authorise edits. Supabase's built-in lifetime controls require Pro or above and are evaluated on refresh, so describe exact server enforcement and provider settings separately. If needed, use a minimal server-controlled authorization/deadline record tied to the verified `session_id`; refreshed token `iat` must not reset it. Prevent reissuing that record from a stale `aal2` token without fresh authentication. Expire/revoke it on sign-out and keep direct Storage/API access and issued capabilities consistent with the deadline; proxy operations when a capability cannot honour it. Include a verified lost-device recovery procedure without an email-only MFA bypass or invented recovery-code support. Budget remains unresolved, so distinguish provider-paid controls from application enforcement rather than silently assuming an upgrade.

5. **Skill icon design.** Propose a versioned, searchable registry using Simple Icons for brands and Lucide for general concepts, plus uploaded transparent PNG/WebP. Store stable provider/key or media ID, label, accent colour, and order. Keep full icon catalogues out of the public browser bundle; load picker assets only in admin. Show the same card/glow preview for custom and library icons. Preserve multicolour uploads, validate accent values, respect brand guidance, and handle renamed/missing icons. Raw uploaded SVG/HTML must not be injected into the page; justify any expansion of custom file formats.

6. **Uploads and deletion.** Define size/pixel/type validation, image re-encoding, private staging, published image delivery, immutable keys, and per-operation authorization. Fit upload transport to real hosting body-size limits. Explain signed-upload capability lifetimes if used. Replace media safely when either storage or the database fails; those systems are not one transaction. Preserve referenced assets, handle orphan cleanup, and propose practical restore/deletion semantics.

7. **CV delivery and limits.** Keep the PDF private in Storage and serve the current approved document through same-origin route handlers if limiting actual file requests. Do not expose a public URL or signed redirect and claim delivery is rate-limited. Specify streaming, inline/attachment disposition, Range/HEAD support, viewer fallback, caching, size limits, `429`/`Retry-After`, trusted client-IP extraction, and distinct preview/download budgets. Use shared atomic counters suitable for multiple server instances, not an in-memory Map. Compare a small Postgres limiter with supported hosting facilities before adding Redis. Explain global budget, expiry/cleanup, failure behaviour, and double egress/compute tradeoffs. No limiter can stop redistribution after download.

8. **Operations and cache behaviour.** Choose Server Actions or route handlers per purpose; both are reachable server entry points and require checks. Define input validation, CSRF/origin handling for cookie-authenticated mutations, errors, rate limits, and bounded audit logs. Show how saves/deletes reach the public page, how drafts stay private, and how private/auth responses avoid shared caches. Check current Next.js revalidation semantics instead of assuming every invalidation is immediate.

9. **UI polish.** Fix the social rail crowding the hero at the supplied desktop width, mobile spacing, fixed-header anchor offsets, image layout stability, certificate containment, and keyboard focus. Use accessible dialogs and menu states. Keep content visible if animation/scripts fail and respect reduced motion everywhere. Prefer CSS plus one motion library unless another is justified by a specific interaction. Preserve existing content and links; flag factual/copy issues instead of silently inventing achievements or rewriting my biography.

10. **Contact and deployment.** Inspect EmailJS/reCAPTCHA provider assumptions and plan server-side validation, anti-spam checks, limits, and delivery handling. Keep email-provider choice and budget explicit; no requirement for a message inbox yet. Plan owned metadata/Open Graph images, correct canonical domain, robots/sitemap, admin noindex, environment separation, pooled SQL connections, backups of database AND files, and rollback/cutover. Hosting provider and monthly budget are not confirmed, so distinguish provisional defaults and paid-plan requirements from settled choices.

## Required deliverable

Write a plan that includes:

* Evidence from this repository with file references and a concise list of actual gaps.
* Confirmed requirements, proposed defaults, unresolved choices, and explicit exclusions.
* Chosen architecture and alternatives with concrete tradeoffs.
* Proposed folder structure, data model, server-operation/access matrix, and storage rules.
* Dependency/tooling migration map and content/media seed strategy.
* Phased implementation with dependencies, acceptance checks, and rollback points.
* Meaningful tests for non-owner/password-only access, MFA enrollment, sign-out/revocation, access just before and at/after the 24-hour deadline, token refresh not extending it, rejection of stale-token deadline renewal, upload/direct-access consistency, CRUD, optional links, icon selection/uploads/glow, upload failure, referenced-media deletion, CV range/rate limits, draft/cache isolation, and mobile/keyboard accessibility.
* Deployment assumptions, current documented limits, expected cost categories, and an owner setup/recovery checklist.
* A tools/setup section recording verified vs missing MCP capabilities, exact proposed versions, one migration authority, environment selection, and the review/status handoff format. Do not install or mutate infrastructure simply to write this plan.

Use simple direct English. Cite current official documentation for version-sensitive decisions. Challenge unnecessary complexity; do not assume the existing library choices are all needed. Make routine decisions with reasons and ask only for choices that materially change the product or its cost. Do not claim to have run tests, measured performance, or obtained a Goldfish review when you have not.

End with a short list of the weakest assumptions and the specific questions a fresh EGM Goldfish review should challenge. We will review the plan with isolated Goldfish agents after the scope and hypothesis are ready.

---

## Current official references

* [Supabase with Drizzle](https://supabase.com/docs/guides/database/drizzle)
* [Drizzle with Supabase](https://orm.drizzle.team/docs/get-started/supabase-new)
* [Drizzle Kit MCP setup and capabilities](https://orm.drizzle.team/docs/drizzle-kit-mcp)
* [Supabase MCP setup and project scoping](https://supabase.com/docs/guides/ai-tools/mcp)
* [Supabase CLI v3 target and configuration changes](https://supabase.com/changelog/supabase-cli-v3)
* [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
* [Supabase session behaviour and plan limits](https://supabase.com/docs/guides/auth/sessions)
* [Supabase server auth clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
* [Storage access models](https://supabase.com/docs/guides/storage/buckets/fundamentals)
* [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
* [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
* [Next.js cache revalidation](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
* [shadcn Dialog](https://ui.shadcn.com/docs/components/dialog)
* [Simple Icons and brand metadata](https://github.com/simple-icons/simple-icons)
* [Lucide](https://lucide.dev/guide/)
