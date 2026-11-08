# Mohammad Ardi Portfolio

Personal portfolio built with Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui. The public site preserves the original dark theme, monospace headings, purple glow, projects, skills, and certificates.

## Local development

Use Node.js 22 LTS and pnpm 10.34.5.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

```sh
pnpm lint
pnpm build
pnpm typecheck
pnpm start
```

Run the build and separate type check sequentially: Next.js regenerates `.next/types` during builds. The first build needs access to Google Fonts; Next.js then serves the downloaded fonts locally.

## Structure and current scope

- `app/(public)` contains the public server-rendered page and layout.
- `app/layout.tsx` configures fonts, metadata, and the shared client boundary.
- `src/components` contains the portfolio sections and retained shadcn primitives.
- `src/index.css` contains the existing theme, responsive social rail gutter, brand-colored skill glows, and reduced-motion rules.
- `docs/implementation-plan.md` records the approved migration design.
- `docs/implementation-status.md` records completed work and verification.

Phase 1 migrates the public site only. Portfolio content is currently static; the Supabase database, owner dashboard, fresh-login MFA, managed uploads, PDF preview/delivery, and server-side contact action belong to later phases. The existing Google Drive CV link and EmailJS/reCAPTCHA integration remain in use. Live contact delivery requires the provider to allow the deployed domain; do not treat a local preview as proof of email delivery.

The production canonical URL is [mohammadardi.online](https://mohammadardi.online). No deployment, database credentials, or environment variables are required to build Phase 1. Do not commit `.env` files, generated build output, or local screenshots.

## Suggested GitHub repository

`mohammadardi-portfolio`
