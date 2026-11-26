# Social icon search and custom uploads — 2026-11-26

## Scope and behavior

The icon picker uses a locally bundled catalog of Simple Icons (through `react-icons`) and Lucide components. It does not call an icon API. Supabase stores the selected library key; only custom uploads require Storage files.

- Added WhatsApp, Telegram, Discord, Reddit, TikTok, Twitch, Bluesky, Threads, Pinterest, and Stack Overflow to the catalog without changing existing saved keys.
- A single catalog now supplies display names, search aliases, rendering components, and the server's allowed keys. Search ignores case, spaces, and punctuation and recognizes names such as Twitter and Next.js. Empty results explain the custom-upload alternative.
- Skills and social links share `IconField`, which composes the existing picker/uploader. Choosing a library icon clears the custom reference. Uploading a custom icon clears the library selection. Removing it restores Code for skills or Globe for social links.
- Both public sections use `PortfolioIcon`. Custom social icons appear in the fixed rail and footer; existing skill glow and social hover styles remain. The accessible link label is independent of its decorative image.
- Custom uploads reuse the existing authenticated/rate-limited raster-image endpoint and Sharp pipeline. Icons are at most 256px and 40,000 bytes; server-side content saves also enforce these bounds. PNG, JPEG, and WebP are supported; transparency is retained where present. SVG/HTML and arbitrary remote icon URLs remain unsupported.
- HTTPS `wa.me` and `t.me` links work with the existing link validation. No extra icon-provider accounts, API keys, packages, or environment variables are needed.

## Database and media lifecycle

Drizzle migration `0004_social_custom_icons.sql` adds nullable `social_links.custom_media_id`, its restrictive foreign key, and an exclusivity check requiring exactly one library/custom source. `icon_key` becomes nullable. Existing rows retain their keys and gain a null custom reference. No existing content is deleted or rewritten.

The server publishes staged custom icons using the same workflow as skills. The public media route delegates to `servePublicImage`, which checks current publication and deletion state before accessing Storage and sends `no-store`. The public portfolio cache uses a new version key for the changed social data shape. Mutation invalidation is unchanged. LinkedIn contact detection also uses the platform name, so a custom LinkedIn icon does not remove its contact link.

Both cleanup reference checks now include social links. Drafts, active entries, and soft-deleted entries within retention protect their icons. Replaced/abandoned icons remain eligible for the existing cleanup schedule; expired trash releases its references after seven days. All testing of clock changes, invalid rows, and cleanup runs uses isolated PGlite data and mocked Storage, not hosted portfolio content.

## Release order

For this owner's existing Supabase project, the migration was applied during this update. A read-only preflight verified the project and the four prior migration hashes; only this migration was pending. Post-application queries verified the new optional column, both constraints, matching journal hash, enabled RLS, runtime read/write access, and anonymous schema isolation. No content or Storage fixtures were created on the hosted project.

For another checkout/database, apply the checked-in migration before deploying this code, using the configured local migration connection:

```sh
pnpm db:migrate
```

Do not regenerate or edit a migration after applying it. The migration is backward compatible with the previous application's library-only social links. Migration credentials stay local and are not needed by the deployed runtime.

## Verification

- `pnpm test`: 31/31 passed, including three new social-icon tests. The lifecycle test uses the production save, public image delivery, reconciliation, and cleanup functions with isolated PGlite and mocked Storage. It covers the upgrade from legacy rows, private roles, source exclusivity/foreign keys, built-in WhatsApp/Telegram saves, invalid/oversized media, stale edit conflicts, draft publication, replacement, library/custom switching, unpublishing, and retained/expired trash. This is automated integration evidence, not a live authenticated browser run.
- `pnpm lint`: passed without errors or warnings.
- `pnpm typecheck`: passed. During development it caught two un-narrowed `unknown` return values in the new test; those assertions were corrected and type checking rerun successfully.
- Drizzle generation after the final schema change: no schema drift; no further migration generated.
- Hosted migration postchecks: passed (see above).
- `pnpm build`: passed on Next.js 16.4.6, including static generation of the public portfolio against the migrated hosted schema.
- `git diff --check`: passed.
- Configured-private-value repository/history scan: passed for 209 current files and textual Git history. This is a bounded check for configured secrets, not an exhaustive secret detector.
- Configured-private-value browser-bundle scan: passed for 26 browser assets; no private values were printed.

Browser acceptance of the updated authenticated icon controls has not been executed in this task. The manual checks below remain for the owner; automated integration results above are not represented as a browser sign-off.

No commits, pushes, or deployments are part of this task.

Manual acceptance after deployment: in Social links, search/select WhatsApp and Telegram; upload a transparent custom icon; save a draft; publish and confirm the same icon in rail/footer; switch back to a library icon; unpublish and confirm the public link disappears. Repeat a custom/library switch for a skill and check its glow.
