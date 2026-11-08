# Implementation Status

* **Author:** Antigravity (Senior Next.js Engineer)
* **Last Updated:** 2026-11-09
* **Current Checkpoint:** Phase 1 implemented and verified locally; database and dashboard pending
* **Active Branch:** `migration/nextjs-app-router`
* **Repository Path:** `C:\projects\mohammadardi-portfolio`

---

## 1. Environment & Baseline Snapshot

| Parameter | Value / State | Verification Command |
| :--- | :--- | :--- |
| **Node.js Runtime** | `v22.23.1` (Node 22 LTS) | `node -v` |
| **Package Manager** | `pnpm 10.34.5` | `pnpm -v` |
| **Git Repository** | Initialized in `C:\projects\mohammadardi-portfolio` | `git status` |
| **Migration Branch** | `migration/nextjs-app-router` | `git branch --show-current` |
| **Baseline Snapshot Commit** | `ec650df` | `git log -1 --oneline` |
| **Exclusions Verified** | `node_modules`, `dist`, `dist-ssr`, `.agents`, `ui-screenshots` ignored via `.gitignore`; zero secrets, credentials, or `.env` files present. | `git status --ignored` |

---

## 2. Plan Specification Revisions (Addressing V1–V6 & C01–C14)

All specification corrections in [`docs/implementation-plan.md`](file:///c:/projects/mohammadardi-portfolio/docs/implementation-plan.md) are strictly design and specification updates; **no runtime code has been upgraded or installed**:

* **V1 (Types & Dependencies):** Replaced unreleased `@types/react@19.3.1` with verified published `@types/react@19.3.0` and `@types/react-dom@19.3.0`. Retained patched runtime pins `next@15.5.29`, `react@19.3.1`, and `react-dom@19.3.1`.
* **V2 (Supabase `getClaims()`):** Pinned `@supabase/supabase-js@2.119.0` (which bundles `@supabase/auth-js@2.119.0` containing the published `getClaims()` method) and `@supabase/ssr@0.12.7`.
* **V3 (Nonce Schema & Retry Flow):** Added `user_id` to `portfolio.fresh_login_nonces`. Separated wrong-code retries (up to 3 attempts) from atomic single-use nonce consumption. Transaction executes `UPDATE ... WHERE used_at IS NULL` and `INSERT INTO admin_sessions` only upon valid TOTP.
* **V4 (Bigint Byte Accounting):** Changed `bytesServed` from 32-bit `integer` to `bigint` (supporting 5 GB/month quota without overflow). Implemented atomic reservation/check SQL query.
* **V5 (Hobby Cron Cadence):** Reconciled Vercel Hobby limits: daily cron (`0 3 * * *`) for deep sweeps + opportunistic queue drain on dashboard mutations + optional free GitHub Actions cron (every 15 min). Added row-locking (`SKIP LOCKED`).
* **V6 (Concrete Omissions):** Added reproducible DB role creation/bootstrap script; defined media routes (`/api/media/[type]/[id]`); fixed recovery script exit/cleanup; made seed script non-destructive (`ON CONFLICT (id) DO NOTHING`); added reverse object restoration commands (`rclone sync ./backups/... supabase-s3:...`).

---

## 3. Phase 0 Lint & Build Verification

### 3.1 Pre-Fix Lint Run
* **Command:** `pnpm run lint` (`eslint .`)
* **Result:** `✖ 11 problems (3 errors, 8 warnings)`, exit code 1.
* **Errors Identified:**
  1. `src/components/ui/command.tsx:24:11` — `@typescript-eslint/no-empty-object-type`
  2. `src/components/ui/textarea.tsx:5:18` — `@typescript-eslint/no-empty-object-type`
  3. `tailwind.config.ts:95:13` — `@typescript-eslint/no-require-imports`

### 3.2 Surgical Fixes Applied (Exact 3 Files)
* [command.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/ui/command.tsx#L24): Replaced empty interface with `type CommandDialogProps = DialogProps;`.
* [textarea.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/ui/textarea.tsx#L5): Replaced empty interface with `export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;`.
* [tailwind.config.ts](file:///c:/projects/mohammadardi-portfolio/tailwind.config.ts#L1-L96): Added ESM import `import tailwindcssAnimate from "tailwindcss-animate";` and updated plugins array to `plugins: [tailwindcssAnimate]`.

### 3.3 Post-Fix Lint Run
* **Command:** `node node_modules/eslint/bin/eslint.js .`
* **Result:** `✖ 8 problems (0 errors, 8 warnings)`, exit code 0.
* **Status:** All 3 errors completely eliminated. The remaining 8 warnings are `react-refresh/only-export-components` across component UI files (which will be naturally replaced during the Phase 1 Next.js App Router migration).

### 3.4 Production Build Run
* **Command:** `pnpm run build` (`vite build`)
* **Result:** Exit code 0, built in 1m 50s.
* **Generated Chunks:**
  * `dist/index.html`: 1.75 kB (gzip: 0.74 kB)
  * `dist/assets/index-CnbCTy0m.css`: 66.88 kB (gzip: 11.55 kB)
  * `dist/assets/index-C7TOuu51.js`: 663.68 kB (gzip: 221.87 kB)
  * `dist/assets/heroride-DzETapNF.png`: 454.83 kB
  * `dist/assets/new-hero-avatar-B-nGLhry.png`: 1,980.60 kB

---

## 4. Phase 0 Git Commits

1. **Baseline Commit:** `ec650df` — `chore(baseline): establish pre-migration source baseline on migration branch`
2. **Phase 0 Fix Commit:** `cca79ec` — `fix(phase-0): resolve 3 baseline ESLint errors and initialize implementation status`

---

## 5. Remaining Owner Decisions (Pending Confirmation)

1. **Weekly Favorite YouTube Section:** Status: **Deferred**. Excluded from initial migrations and dashboard until explicitly requested.
2. **2FA Account Recovery Policy:** Status: **Recommended Baseline**. Primary + secondary TOTP authenticators at setup; emergency factor deletion handled via offline script calling `auth.admin.mfa.deleteFactor`.
3. **Production Hosting Target & Licensing:** Status: **Provisional Baseline**. Vercel Hobby + Supabase Free Tier ($0/month) for personal development; commercial licensing terms (Vercel Pro $20/mo or Railway $5/mo) documented for pre-deployment decision.

---

## 6. Phase 1: Public Next.js Migration

**Implemented by Codex on 2026-11-09**, following the owner's request to start building. Phase 0's clean branch and three recorded commits were verified before editing. The baseline-to-checkpoint diff contains the three lint fixes and status documentation.

### Implementation

- Replaced the Vite entry points and React Router/Helmet shell with `app/layout.tsx`, `app/(public)/layout.tsx`, `app/(public)/page.tsx`, and a real App Router 404 page.
- Installed exact registry-verified `next@15.5.29`, `react@19.3.1`, `react-dom@19.3.1`, and React type packages `19.3.0`. Verified the Next.js advisory at <https://nextjs.org/blog/august-2026-security-release>; its patched 15.5 release is 15.5.24. Dependency existence and peer ranges were checked directly against the npm registry before installation.
- Standardized on pnpm 10.34.5 and its lockfile; removed the npm and Bun lockfiles, Vite configuration, Lovable tagger, and unused old application entry files. The empty legacy `src/pages` directory was also removed because Next.js interpreted it as a Pages Router directory during route-type generation.
- Removed GSAP, Lenis, the separate `motion` dependency, React Router, Helmet, and the unused global query provider. Animation uses Framer Motion in small client boundaries and CSS for brand glows. Server-rendered content remains visible before hydration and with JavaScript disabled.
- Kept the dark palette, JetBrains Mono headings, Inter text, portrait, real project/certificate images, content, and working external link targets. Corrected the robotics certificate type to **Certificate of Participation**, matching the supplied certificate image.
- Moved the floating social rail to the `xl` breakpoint and reserved an 80px content gutter. Shared sidebar/footer social rendering now comes from one module.
- Replaced custom intercepted scrolling with native anchor navigation, fixed-header offsets, and a keyboard-accessible shadcn Sheet mobile menu. Added a skip link, visible focus indicators, improved muted-text contrast, and reduced-motion styles.
- Used `next/image` for portrait, project images, and certificates, with bounded remote image paths and responsive sizes. Certificates use `object-contain`. Fonts are fetched at build time by `next/font/google` and served locally afterward.
- Set canonical/Open Graph metadata to `https://mohammadardi.online`, removed the incorrect `ardi.dev` canonical, and added a branded icon, generated Open Graph image, sitemap, and robots metadata routes.
- Adapted retained dialog, sheet, command, tabs, label, and Sonner components with explicit client boundaries. Updated next-themes to 0.4.6 and Vaul to 1.1.2 after checking their React 19 peer compatibility. Unused remaining shadcn source files are retained for the dashboard phase and do not enter the public page bundle.
- Added strict TypeScript checks, matching Next.js ESLint rules, production start scripts, and local development instructions in `README.md`.

**Directory choice:** App Router files live in the planned root `app/` directory. Existing reusable components remain under `src/components` to preserve established `@/` imports; their responsibilities match the plan's `components/public` mapping.

### Verification

| Check | Result |
| :--- | :--- |
| Production build | `pnpm build` passed; homepage pre-rendered as static content. First-load JavaScript reported by Next.js: **153 kB**. This is a build metric, not a Lighthouse score. |
| Lint | `pnpm lint` passed without warnings or errors. |
| Strict TypeScript | `pnpm typecheck` passed. Run separately after the build; building concurrently replaces generated `.next/types` files. |
| Production HTTP checks | Home 200, unknown route 404, robots 200, sitemap 200, sharing PNG 200, branded SVG 200; expected content types verified. Canonical and actual project content present in the HTML response. |
| Responsive browser checks | Passed at **375, 768, 1024, 1280, 1440px**. No horizontal overflow; all six content images loaded at every width; both fonts resolved. |
| Mobile navigation | Menu opens; Escape closes it; selecting Projects closes the menu and lands below the fixed header (section top 112px in the 375px viewport). |
| Social rail | Hidden below 1280px; visible at 1280/1440px with hero content starting at x=104px, clear of the rail. |
| Reduced motion | Native scroll becomes `auto`; continuous portrait animation is effectively disabled. |
| Without JavaScript | Hero and all three project cards remain present and visible in server-rendered HTML. |
| Browser errors | No uncaught runtime exceptions in the verification run. |
| Visual inspection | Full-page screenshots of all five viewports reviewed against the owner's supplied appearance; existing visual identity retained with intentional layout/accessibility improvements. This is a manual comparison, not a pixel-diff assertion. |

Local verification artifacts are ignored under `ui-screenshots`: `phase1-browser-report.json`, `next-375.png`, `next-768.png`, `next-1024.png`, `next-1280.png`, and `next-1440.png`. They are available in this checkout and are not committed application assets.

### Boundaries and Remaining Work

- **Contact:** The existing EmailJS and reCAPTCHA public integration is retained, with accessible success/error feedback and an email fallback. Google verification failed to load in the local browser environment, so live CAPTCHA verification and message delivery were **not** verified. No message was sent during QA. The planned server-side contact action and Turnstile replacement remain Phase 5 work.
- **CV:** The current real Google Drive CV target remains. Supabase PDF upload, dialog preview, streaming, and rate limits remain Phase 5 work.
- **Backend:** No database was provisioned or modified; no authentication, MFA, storage buckets, dashboard, or CRUD APIs were added in Phase 1.
- **Release:** No GitHub repository was created, no commit/push was performed for these changes, and no deployment or DNS change occurred. Suggested repository name: `mohammadardi-portfolio`.
- **Next slice:** Phase 2 defines the dedicated Supabase Postgres schema, limited runtime/migration roles, Drizzle migrations, and a non-destructive seed of the existing portfolio content. MFA and the fixed 24-hour owner session follow in Phase 3; dashboard/media management follow in Phase 4.
