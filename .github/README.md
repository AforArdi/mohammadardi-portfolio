# A portfolio you can make your own

A personal portfolio with an owner dashboard. Update your content without editing code, and customize the colors, fonts, and layout to match your style.

Built by **Md Miftahul Islam Ardi**. Original site: [mohammadardi.online](https://mohammadardi.online). The live site may differ from the latest repository code.

> **Release status:** this is a working project, not yet a fully verified production template. Dependency advisories and additional tests remain. See [release readiness](../docs/reviews/RELEASE_READINESS.md).

## What can I edit from the dashboard?

| Section | Editable content |
| --- | --- |
| Profile | Photo, introduction, about text, availability, contact email |
| Resume | Upload a PDF for visitors to preview in a dialog and download |
| Skills | Names, library/custom icons, glow colors, order |
| Projects | Image, title, description, live link, optional frontend/backend GitHub links |
| Achievements | Image, title, certificate type, description, verification link |
| Social links | Profiles shown across the website |
| My YT Week | YouTube link, automatically fetched title/thumbnail, your description, optional title override |

Collections support drafts, publishing, ordering, and deletion. YouTube selections stay visible until you change them; they do not expire automatically each week.

Owner login uses a password **and** an authenticator code, with a fixed 24-hour dashboard session. Changing your password requires the current password and a fresh code, then signs out dashboard sessions. There is no public signup page or forgot-password feature.

## The stack, in plain language

This is **one Next.js app**, including the public website, admin dashboard, and API.

- **Next.js / React / TypeScript:** pages and application logic.
- **Tailwind / shadcn/ui / Motion:** styling, interface components, animation, and reduced-motion support.
- **Supabase:** PostgreSQL database, authentication, and file storage.
- **Drizzle:** database schema, migrations, and queries.
- **Sharp:** automatic WebP image compression.
- **Simple Icons + Lucide:** locally bundled icons; custom image icons are also supported.

No separate backend project or Neon database is needed. Supabase Free is the intended starting point; traffic, storage, and provider terms still determine whether your usage fits free allowances.

## Set up your own copy

### 1. Install the project

Use **Node.js 22+** and **pnpm 10.34.5**. Fork this repository, clone your fork, and open its folder in a terminal:

```sh
pnpm install --frozen-lockfile
```

### 2. Connect your own Supabase project

Create a new Supabase project. Under **Authentication → Users**, create your owner account with a confirmed email and a password you keep privately. Copy its user ID. Keep public account signup disabled for an owner-only setup.

Copy `.env.example` to `.env.local` using your editor. In PowerShell, you can use:

```powershell
Copy-Item .env.example .env.local
```

Fill in these values from **your** project:

| Variable | Value |
| --- | --- |
| `APP_URL` | `http://localhost:3000` locally; your exact HTTPS origin when deployed |
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable API key |
| `SUPABASE_SECRET_KEY` | Your server-only secret key |
| `OWNER_EMAIL` / `OWNER_USER_ID` | Your owner account email and user ID |
| `DATABASE_ADMIN_URL` | A working direct or **session-pooler** connection URL, including your database password |

Get the database URL from Supabase's **Connect** dialog. Use your project's correct region/hostname; URL-encode special characters in the password. Bootstrap tries your supplied URL first. Its fallback discovery uses the original Singapore region, so supply a working regional session-pooler URL for other regions.

`.env.local` is ignored by Git. Never put server secrets or database passwords in `NEXT_PUBLIC_` variables, screenshots, source files, or commits.

### 3. Initialize the backend

Run against your **new** project:

```sh
pnpm db:bootstrap
pnpm db:migrate
pnpm storage:setup
```

Bootstrap creates restricted roles and saves their connection strings and generated application secrets to `.env.local`.

**Before seeding**, replace the original personal content in `src/lib/content/seed-data.ts` and the image sources in `scripts/seed-portfolio.ts`. Use your own text, links, photo, screenshots, and certificates.

```sh
pnpm db:seed
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The homepage needs initialized, seeded database content; there is no standalone offline demo mode.

Seeding keeps existing records. After setup, use the dashboard to edit content; another seed run will not overwrite your edits. Do not reset or seed another person's database.

### 4. Open the dashboard

Visit [localhost:3000/admin/login](http://localhost:3000/admin/login). Sign in and enroll an authenticator such as Google Authenticator. Keep a trusted backup of your authenticator setup.

Upload your actual PDF under **Profile & CV** to enable the resume button. Use **Security** for password changes. For troubleshooting and offline recovery, see [backend setup and operation](../docs/setup/BACKEND_SETUP.md).

## Change the theme

Themes are customized in code; there is currently **no dashboard theme switcher**.

Start with the CSS variables in `src/index.css`. For example, to try a blue accent:

```css
--primary: 205 90% 65%;
--accent: 205 90% 65%;
--ring: 205 90% 65%;
--glow-primary: 205 90% 65%;
--gradient-start: 205 90% 65%;
```

These are HSL values without an `hsl()` wrapper. Adjust the secondary glow/gradient tokens too. If changing backgrounds/text, check both `:root` and `.dark`; the root layout currently applies the dark class. Recheck text contrast and keyboard focus visibility.

| Change | File |
| --- | --- |
| Colors, glow, borders, shared styles | `src/index.css` |
| Fonts | `app/layout.tsx` |
| Tailwind token mapping | `tailwind.config.ts` |
| Section layouts | `src/components/*Section.tsx` |
| Reveal animations | `src/components/Reveal.tsx` |
| Reduced-motion behavior | `src/components/Providers.tsx` |
| Available icon choices | `src/lib/content/icons.tsx` |

Skill glow colors are already editable in the dashboard. Keep the existing reduced-motion and accessibility behaviors when changing the design.

## Replace the remaining personal settings

Some branding still lives in source files:

- **SEO name, description, canonical domain:** `app/layout.tsx`.
- **Sitemap/robots domain:** `app/sitemap.ts`, `app/robots.ts`.
- **Social preview/favicon:** `app/opengraph-image.tsx`, `app/icon.svg`.
- **Personal labels:** search for `Ardi` and `mohammadardi.online`, including the admin header and resume labels.
- **Contact provider:** Set `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, and `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in your environment. Configure Google allowed domains (including localhost for development) and provider-side CAPTCHA/origin restrictions before enabling the form. Do not use the original owner's email service for your copy.

Changing `APP_URL` alone does not change hardcoded SEO URLs. Replace all personal assets with your own material.

## Images and storage

New image uploads are converted to WebP:

| Purpose | Maximum dimension | Maximum stored size |
| --- | --- | --- |
| Icon | 256 px | 40 KB |
| Portrait | 800 px | 160 KB |
| Project | 1600 px | 250 KB |
| Certificate | 2400 px | 400 KB |

Sizes use decimal KB. Image input is limited to 3.5 MB / 24 megapixels; files that cannot fit safely are rejected. PDFs have a separate 3.5 MB limit and are not processed by Sharp.

All Storage buckets stay private, including the one named `public-media`. Visitors receive published images through the app. YouTube thumbnails load directly from trusted YouTube image hosts, without being copied to Supabase.

Smaller files reduce storage/bandwidth use. The CV endpoint's monthly response-byte limit does not cap all provider egress; repeated image/PDF reads still matter.

## Test and build

```sh
pnpm test
pnpm lint
pnpm build
pnpm typecheck
pnpm start
```

Run build and type check **one after the other** because Next.js regenerates route types. Building needs configured database content and access to Google Fonts on the first build.

The test suite uses isolated PGlite databases and mocked external failures. It does not change your real password or authenticator. Passing it does not mean complete coverage.

Optional checks:

```sh
pnpm exec tsx tests/youtube-live.ts
pnpm exec tsx tests/client-bundle-secrets.ts
pnpm exec tsx tests/public-repo-secrets.ts
pnpm exec tsx tests/server-smoke.ts
pnpm audit --prod
```

The bundle check needs a completed build. The repository check uses your local environment to look for known private values in source and textual Git history; it is not an exhaustive secret detector. The server smoke check defaults to port 3100; set `PORTFOLIO_TEST_ORIGIN` for another origin. It invokes the real cleanup endpoint with your configured secret, so choose an appropriate test environment.

## Deploying

Complete the remaining checks in [RELEASE_READINESS.md](../docs/reviews/RELEASE_READINESS.md). Resolve applicable dependency advisories, verify real PDF/contact flows, and rehearse backup/restore before declaring a production release.

Set the runtime environment separately from local operator tools. Keep database-admin credentials, migration credentials, and role passwords off the web app; it uses restricted `DATABASE_POOL_URL`. Review `vercel.json` for daily cleanup; other hosts need an equivalent authenticated scheduler.

No script deploys the site or changes your domain automatically. See [BACKEND_SETUP.md](../docs/setup/BACKEND_SETUP.md) for detailed operations.

## License

Code and technical documentation use the [MIT License](../LICENSE). Reuse and adapt them, including your own theme, while keeping the license notice.

**Personal content is excluded:** the owner's photos, CV, certificates, biography, and personal portfolio material are not licensed for reuse. Third-party assets and trademarks keep their own rights and licenses. Use your own content.
