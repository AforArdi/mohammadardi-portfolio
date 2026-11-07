# Portfolio migration and owner dashboard

* **Author:** AforArdi
* **Date:** 2026-11-07
* **Status:** Working hypothesis, updated with the owner's one-day session choice and optional MCP setup. Architecture recommendations below remain provisional. No Goldfish review has run and application code has not been migrated.

## Overview

Move the existing Lovable-generated Vite/React portfolio to one Next.js application. Keep the recognisable dark navy background, purple accents, monospace headings, glowing portrait and skill cards, and existing section order. Improve spacing, motion, accessibility, loading, and sharing metadata.

Add a small owner-only dashboard for updating content and media without editing code. Use Supabase for authentication, PostgreSQL, and file storage. Drizzle can query that same database and manage the application schema; a second database provider is unnecessary for the known requirements.

The seven screenshots supplied on 2026-11-07 are visual references. Their yellow rectangles are annotations identifying editable content, not requested design elements.

## Analysis

### What exists today

| Area | Evidence in this repository | Migration implication |
| --- | --- | --- |
| Application shell | `src/main.tsx`, `src/App.tsx`, `src/pages/Index.tsx` | Replace Vite, React Router, and Helmet with Next.js routing, layouts, and metadata. |
| Public routes | `/` and a catch-all not-found page | Preserve section anchors; no requirement for project detail pages yet. |
| Content | Local strings and arrays in section components | Extract existing content into a repeatable initial database seed. |
| Media | Local PNGs plus Postimg, GitHub, and certificate URLs | Import verified assets into owned storage while retaining external verification links. |
| Skills | `src/components/SkillsSection.tsx` | Existing names, icons, colours, grid, and hover glow provide the initial data and visual baseline. |
| Projects | `src/components/ProjectsSection.tsx` | Preserve HeroRide's separate frontend and backend repository links, as well as ordinary optional GitHub links. |
| Social links | Duplicated in `FloatingSidebar.tsx` and `Footer.tsx` | Use one ordered collection so dashboard changes update both locations. |
| Contact | EmailJS and reCAPTCHA in `ContactSection.tsx` | Browser checks alone do not demonstrate that provider-side anti-bot settings are enforced. Verify them or move submission checks to the Next.js server. |
| Animation | `framer-motion`, `motion/react`, GSAP, and Lenis | Prefer CSS and one motion library; retain another only if a measured interaction requires it. |
| Generated scaffolding | Broad UI library, React Query provider without portfolio queries, unused `App.css`, multiple lockfiles | Keep only useful parts, including dashboard primitives, and choose one package manager. |
| Metadata | Canonical points to `ardi.dev`; social previews reference a Lovable image | Use `https://mohammadardi.online`, owned social preview artwork, sitemap, robots, and accurate profile metadata. |
| Local baseline | Earlier build failed loading SWC's native binding; lint reported 3 errors and 8 warnings | Native binding failure needs an environment/install diagnosis; it does not prove the source cannot build. Capture a clean-install baseline before migration. |
| Repository safety | Earlier `git status` reported no Git repository in this folder | Verify the real source repository or create a recoverable source snapshot before replacing tooling. Do not assume rollback is available. |

These are source observations and limited live-site observations, not a completed penetration test or full cross-browser audit.

### Confirmed first-release content

| Dashboard area | Editable fields | Required behaviour |
| --- | --- | --- |
| CV / resume | Uploaded PDF, display filename, current active document | Upload, replace, remove, preview in a shadcn dialog, and download. Hide the public CTA when no CV exists. |
| Portrait | Uploaded image, alt text, crop / focal point | Preview the actual circular crop and glow; replace or remove without losing the old image if saving fails. |
| About | Name / heading and biography | Preserve readable paragraph breaks; plain text is sufficient initially. |
| Skills | Name, library icon or uploaded icon, accent colour, display order | Create, edit, preview, reorder, hide/show, and delete. Library and custom icons receive the same card and glow treatment. |
| Projects | Title, image, description, live URL, optional GitHub URL, optional separate backend repository URL | Create, edit, reorder, hide/show, and delete. Omitted links produce no empty buttons. |
| Achievements | Image, title, certificate type, description, verification / target URL | Create, edit, reorder, hide/show, and delete. Preserve complete certificate images. |
| Social / media links | Platform or custom label, URL, icon, order | Create, edit, hide/show, reorder, and delete; update the sidebar and footer together. |

All collections need working server operations, useful validation errors, loading and failure states, and deletion behaviour. Singleton sections need update and removal/reset behaviour where meaningful, rather than artificial collection CRUD.

### Suggested additions, not newly asserted owner requirements

Make the hero greeting, tagline, availability text, contact copy, and contact destinations editable alongside the profile to avoid leaving scattered hard-coded strings. Include alt text on meaningful images and a live form preview. Use clear Save / Publish language, unsaved-change warnings, keyboard-operable ordering controls, and confirmation for destructive dashboard actions.

The weekly favourite YouTube section remains an optional item from the original request. Propose an empty-hidden collection of video ID, title, short note, order, and optional week-start date. Prefer thumbnail cards that open YouTube; an embedded player should load only after interaction. Do not add automated discovery, scraping, or a YouTube API dependency. Confirm inclusion and whether old weeks remain visible before making it a launch requirement.

### Proposed architecture and its boundaries

Use Next.js App Router, TypeScript, Tailwind, selected shadcn components, Supabase Auth, Supabase Storage, and Drizzle with Supabase PostgreSQL. The public site, dashboard, and server operations live in one application. Use pnpm as the working package-manager choice, consistent with the owner-supplied setup. Use a currently supported stable framework release when implementation starts and pin a compatible dependency set; document any required Drizzle RC exception explicitly.

The public page should render useful content on the server, with small client components for navigation, dialogs, forms, and animation. Read only published, non-deleted records into a public data shape. Keep private settings and draft data out of public component props and caches. Cache public content and invalidate affected content after successful mutations; specify whether a save becomes visible immediately or after revalidation under the selected Next.js APIs. Admin and authentication responses must not enter shared caches.

**Working Drizzle choice:** run application queries only on the Next.js server using a dedicated runtime database role with narrowly scoped grants. Keep application tables in a schema excluded from browser Data API access; use separate elevated migration credentials. Never connect at runtime as the migration owner or expose a database URL to the browser.

An ordinary Drizzle SQL connection does not automatically carry the visiting user's Supabase JWT or MFA identity. Every admin read and mutation must pass one shared server guard that verifies identity, the configured owner's immutable user ID, MFA assurance, and the agreed session policy. Supabase Storage policies are a separate boundary. If an implementation instead uses Supabase Data API calls carrying the user JWT, it must explicitly implement and test owner + MFA row policies. Do not claim both approaches provide the same protection automatically.

Suggested small schema: `profile` (singleton), `skills`, `projects`, `achievements`, `social_links`, and `media_assets`; add `favourite_videos` only if accepted. Use media references, stable IDs, ordering fields, timestamps, and version checks for stale edits. Media metadata includes bucket/key, kind, MIME type, size, dimensions where applicable, and processing state. Keep rate counters and any application session controls private. Avoid a generic page builder or full revision system.

### Development tools and review coordination

The owner supplied `drizzle-orm@rc`, `drizzle-kit@rc`, and a stdio MCP entry running `pnpm exec drizzle-kit mcp`. Use it optionally from the package containing the Drizzle config. Verify the installed tool/version support and pin a compatible exact pair if taking the RC path. MCP is a development aid and adds no deployed service requirement. Current rc5 documentation distinguishes file generation from database changes and does not expose a migration-apply tool; use the chosen migration CLI/deployment process instead. [Drizzle MCP](https://orm.drizzle.team/docs/drizzle-kit-mcp).

The owner reports connecting the Supabase plugin in Codex. This session currently exposes its instructions but no callable Supabase project tools; live access is unverified. Each client must discover its actual tools and project/environment independently. Prefer scoped read-only inspection during planning and avoid relying on a connection to justify untracked schema changes. [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp).

Use one committed migration authority for application tables, with explicit versioning and replay order for Auth/Storage policies and configuration. Inspect installed CLI help and targets; Supabase CLI v3 changed default targeting to local. [CLI change](https://supabase.com/changelog/supabase-cli-v3).

Have Antigravity write `docs/implementation-plan.md` and later maintain `docs/implementation-status.md` with completed phases, changed files, migrations/targets, actual verification results, deviations, and pending work. Keep secrets out of these files. One agent owns edits at a time; Codex can review saved checkpoints. No automatic monitoring has been started.

### Authentication and mandatory 2FA

Assume one owner and no public registration, pending owner confirmation. Provision that account deliberately, with no public endpoint that grants admin status. Prefer email/password plus an authenticator-app TOTP code. Require enrollment before access and require the second factor on every fresh sign-in. A password-only or password-reset session must not expose dashboard data or allow edits.

Supabase represents verified second-factor sessions with `aal2`. Enabling MFA is insufficient by itself: enforce the requirement at every server entry point, including uploads, preview data, reorder, delete, and account settings. Check a verified token, not merely the presence of an auth cookie or unverified session object. Navigation redirects are convenience, not authorization. [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Next.js data security](https://nextjs.org/docs/app/guides/data-security).

**Owner decision: one day.** Interpret this as a fixed 24-hour authorization window after successful 2FA for a fresh sign-in. Page refresh, token refresh, and reopening the dashboard within that window do not reset or extend it. Once it expires, require primary sign-in and 2FA again. This is an absolute limit, not a sliding inactivity timer. Ordinary access tokens remain short-lived.

Supabase's built-in session lifetime/inactivity controls require Pro or above and are evaluated during refresh, so they do not alone describe an exact deadline on every request. Plan server enforcement of the fixed deadline as well as applicable provider settings. If needed, keep a minimal private authorization record tied to verified `session_id`, established only when the server completes fresh-login MFA. Never derive a new 24-hour allowance from a refreshed token's `iat`, client timestamps, or an already elevated token submitted after expiry. Budget remains unresolved; do not assume a paid plan. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

Check the deadline at every admin server entry point, revoke the app authorization on sign-out, and account for invalidated provider sessions. Any direct Storage/API access or upload capability must obey the same deadline; use guarded server transport if a capability cannot do so. Verify access immediately before and at/after expiry, refresh without extension, stale-token renewal rejection, sign-out, and upload enforcement. A front-end timer alone is insufficient.

Document a tested lost-device recovery procedure, preferably a second authenticator factor and protected Supabase project access for the owner. Do not invent built-in recovery codes or introduce a public email-only MFA bypass. Verify current provider support before promising a recovery feature.

### Professional skill icon system

Use a searchable picker backed by a versioned registry: Simple Icons for technology and social brands, Lucide for concepts such as APIs, networking, and security. Store a provider and stable icon key, not executable code or arbitrary component imports. Present brand names and default colours with a preview; preserve brand colours where appropriate. Simple Icons publishes brand metadata, colour values, and guideline links; this does not imply unrestricted trademark permission. [Simple Icons](https://github.com/simple-icons/simple-icons).

Start with a useful curated catalogue, including all existing skills, and load the picker only inside the dashboard. Resolve public icons on the server or through a small explicit registry so the homepage does not ship every icon. Pin icon versions, maintain aliases for renamed keys, and use a deliberate fallback for an unavailable icon.

Custom transparent PNG/WebP uploads provide the first-release escape hatch for any missing icon. Validate and re-encode them, preserve transparency, and preview them against the actual dark card. Do not accept arbitrary SVG markup in this first scope; library vectors already cover the common cases. If SVG uploads become necessary, plan a separately tested sanitisation/conversion path before enabling them. Never inject uploaded markup into the page.

Normalise the visible icon canvas and padding while preserving aspect ratio. Keep `accent_colour` separate from the icon itself; a validated colour value drives a CSS variable used by the card's radial wash, border, and restrained glow. Custom multicolour logos keep their original pixels. Preview default, hover, keyboard focus, and reduced-motion states. This avoids requiring a new code change for each uploaded skill.

### CV preview, storage, and rate limits

The hero CV control opens an accessible shadcn dialog containing a PDF preview and visible Download / Open in new tab controls. On phones use a layout that fits the viewport and a working fallback when the browser cannot embed PDFs. Load the document only after the dialog opens; give an explicit loading and failure state. Prefer the browser PDF viewer initially; add a separately loaded renderer only if tested mobile requirements demand it.

Keep the CV in a private bucket. A public bucket URL bypasses app-level download controls. A signed URL also permits repeated direct storage requests until it expires, so rate-limiting only URL creation is not the same as rate-limiting file delivery. [Supabase bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).

For the requested limit on delivery, stream the current approved CV through same-origin preview and download route handlers. Resolve the object from stored metadata, never from an arbitrary URL supplied by a visitor. Set the PDF MIME type, `nosniff`, and the appropriate inline/attachment disposition. Define correct Range/HEAD handling and limit pathological range requests so browser PDF viewers keep working. Do not expose a storage redirect or publicly cache the complete response in a way that bypasses those limits.

Use shared, atomic rate counters rather than per-process memory. For this small app, a bounded PostgreSQL counter is a candidate; compare its request load with the selected host's supported limiter before adding another service. Give preview requests a different budget from download starts, account for shared IP addresses, and include a global bandwidth/request budget, `429` responses, `Retry-After`, and counter expiry. Trust client IP headers only from the chosen deployment proxy. Fail closed for limited endpoints when their limiter is unavailable, with a useful retry message.

Rate limits reduce abuse; they cannot prevent redistribution after a visitor downloads the public-facing CV. The private bucket is a delivery-control choice, not a claim that the resume is confidential.

### Media, editing, and deletion

Use private staging for uploads and validate actual content, dimensions, pixel count, MIME type, and byte limits before publication. Re-encode images, strip unnecessary metadata, and use immutable object keys. Set limits to fit the chosen deployment's request and processing constraints. A signed-upload grant, if used, is a scoped capability with its own lifetime; document that boundary and rate-limit grant creation and finalisation. Do not call it single-use or instantly revocable unless implemented and verified.

Only validated, intentionally published image derivatives belong in public media storage. Draft uploads must not become publicly readable just because their database row is hidden. Use authenticated storage access or a narrowly guarded server operation for owner uploads. Keep elevated storage credentials server-only and identify each intentional policy bypass.

Upload the replacement first, validate it, then update its content reference in a database transaction. Storage and PostgreSQL do not form one atomic transaction, so plan compensating cleanup for failed steps. Never remove an old file before a successful replacement. Prevent deletion of assets still referenced by other content. Offer soft deletion/restore for content where practical and an explicit cleanup procedure for orphaned files. State how cache invalidation affects deleted content and public images that may already be cached.

Public URL fields must accept appropriate safe web URLs; omit optional links cleanly. Keep the contact email and other specialised schemes in their own validated fields. Do not turn arbitrary remote URLs into a server-side fetch service.

### Visual quality and performance

Fix the fixed social rail overlapping the hero at the supplied desktop width by reserving a gutter or changing the breakpoint. Keep it out of the mobile reading area. Add fixed-header anchor offsets and visible keyboard focus. Ensure the mobile menu exposes its expanded state and behaves with keyboard navigation.

Keep content visible when animation is disabled or scripts fail; enhancement code must not leave the page at opacity zero. Respect reduced-motion preferences consistently, including portrait loops and scrolling. Retain gentle hover and reveal effects without requiring several animation engines.

Use responsive optimised images with intrinsic dimensions, priority only for the hero, lazy loading below the fold, and managed fonts. Certificate previews should contain the full page; project thumbnails can use a consistent crop with preview controls. Keep descriptions readable and align card actions. The dashboard can have a simpler layout tuned for editing while sharing typography, accents, and component states.

Target good Core Web Vitals, keyboard usability, and no horizontal overflow at common phone, tablet, and desktop widths. Use production-build measurements; do not promise a Lighthouse score before testing. Add meaningful metadata, an owned Open Graph image, canonical URL, and `noindex` for admin routes. Robots directives do not replace authentication.

## Goals vs. Non-Goals

**In-scope goals:** the confirmed editable content, secure owner access with mandatory 2FA, working media replacement/deletion, CV preview/download limits, source-preserving migration, and a polished public site using the current visual identity.

**Proposed supporting work:** basic ordering/visibility, previews, validation, contact submission protections, metadata correction, recoverable deletion, and simple operational instructions. Session lifetime is confirmed as one day. Confirm hosting, monthly budget, and contact delivery approach before finalising deployment assumptions.

**Non-goals for the initial architecture:** a separate Express/backend project, a second database provider, public accounts, multiple staff roles, arbitrary page building, raw HTML editing, automatic YouTube imports, analytics dashboards, a full revision CMS, or an unrequested visual rebrand. These are scope recommendations, not owner-rejected ideas.

## Alternatives Weighed

* **Supabase + Neon:** not recommended for the known scope; Supabase already supplies the needed PostgreSQL database. Revisit only for a concrete database requirement.
* **Supabase SDK for all queries:** a viable simpler alternative using user JWTs and row policies. Drizzle is proposed because the owner expressed interest in it, not because CRUD requires an ORM. [Supabase's Drizzle integration](https://supabase.com/docs/guides/database/drizzle).
* **Drizzle migrations with Supabase SDK runtime:** also viable; adds two schema/query conventions but keeps user JWT-based data policies. Compare honestly before final selection.
* **Separate backend service:** adds deployment and auth boundaries that this small portfolio does not currently need.
* **Public resume object with a limited button endpoint:** simplest delivery but does not meet the intended control over actual file requests.
* **Hosting every icon on an external icon CDN:** easy to start, but adds a runtime dependency and potential missing-icon failures; prefer owned/versioned assets or imports.
* **All SVG uploads and a universal rich-text/page editor:** more processing and content-security work than the current requirements justify; revisit only if needed.

No alternatives in this section have been explicitly rejected by the owner yet.

## Key Decisions & Staging for Next Steps

1. Capture a recoverable source baseline, initial content, and reference screenshots. Diagnose the local installation before inferring source failures.
2. Carry forward the confirmed one-day session duration. Resolve account recovery, hosting/budget, and whether weekly videos launch now, recording provisional defaults where appropriate.
3. Use `docs/antigravity-planning-prompt.md` to request a concrete implementation plan. It can be used now as a working prompt; unresolved decisions must remain marked.
4. Once the working hypothesis is reviewed and the owner confirms readiness, run fresh-context EGM Goldfish reviewers. Carry their objections into a revised brief and plan; do not label this document reviewed before that happens.
5. Implement visual parity in Next.js with the initial content first, then auth, schema, storage, dashboard, CV delivery, and contact handling in verifiable slices.
6. Verify unauthenticated/non-owner/password-only denial, full content CRUD, custom/library icon rendering, replacement failures, CV range/rate limits, cache isolation, mobile/dialog accessibility, and migration/rollback before moving the domain.

Keep the currently deployed site as the rollback target during cutover. Seed content reproducibly, back up both the database and stored files, document the owner's recovery steps, and test one restore. Deployment and domain changes are later execution steps, not performed by this brief.
