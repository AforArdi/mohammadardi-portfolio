# Mohammad Ardi Portfolio

Personal portfolio and owner CMS built with Next.js App Router, React, TypeScript, Tailwind CSS, Motion, shadcn/ui, Supabase, and Drizzle. The public site preserves the original dark theme, monospace headings, and purple glow.

## Local development

Use Node.js 22 LTS and pnpm 10.34.5.

Configure the ignored `.env.local` file and initialize the backend using [BACKEND_SETUP.md](./BACKEND_SETUP.md) before the first run. The existing owner's local environment and initial database have already been set up.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

```sh
pnpm lint
pnpm test
pnpm build
pnpm typecheck
pnpm start
```

Run the build and separate type check sequentially: Next.js regenerates `.next/types` during builds. The first build needs access to Google Fonts; Next.js then serves the downloaded fonts locally.

## Structure and current scope

- `app/(public)` contains the public server-rendered page and layout.
- `app/layout.tsx` configures fonts, metadata, and the shared client boundary.
- `app/(auth)` contains password login and authenticator enrollment/challenge.
- `app/(admin)` contains the protected owner dashboard.
- `app/api` contains guarded CRUD, file upload, private media delivery, CV, and cleanup endpoints.
- `src/components` contains public sections, dashboard editors, and shadcn primitives.
- `src/db` contains the Drizzle schema and generated migrations.
- `src/lib/auth` contains fresh-login proof and fixed 24-hour authorization.
- `src/lib/content` contains validation, public queries, icon registry, and mutations.
- `src/index.css` contains the existing theme, responsive social rail gutter, brand-colored skill glows, and reduced-motion rules.
- `docs/implementation-plan.md` records the approved migration design.
- `docs/implementation-status.md` records completed work and verification.

The homepage now reads published content from Supabase Postgres through Drizzle. The owner dashboard edits profile text, portrait, CV, skills with library/custom icons and glow colors, projects, achievements, social links, visibility, and order. Every fresh sign-in requires TOTP; authorization expires after 24 hours without sliding refresh. Media stays private in Supabase Storage and is delivered through publication-checked routes. Upload a real PDF in Profile & CV to enable the public preview/download dialog.

The existing EmailJS/reCAPTCHA contact integration remains; the planned server-side contact replacement and live delivery verification are outstanding. Weekly favorite videos remain deferred. See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for migrations, storage cleanup, recovery, verification, and release limits.

The production canonical URL is [mohammadardi.online](https://mohammadardi.online). No deployment or DNS cutover is performed automatically. Do not commit `.env` files, generated build output, or local screenshots.

## Suggested GitHub repository

`mohammadardi-portfolio`
