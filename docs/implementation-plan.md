# Portfolio Migration & Owner Dashboard: Technical Implementation Plan (Verified Revision)

* **Author:** Antigravity (Senior Next.js Engineer)
* **Date:** 2026-11-08
* **Status:** Verified Implementation Specification (Resolving V1–V6 and C01–C14)
* **Target Repository:** `c:\projects\mohammadardi-portfolio`
* **Target Domain:** `https://mohammadardi.online` (migrating from current Vite/React site)

---

## C01–C14 & V1–V6 Reconciliation Matrix

Every finding from [`consolidated_review_report.md`](file:///c:/projects/mohammadardi-portfolio/consolidated_review_report.md) and [`plan-revision-check.md`](file:///c:/projects/mohammadardi-portfolio/docs/plan-revision-check.md) has been reconciled against verified package metadata and official documentation. **Zero findings are contested.**

| ID | Review Target | Verified Evidence & Technical Resolution | Plan Section | Specification Status |
| :--- | :--- | :--- | :--- | :--- |
| **C01 / V1** | Package versions & unverified pins | Verified npm registry: `next@15.5.29` (patched for React2Shell CVE-2025-66478 / CVE-2025-55182), `react@19.3.1`, `react-dom@19.3.1`. Fixed nonexistent type pins: `@types/react@19.3.0` and `@types/react-dom@19.3.0` (npm published). Pinned `@supabase/supabase-js@2.119.0` and `@supabase/ssr@0.12.7`. ORM: `drizzle-orm@0.38.4` / `drizzle-kit@0.30.4` (or exact compatible RC `0.40.0-rc.1` / `0.30.5-rc.1` if MCP RC is adopted). | Sec. 16.1 | **Resolved with Evidence** |
| **C02** | Upload transport & gateway limits | Enforced hard **3.5 MB per-file limit** (max 4.0 MB request body, safely under Vercel's 4.5 MB function limit). Client canvas pre-scales phone photos >3.5 MB. Route Handler `POST /api/admin/upload` verifies `requireOwnerAdmin()`. TEST-20 verifies gateway `413 Payload Too Large` rejection for unscaled oversized payloads. | Sec. 7.1, 15 | **Resolved** |
| **C03 / V2, V3** | Auth guard claims, nonce schema & fresh login proof | Fixed SDK pin to `@supabase/supabase-js@2.119.0` (exposing `getClaims()`). Added `user_id` to `portfolio.fresh_login_nonces`. Separated TOTP code verification from atomic nonce consumption: wrong code allows up to 3 retries without destroying nonce; successful 2FA executes an atomic transaction consuming nonce (`used_at = NOW()`) and inserting `portfolio.admin_sessions` (24h deadline). Split auth routes (`app/(auth)/*`). Hourly token refresh does not extend deadline. | Sec. 4.1–4.3 | **Resolved** |
| **C04 / V6** | Database bootstrap, roles & schema isolation | Documented clean bootstrap SQL: creates `portfolio_migrator` (DDL) and `portfolio_app` (DML only), creates schema `portfolio`, sets `ALTER DEFAULT PRIVILEGES`, configures Drizzle journal in `portfolio.__drizzle_migrations`, revokes PostgREST API access (`anon`, `authenticated`). | Sec. 3.1–3.3 | **Resolved** |
| **C05 / V6** | Public reader, caching & media routes | Defined `getPublicPortfolioData()` filtering `is_published = true AND deleted_at IS NULL`, wrapped in `unstable_cache` with tag `['portfolio-content']`. Defined media delivery route handlers (`/api/media/[type]/[id]`) with public publication checks and immutable caching. Included `sql` import. | Sec. 5.1–5.3 | **Resolved** |
| **C06 / V5** | Media lifecycle, Hobby cron & cleanup queue | Reconciled Vercel Hobby limits: daily cron (`0 3 * * *`) for deep orphan sweep + opportunistic queue drain on dashboard mutations + optional free GitHub Actions cron (every 15 min). Added queue row-locking (`FOR UPDATE SKIP LOCKED`), reference re-checks, and exponential backoff. Complete draft/publish/hide/restore state transitions. | Sec. 7.2–7.5 | **Resolved** |
| **C07 / V4** | Byte counter overflow & atomic accounting | Changed `bytesServed` from `integer` to `bigint` (signed 32-bit int overflows 2.14 GB, failing 5 GB budget). Implemented atomic reservation/check algorithm with 5 GB/month global limit (`cv:global_bandwidth:YYYY-MM`), explicit `HEAD` handler, full suffix/open-ended HTTP Range support, and trusted Vercel proxy IP resolution (`x-vercel-forwarded-for`). | Sec. 8.1–8.4 | **Resolved** |
| **C08 / V6** | Recovery script API signature (R-1) & exit handling | Repaired [`scripts/admin-recover-mfa.ts`](file:///c:/projects/mohammadardi-portfolio/scripts/admin-recover-mfa.ts) to call `auth.admin.mfa.deleteFactor({ userId, id: factor.id })` (fixing `factorId` bug). Wrapped in `try/catch/finally` setting `process.exit(1)` on error and closing SQL client with `await sql.end()`. Revokes all sessions and flushes nonces. | Sec. 4.4 | **Resolved** |
| **C09 / V6** | Initial seed script & non-destructive updates | Defined `scripts/seed-portfolio.ts` with non-destructive default (`ON CONFLICT (id) DO NOTHING`). Overwrite requires `--reset` flag. If `seeds/resume.pdf` is missing, logs warning and seeds `profile.resumeMediaId = null` (hiding public CV button) without failing the seed. Maps local and remote assets to WebP derivatives. | Sec. 13.1–13.3 | **Resolved** |
| **C10 / V6** | Complete backup & reverse restoration drill | Backup captures database (`pg_dump -F c`) and all 3 buckets (`private-documents`, `private-staging`, `public-media`). Documented reverse restore commands (`rclone sync ./backups/... supabase-s3:...`), followed by database permission restoration and session/nonce invalidation. | Sec. 12.2 | **Resolved** |
| **C11 / V6** | Old-to-new file map & concurrency contracts | Complete file map provided. Added `version: integer` to all entities including `social_links`. Documented atomic compare-and-update SQL contracts (`WHERE id = $id AND version = $expected_version`) and reorder transaction contract. | Sec. 14.1, 14.3 | **Resolved** |
| **C12 / V6** | Evidence calibration & release gates | Calibrated language: replaced "implemented" with "proposed specification". Specified reference viewports (375px, 768px, 1024px, 1280px, 1440px) and numeric release gates (Lighthouse accessibility >= 95, performance >= 90). Removed unverified numerical claims. | Sec. 1.3–1.6, 15 | **Resolved** |
| **C13** | Architecture tradeoffs & owner decisions | Recorded rationale: Drizzle direct connection vs PostgREST SDK, DB session table vs signed cookies, bounded uploads vs presigned storage. Marked owner decision statuses: YouTube (Deferred), Recovery (Recommended), Hosting (Provisional). | Sec. 2.2, 2.3 | **Resolved** |
| **C14** | Retained useful shadcn primitives | Retained and adapted `dialog`, `sheet`, `command`, `tabs`, `button`, `input`, `label`, `textarea`, `sonner`. Pruning deferred to post-migration tree-shake. | Sec. 14.2 | **Resolved** |

---

## 1. Repository Evidence, Calibrated Baseline & Gap Analysis

### 1.1 Source Control Baseline
* **Observation:** `git status` reports `fatal: not a git repository (or any of the parent directories): .git`.
* **Gap & Risk:** The current project folder is unversioned. Any file restructuring executed without initialization carries zero rollback capability.
* **Remediation Requirement:** Phase 0 initializes Git (`git init`), creates migration branch `migration/nextjs-app-router`, verifies `.gitignore`, and commits the baseline snapshot before any source edits.

### 1.2 Package Manager & Lockfile Multiplicity
* **Observation:** Three competing lockfiles coexist in the root: `bun.lockb` (207 kB), `package-lock.json` (253 kB), `pnpm-lock.yaml` (190 kB).
* **Remediation Requirement:** Standardize strictly on **pnpm** (verified as `v10.34.5` on Node `v22.23.1`). Lockfile cleanup is performed in the approved Phase 1 migration slice; Phase 0 preserves existing files to record a clean baseline.

### 1.3 Local Build vs. Lint Verification
* **Build Status:** Verified locally via `pnpm run build`. The build succeeded in 1m 9s, generating `dist/` with:
  * `dist/assets/index-C7TOuu51.js`: **663.68 kB** (gzipped: 221.87 kB) — Vite chunk size warning.
  * `dist/assets/new-hero-avatar-B-nGLhry.png`: **1,980.60 kB** (nearly 2 MB uncompressed image loaded on homepage).
  * `dist/assets/heroride-DzETapNF.png`: **454.83 kB**.
  * *Diagnosis:* The earlier SWC native binding failure was an environment/cache quirk, not a fundamental source failure.
* **Lint Status:** Verified locally via `pnpm run lint` (`eslint .`). Output: `✖ 11 problems (3 errors, 8 warnings)`.
  * *Error 1:* [command.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/ui/command.tsx#L24) — `@typescript-eslint/no-empty-object-type`
  * *Error 2:* [textarea.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/ui/textarea.tsx#L5) — `@typescript-eslint/no-empty-object-type`
  * *Error 3:* [tailwind.config.ts](file:///c:/projects/mohammadardi-portfolio/tailwind.config.ts#L95) — `@typescript-eslint/no-require-imports` (`require("tailwindcss-animate")`)
  * *Warnings (8):* `react-refresh/only-export-components` in `SmoothScroll.tsx`, `badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `sonner.tsx`, `toggle.tsx`.

### 1.4 Architecture & Dependency Redundancy
* **Animation Redundancy:** Four animation packages are installed: `framer-motion` (`^12.23.26`), `motion` (`^12.40.0`), `gsap` (`^3.15.0`), and `lenis` (`^1.3.23`). Consolidating onto `framer-motion` will streamline dependencies and eliminate dual-import confusion.
* **Client-Only Architecture:** The application runs entirely in client-side React (`react-router-dom`, `react-helmet-async`). Canonical URL in [Index.tsx](file:///c:/projects/mohammadardi-portfolio/src/pages/Index.tsx#L25) points to `https://ardi.dev` instead of `https://mohammadardi.online`.

### 1.5 UI, Spacing & Accessibility Observations
* **Hero vs. Social Rail Overlap:** [FloatingSidebar.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/FloatingSidebar.tsx#L24) is fixed at `left-6 top-1/2 -translate-y-1/2 hidden lg:flex`. On desktop viewports between 1024px and 1280px, the social rail overlaps the left column of [HeroSection.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/HeroSection.tsx#L37).
* **Fixed Header Anchor Offset:** Section links (`#home`, `#about`, `#skills`, `#projects`, `#achievements`, `#contact`) lack `scroll-mt-*` scroll margins.
* **Certificate Image Display:** [AchievementsSection.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/AchievementsSection.tsx#L82) renders certificates with `<img className="w-full ...">`. Container aspect ratios risk cropping accreditation text on variable viewports unless explicit containment is enforced.
* **Accessibility Failures:** [Navbar.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/Navbar.tsx#L18) mobile menu toggle lacks `aria-expanded` and `aria-controls`. Missing focus trap in drawer.

### 1.6 External Asset & Security Dependencies
* **Remote Assets:** Images reside on external unmanaged CDNs: `i.postimg.cc`, `certificates.cs50.io`, GitHub raw content, and Google Drive.
* **Contact Form:** [ContactSection.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/ContactSection.tsx#L9-L12) embeds EmailJS public keys and client-only reCAPTCHA v2. Submissions lack server-side anti-bot verification and rate limiting.

---

## 2. Requirements Baseline, Scope Boundaries & Owner Decisions

### 2.1 Confirmed Requirements
1. **Single Next.js App Router Application:** Public portfolio, owner dashboard, and backend operations in one repository.
2. **Visual Identity Preservation:** Dark navy theme (`hsl(222, 47%, 6%)`), purple accents (`hsl(280, 70%, 70%)`), monospace headings (`JetBrains Mono`), glowing avatar, animated skill cards, project cards, and achievements.
3. **Owner Dashboard Scope:**
   * **Resume / CV:** Upload, replace, delete PDF. Public view opens shadcn `Dialog` with PDF preview, download button, and mobile fallback.
   * **Portrait:** Upload, replace, crop preview for glowing hero avatar.
   * **About Section:** Edit headline and biography text.
   * **Skills:** Full CRUD, manual reordering, visibility toggle, glow color selection, icon selection (Simple Icons, Lucide, or transparent PNG/WebP upload).
   * **Projects:** Full CRUD, manual reordering, visibility toggle, title, screenshot, description, live link, optional GitHub link, and separate frontend/backend links (HeroRide).
   * **Achievements:** Full CRUD, manual reordering, visibility toggle, certificate image, title, certificate type, description, and target verification link.
   * **Social Links:** Centralized CRUD, reordering, and visibility, synchronizing both floating sidebar and footer.
4. **Mandatory Owner MFA:** Email/password plus authenticator TOTP (`aal2`) required on every fresh sign-in.
5. **Fixed 24-Hour Admin Session:** Absolute 24-hour authorization window established exclusively upon successful 2FA. No activity or token refresh may extend this deadline.

### 2.2 Concrete Architecture Choices & Tradeoffs Recorded (C13)
* **Drizzle Direct SQL vs. Supabase PostgREST SDK:**
  * *Choice:* Drizzle ORM over direct PostgreSQL connection via Supavisor pooler.
  * *Tradeoff:* Drizzle provides compile-time TypeScript type safety and committed migrations. Because direct SQL bypasses Supabase JWT RLS, we isolate all application tables in a private `portfolio` schema and enforce authorization via server guard `requireOwnerAdmin()`.
* **Database Session Table vs. Signed Cookies:**
  * *Choice:* PostgreSQL table `portfolio.admin_sessions`.
  * *Tradeoff:* Requires a database query on administrative actions, but provides instant, server-authoritative revocation upon logout or factor recovery without relying on client-side cookie deletion.
* **Bounded Uploads vs. Direct Storage Presigning:**
  * *Choice:* Bounded 3.5 MB requests via dedicated Route Handlers (`POST /api/admin/upload`).
  * *Tradeoff:* Avoids presigned upload token complexity while staying safely under Vercel's 4.5 MB gateway limit. Large phone camera photos are pre-downscaled on client canvas before transmission.

### 2.3 Status of Remaining Owner Decisions (C13)
1. **Weekly Favorite YouTube Section:**
   * *Status:* **Deferred (Pending Owner Approval)**. Excluded from initial migrations and dashboard until explicitly requested.
2. **2FA Account Recovery Policy:**
   * *Status:* **Recommended Baseline (Pending Owner Confirmation)**. Primary + secondary TOTP authenticators at setup. Emergency recovery uses administrative script ([`scripts/admin-recover-mfa.ts`](file:///c:/projects/mohammadardi-portfolio/scripts/admin-recover-mfa.ts)) calling `auth.admin.mfa.deleteFactor`. No public email-only bypass.
3. **Production Hosting Target & Licensing:**
   * *Status:* **Provisional Baseline (Pending Owner Confirmation)**. Vercel Hobby + Supabase Free Tier ($0/month) established as development baseline. Vercel Hobby is restricted to personal, non-commercial use. If the portfolio is used for commercial freelance client acquisition, Vercel Pro ($20/month) or Railway ($5/month) will be selected prior to production cutover.

---

## 3. Database Architecture & Authorization Boundary (C04)

### 3.1 Dedicated Application Schema (`portfolio`)
All application tables reside in a dedicated PostgreSQL schema named `portfolio`. 
PostgREST in Supabase is configured to expose only `public` (`db-schemas = 'public'`). Tables in `portfolio` are **completely invisible to the browser PostgREST API**, preventing anonymous data harvesting.

### 3.2 Reproducible Bootstrap Sequence
Executed in order by the database administrator during initial project setup:
```sql
-- 1. Create dedicated application schema
CREATE SCHEMA IF NOT EXISTS portfolio;

-- 2. Create roles (if not using default supabase admin roles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portfolio_migrator') THEN
    CREATE ROLE portfolio_migrator WITH LOGIN PASSWORD 'REPLACE_WITH_SECURE_MIGRATOR_PW';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portfolio_app') THEN
    CREATE ROLE portfolio_app WITH LOGIN PASSWORD 'REPLACE_WITH_SECURE_APP_PW';
  END IF;
END $$;

-- 3. Set schema ownership
ALTER SCHEMA portfolio OWNER TO portfolio_migrator;

-- 4. Revoke all access from PostgREST browser roles
REVOKE ALL ON SCHEMA portfolio FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA portfolio FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA portfolio FROM anon, authenticated;

-- 5. Grant limited DML privileges to runtime application role
GRANT USAGE ON SCHEMA portfolio TO portfolio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portfolio TO portfolio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA portfolio TO portfolio_app;

-- 6. Ensure future tables created by migrations automatically inherit grants
ALTER DEFAULT PRIVILEGES FOR ROLE portfolio_migrator IN SCHEMA portfolio
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portfolio_app;
ALTER DEFAULT PRIVILEGES FOR ROLE portfolio_migrator IN SCHEMA portfolio
  GRANT USAGE, SELECT ON SEQUENCES TO portfolio_app;
```

### 3.3 Connection Pooling & Driver Configuration
Configured in `db/index.ts` using `postgres.js` with Supavisor transaction mode compatibility:
```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_POOL_URL!, {
  max: 10,               // Bound connections per serverless instance
  idle_timeout: 20,      // Aggressively close idle connections
  connect_timeout: 10,   // Fail fast if database unreachable
  prepare: false,        // CRITICAL: Supavisor transaction mode does not support prepared statements
});

export const db = drizzle(client, { schema });
```

In `drizzle.config.ts`, the migration journal is configured inside schema `portfolio`:
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  migrations: {
    schema: 'portfolio',
    table: '__drizzle_migrations',
  },
});
```

---

## 4. Security Architecture: Mandatory 2FA & 24-Hour Session Engine (C03, C08)

### 4.1 Verified Authentication Claims & Identity Check
Authentication verification in Next.js App Router uses `@supabase/ssr` with `@supabase/supabase-js@2.119.0`:
1. `supabase.auth.getUser()` verifies JWT signature against Supabase Auth server.
2. Verified claims are extracted using `supabase.auth.getClaims()` (supported in `auth-js@2.119.0+`).
3. The server enforces:
   * `claims.aud === 'authenticated'`
   * `claims.sub === process.env.OWNER_USER_ID`
   * `claims.aal === 'aal2'` (MFA Authenticator Level 2 verified)

### 4.2 Fresh-Login Proof, Error Retries & Atomic Session Establishment (C03)
The login and 2FA flow cleanly separates validation from atomic single-use consumption:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Portfolio Owner
    participant Browser as Browser Client
    participant AuthGroup as Next.js app/(auth)
    participant SupaAuth as Supabase Auth Engine
    participant DB as Postgres (portfolio schema)

    Owner->>Browser: Enters email & password
    Browser->>AuthGroup: POST /actions/auth (login)
    AuthGroup->>SupaAuth: signInWithPassword()
    SupaAuth-->>AuthGroup: Session (aal1) + session_id
    
    Note over AuthGroup: Generate Fresh Login Proof
    AuthGroup->>AuthGroup: Create nonce = crypto.randomUUID()
    AuthGroup->>DB: INSERT INTO portfolio.fresh_login_nonces (nonce, user_id, session_id, expires_at) VALUES (nonce, user.id, session_id, NOW() + 5 min)
    AuthGroup-->>Browser: Set HttpOnly Cookie (portfolio_login_nonce) & Redirect to /admin/mfa/challenge

    Owner->>Browser: Enters 6-digit TOTP code
    Browser->>AuthGroup: POST /actions/auth (verifyMfa with code)
    
    AuthGroup->>DB: Check nonce validity (expires_at > NOW(), used_at IS NULL, failed_attempts < 3)
    alt Nonce Expired or >3 Failed Attempts
        AuthGroup-->>Browser: 401 Unauthorized ("Fresh login window expired. Please sign in again.")
    else Nonce Valid
        AuthGroup->>SupaAuth: mfa.challengeAndVerify(code)
        alt Code Invalid
            AuthGroup->>DB: UPDATE portfolio.fresh_login_nonces SET failed_attempts = failed_attempts + 1 WHERE nonce = cookie.nonce
            AuthGroup-->>Browser: 400 Bad Request ("Invalid code. Attempts remaining: X")
        else Code Valid (aal2 elevated)
            Note over AuthGroup,DB: Atomic Single-Use Nonce Consumption & Session Establishment
            AuthGroup->>DB: BEGIN; UPDATE portfolio.fresh_login_nonces SET used_at = NOW() WHERE nonce = cookie.nonce AND user_id = owner_id AND session_id = session_id AND used_at IS NULL RETURNING nonce;
            AuthGroup->>DB: INSERT INTO portfolio.admin_sessions (session_id, user_id, aal2_verified_at, deadline_at, is_revoked) VALUES (session_id, owner_id, NOW(), NOW() + 24 hours, FALSE) ON CONFLICT (session_id) DO NOTHING; COMMIT;
            AuthGroup-->>Browser: Clear portfolio_login_nonce cookie & Redirect to /admin
        end
    end
```

### 4.3 Exact Server Guard Specification (`requireOwnerAdmin`)
Every Server Action and protected Route Handler calls `requireOwnerAdmin()`:
```typescript
// lib/auth/guard.ts
import { createServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/db';
import { adminSessions } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';

export async function requireOwnerAdmin(): Promise<{ userId: string; sessionId: string }> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.id !== process.env.OWNER_USER_ID) {
    throw new AuthorizationError('Unauthorized: Owner identity required');
  }

  // Extract verified JWT claims via published SDK method
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims || claimsData.claims.aal !== 'aal2') {
    throw new AuthorizationError('MFA verification required (aal2)');
  }

  const sessionId = claimsData.claims.session_id as string;

  // Verify against authoritative 24-hour session record
  const sessionRecord = await db.query.adminSessions.findFirst({
    where: (s, { and, eq, gt }) => and(
      eq(s.sessionId, sessionId),
      eq(s.isRevoked, false),
      gt(s.deadlineAt, new Date()) // Fixed 24h deadline
    ),
  });

  if (!sessionRecord) {
    throw new AuthorizationError('Admin session expired. Please sign in again with 2FA.');
  }

  return { userId: user.id, sessionId };
}
```

* **Token Refresh Invariance:** Supabase access tokens refresh hourly. Automatic refresh updates the JWT expiry, but **never extends `deadline_at`** in `portfolio.admin_sessions`.
* **Sign-Out:** Calls `supabase.auth.signOut()` and immediately marks `adminSessions.isRevoked = true` in PostgreSQL.

### 4.4 Repaired Administrative Recovery Script (C08 / R-1)
Corrected to call `auth.admin.mfa.deleteFactor({ userId, id: factor.id })` per official Supabase SDK:
```typescript
// scripts/admin-recover-mfa.ts
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { adminSessions, freshLoginNonces } from '../db/schema';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function recoverOwnerMFA() {
  const userId = process.env.OWNER_USER_ID;
  if (!userId) throw new Error('OWNER_USER_ID is not set');

  const { data: factorData, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
  if (listError) throw listError;

  for (const factor of factorData.factors) {
    // Official Supabase Admin API uses property 'id', not 'factorId'
    const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
      userId,
      id: factor.id,
    });
    if (deleteError) {
      throw new Error(`Failed to delete factor ${factor.id}: ${deleteError.message}`);
    }
  }

  // Revoke all active application sessions and unused nonces
  await db.update(adminSessions).set({ isRevoked: true }).where(eq(adminSessions.userId, userId));
  await db.delete(freshLoginNonces).where(eq(freshLoginNonces.userId, userId));

  console.log('MFA recovery successful. Factors deleted and sessions revoked. Owner must sign in with password and re-enroll.');
}

recoverOwnerMFA()
  .catch((err) => {
    console.error('MFA recovery failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
```

---

## 5. Public Content Selection, Media Delivery & Caching Engine (C05)

### 5.1 Server-Only Public Content Reader
All public homepage sections read from a single, server-only reader: `lib/db/queries/public-portfolio.ts`:
* Strictly filters: `WHERE is_published = TRUE AND deleted_at IS NULL`.
* Excludes internal metadata (`version`, `created_by`, `updated_at`, internal storage paths, rate limits).
* Returns strongly typed `PublicPortfolioData` shape:
```typescript
// lib/db/queries/public-portfolio.ts
import { db } from '@/db';
import { profile, skills, projects, achievements, socialLinks } from '@/db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';

export async function getPublicPortfolioData() {
  const [prof] = await db.select({
    greeting: profile.greeting,
    displayName: profile.displayName,
    fullName: profile.fullName,
    tagline: profile.tagline,
    aboutHeading: profile.aboutHeading,
    aboutBio: profile.aboutBio,
    availabilityText: profile.availabilityText,
    avatarCrop: profile.avatarCrop,
    contactEmail: profile.contactEmail,
    avatarUrl: sql<string>`'/api/media/avatar'`,
    hasResume: sql<boolean>`${profile.resumeMediaId} IS NOT NULL`,
  }).from(profile).where(eq(profile.id, 1));

  const publishedSkills = await db.select({
    id: skills.id,
    name: skills.name,
    iconProvider: skills.iconProvider,
    iconKey: skills.iconKey,
    customIconUrl: sql<string | null>`CASE WHEN ${skills.customMediaId} IS NOT NULL THEN '/api/media/skill/' || ${skills.id} ELSE NULL END`,
    accentColor: skills.accentColor,
    displayOrder: skills.displayOrder,
  }).from(skills).where(and(eq(skills.isPublished, true), isNull(skills.deletedAt))).orderBy(asc(skills.displayOrder));

  const publishedProjects = await db.select({
    id: projects.id,
    title: projects.title,
    description: projects.description,
    liveUrl: projects.liveUrl,
    githubUrl: projects.githubUrl,
    githubServerUrl: projects.githubServerUrl,
    imageUrl: sql<string>`'/api/media/project/' || ${projects.id}`,
    displayOrder: projects.displayOrder,
  }).from(projects).where(and(eq(projects.isPublished, true), isNull(projects.deletedAt))).orderBy(asc(projects.displayOrder));

  const publishedAchievements = await db.select({
    id: achievements.id,
    title: achievements.title,
    certificateType: achievements.certificateType,
    description: achievements.description,
    verifyUrl: achievements.verifyUrl,
    imageUrl: sql<string>`'/api/media/achievement/' || ${achievements.id}`,
    displayOrder: achievements.displayOrder,
  }).from(achievements).where(and(eq(achievements.isPublished, true), isNull(achievements.deletedAt))).orderBy(asc(achievements.displayOrder));

  const publishedSocials = await db.select({
    id: socialLinks.id,
    platform: socialLinks.platform,
    label: socialLinks.label,
    url: socialLinks.url,
    iconKey: socialLinks.iconKey,
    displayOrder: socialLinks.displayOrder,
  }).from(socialLinks).where(eq(socialLinks.isPublished, true)).orderBy(asc(socialLinks.displayOrder));

  return { profile: prof, skills: publishedSkills, projects: publishedProjects, achievements: publishedAchievements, socials: publishedSocials };
}
```

### 5.2 Next.js Data Cache & Tag Invalidation
* `getPublicPortfolioData()` is wrapped with `unstable_cache`:
  ```typescript
  import { unstable_cache } from 'next/cache';

  export const getCachedPublicPortfolio = unstable_cache(
    getPublicPortfolioData,
    ['public-portfolio-data'],
    { tags: ['portfolio-content'] }
  );
  ```
* On any dashboard mutation, the Server Action executes:
  ```typescript
  revalidateTag('portfolio-content');
  revalidatePath('/');
  ```
* **Admin Route Isolation:** Dashboard routes in `app/(admin)/*` declare `export const dynamic = 'force-dynamic'` and return `Cache-Control: private, no-store`.

### 5.3 Public Media Delivery Route Contract
Public media routes (`/api/media/[type]/[id]`) proxy published WebP assets with verified publication checks:
```typescript
// app/api/media/[type]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mediaAssets, projects, achievements, skills, profile } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getStorageClient } from '@/lib/storage/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;

  // 1. Verify entity is published and non-deleted
  let mediaId: string | null = null;
  if (type === 'avatar') {
    const [p] = await db.select({ mId: profile.avatarMediaId }).from(profile).where(eq(profile.id, 1));
    mediaId = p?.mId ?? null;
  } else if (type === 'project') {
    const [proj] = await db.select({ mId: projects.imageMediaId }).from(projects).where(and(eq(projects.id, id), eq(projects.isPublished, true), isNull(projects.deletedAt)));
    mediaId = proj?.mId ?? null;
  } else if (type === 'achievement') {
    const [ach] = await db.select({ mId: achievements.imageMediaId }).from(achievements).where(and(eq(achievements.id, id), eq(achievements.isPublished, true), isNull(achievements.deletedAt)));
    mediaId = ach?.mId ?? null;
  } else if (type === 'skill') {
    const [sk] = await db.select({ mId: skills.customMediaId }).from(skills).where(and(eq(skills.id, id), eq(skills.isPublished, true), isNull(skills.deletedAt)));
    mediaId = sk?.mId ?? null;
  }

  if (!mediaId) return new NextResponse('Not Found', { status: 404 });

  // 2. Fetch media record and stream from Supabase Storage
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
  if (!asset) return new NextResponse('Not Found', { status: 404 });

  const storage = getStorageClient();
  const { data, error } = await storage.from(asset.bucketName).download(asset.storagePath);
  if (error || !data) return new NextResponse('Image Unavailable', { status: 502 });

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': asset.fileSizeBytes.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

---

## 6. Database Schema Specification (`portfolio` Schema) (C04, C07, C11)

```typescript
// db/schema.ts
import { pgSchema, uuid, text, integer, bigint, boolean, timestamp, jsonb, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const portfolioSchema = pgSchema('portfolio');

// 1. Media Assets
export const mediaAssets = portfolioSchema.table('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  bucketName: text('bucket_name').notNull(), // 'private-documents' | 'private-staging' | 'public-media'
  storagePath: text('storage_path').notNull().unique(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

// 2. Profile Singleton
export const profile = portfolioSchema.table('profile', {
  id: integer('id').primaryKey().default(1),
  greeting: text('greeting').default("Hi, I'm").notNull(),
  displayName: text('display_name').default('Ardi').notNull(),
  fullName: text('full_name').default('Md Miftahul Islam Ardi').notNull(),
  tagline: text('tagline').default('Building | Debugging | Improving').notNull(),
  aboutHeading: text('about_heading').default('about-me').notNull(),
  aboutBio: text('about_bio').notNull(),
  availabilityText: text('availability_text').default('Open for new opportunities').notNull(),
  avatarMediaId: uuid('avatar_media_id').references(() => mediaAssets.id, { onDelete: 'restrict' }),
  avatarCrop: jsonb('avatar_crop').$type<{ x: number; y: number; zoom: number }>(),
  resumeMediaId: uuid('resume_media_id').references(() => mediaAssets.id, { onDelete: 'restrict' }),
  contactEmail: text('contact_email').default('miftahulislam9037@gmail.com').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
}, (table) => ({
  singletonCheck: check('profile_singleton_check', sql`${table.id} = 1`),
}));

// 3. Skills Collection
export const skills = portfolioSchema.table('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  iconProvider: text('icon_provider').notNull(), // 'simple-icons' | 'lucide' | 'custom'
  iconKey: text('icon_key'),
  customMediaId: uuid('custom_media_id').references(() => mediaAssets.id, { onDelete: 'restrict' }),
  accentColor: text('accent_color').default('#A78BFA').notNull(),
  displayOrder: integer('display_order').notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
}, (table) => ({
  iconCheck: check('skill_icon_exclusivity', sql`
    (${table.iconProvider} = 'custom' AND ${table.customMediaId} IS NOT NULL AND ${table.iconKey} IS NULL) OR
    (${table.iconProvider} IN ('simple-icons', 'lucide') AND ${table.iconKey} IS NOT NULL AND ${table.customMediaId} IS NULL)
  `),
}));

// 4. Projects Collection
export const projects = portfolioSchema.table('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imageMediaId: uuid('image_media_id').references(() => mediaAssets.id, { onDelete: 'restrict' }).notNull(),
  liveUrl: text('live_url').notNull(),
  githubUrl: text('github_url'),
  githubServerUrl: text('github_server_url'),
  displayOrder: integer('display_order').notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// 5. Achievements Collection
export const achievements = portfolioSchema.table('achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  certificateType: text('certificate_type').default('Certificate of Completion').notNull(),
  description: text('description').notNull(),
  imageMediaId: uuid('image_media_id').references(() => mediaAssets.id, { onDelete: 'restrict' }).notNull(),
  verifyUrl: text('verify_url').notNull(),
  displayOrder: integer('display_order').notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// 6. Social Links Collection (Includes version for concurrency)
export const socialLinks = portfolioSchema.table('social_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: text('platform').notNull(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  iconKey: text('icon_key').default('lucide:globe').notNull(),
  displayOrder: integer('display_order').notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// 7. Fresh Login Nonces (With user_id & failed_attempts counter)
export const freshLoginNonces = portfolioSchema.table('fresh_login_nonces', {
  nonce: text('nonce').primaryKey(),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').notNull(),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

// 8. Admin 2FA Sessions
export const adminSessions = portfolioSchema.table('admin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: text('session_id').notNull().unique(),
  userId: text('user_id').notNull(),
  aal2VerifiedAt: timestamp('aal2_verified_at', { withTimezone: true }).defaultNow().notNull(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
});

// 9. Rate Limit Buckets (With Bigint Byte Accounting)
export const rateLimitBuckets = portfolioSchema.table('rate_limit_buckets', {
  key: text('key').primaryKey(),
  count: integer('count').default(1).notNull(),
  bytesServed: bigint('bytes_served', { mode: 'number' }).default(sql`0`).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// 10. Durable Storage Cleanup Queue
export const storageCleanupQueue = portfolioSchema.table('storage_cleanup_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  bucketName: text('bucket_name').notNull(),
  storagePath: text('storage_path').notNull(),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED'
  retryCount: integer('retry_count').default(0).notNull(),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 7. Storage Architecture, Upload Transport & Publication Lifecycle (C02, C06)

### 7.1 Upload Transport Contract & Gateway Limit Resolution (C02)
* **Contract Choice:** Bounded requests under Vercel's 4.5 MB gateway limit.
* **Per-File Hard Limit:** **3.5 MB max file size**. Leaves ~1.0 MB headroom for multipart encoding headers, boundaries, and fields, guaranteeing total HTTP request payload stays strictly < 4.0 MB.
* **Client-Side Canvas Pre-Downscaling:** For phone camera photos that exceed 3.5 MB, the dashboard's `ImageCropUpload` component renders the image to an HTML5 canvas, downscaling to max 2400x2400px JPEG/WebP at 90% quality before transmission.
* **Dedicated Route Handler:** Uploads route to `POST /api/admin/upload` (accepts `multipart/form-data`, checks `requireOwnerAdmin()`).

### 7.2 3-Stage Storage Model & Draft Privacy (C06)
1. **`private-documents` Bucket:** Private bucket for PDF resumes.
2. **`private-staging` Bucket:** Private bucket for raw unoptimized uploads and unpublished draft derivatives.
3. **`public-media` Bucket:** Public read CDN bucket containing **published WebP image derivatives only**.

* **Draft Privacy Guarantee:** When a project, skill icon, or achievement is saved in draft state (`is_published: false`), its processed WebP image remains in `private-staging`. It is copied to `public-media` **only when explicitly published**.

### 7.3 Storage Cleanup Worker & Hobby Cadence Resolution (V5)
On Vercel Hobby, Cron Jobs run once daily. To ensure rapid cleanup without paying for Vercel Pro:
1. **Primary Scheduled Worker:** Vercel Cron runs daily (`cron: "0 3 * * *"`) invoking `/api/cron/cleanup` for deep reconciliation.
2. **Opportunistic Mutation Drain:** When any dashboard mutation finishes (image replacement, deletion), the Server Action processes up to 5 pending cleanup items in the background.
3. **External Free Trigger (Optional):** A GitHub Actions workflow (`.github/workflows/cleanup-cron.yml`) can trigger `/api/cron/cleanup` every 15 minutes at zero cost.

Worker implementation with row locking and reference re-checks:
```typescript
// app/api/cron/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { storageCleanupQueue, mediaAssets } from '@/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getStorageClient } from '@/lib/storage/client';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 1. Atomically claim batch of up to 20 items using row-level locking
  const items = await db.transaction(async (tx) => {
    const claimed = await tx.execute(sql`
      UPDATE portfolio.storage_cleanup_queue
      SET status = 'PROCESSING'
      WHERE id IN (
        SELECT id FROM portfolio.storage_cleanup_queue
        WHERE status = 'PENDING' AND next_retry_at <= NOW()
        ORDER BY created_at ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);
    return claimed as Array<typeof storageCleanupQueue.$inferSelect>;
  });

  const storage = getStorageClient();

  for (const item of items) {
    try {
      // 2. Reference re-check: Ensure asset was not re-linked
      const [ref] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storagePath, item.storagePath));
      if (ref) {
        // Still referenced; abort deletion and mark completed
        await db.update(storageCleanupQueue).set({ status: 'COMPLETED' }).where(eq(storageCleanupQueue.id, item.id));
        continue;
      }

      // 3. Delete from Supabase Storage
      const { error } = await storage.from(item.bucketName).remove([item.storagePath]);
      if (error) throw error;

      await db.update(storageCleanupQueue).set({ status: 'COMPLETED' }).where(eq(storageCleanupQueue.id, item.id));
    } catch (err: any) {
      const nextRetry = item.retryCount + 1;
      if (nextRetry >= 5) {
        await db.update(storageCleanupQueue).set({ status: 'FAILED', retryCount: nextRetry }).where(eq(storageCleanupQueue.id, item.id));
      } else {
        await db.update(storageCleanupQueue).set({
          status: 'PENDING',
          retryCount: nextRetry,
          nextRetryAt: sql`NOW() + (INTERVAL '1 minute' * (2 ^ ${nextRetry}))`,
        }).where(eq(storageCleanupQueue.id, item.id));
      }
    }
  }

  return NextResponse.json({ processed: items.length });
}
```

---

## 8. CV Delivery, Streaming, Range Handling & Bigint Rate Accounting (C07, V4)

### 8.1 Same-Origin Streaming Handlers
* **Preview Route (`GET /api/resume/preview`):** `Content-Disposition: inline; filename="Mohammad_Ardi_Resume.pdf"`, `Cache-Control: private, no-store, must-revalidate`.
* **Download Route (`GET /api/resume/download`):** `Content-Disposition: attachment; filename="Mohammad_Ardi_Resume.pdf"`.
* **Explicit HEAD Export:**
  ```typescript
  export async function HEAD(req: NextRequest) {
    const resume = await getActiveResumeMetadata();
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': resume.fileSizeBytes.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
      },
    });
  }
  ```

### 8.2 Full HTTP Range Compliance
* Supports standard (`bytes=0-1023`), open-ended (`bytes=1024-`), and suffix (`bytes=-500`) ranges.
* Validates bounds against `fileSizeBytes`. Rejects invalid ranges with `416 Range Not Satisfiable` and `Content-Range: bytes */fileSizeBytes`.
* Multi-range requests are rejected in favor of full 200 responses to prevent fragmentation attacks.

### 8.3 Atomic Bigint Byte Accounting Algorithm (V4)
```typescript
// lib/ratelimit/cv-limiter.ts
import { db } from '@/db';
import { rateLimitBuckets } from '@/db/schema';
import { sql } from 'drizzle-orm';

const MAX_PREVIEW_PER_HOUR = 30;
const MAX_DOWNLOAD_PER_HOUR = 10;
const GLOBAL_MONTHLY_BYTES = 5_368_709_120; // 5 GB in bytes

export async function checkAndReserveCvDelivery(ip: string, action: 'preview' | 'download', bytesExpected: number): Promise<{ allowed: boolean; retryAfter?: number }> {
  const hourKey = `cv:${action}:${ip}:${Math.floor(Date.now() / 3600000)}`;
  const monthKey = `cv:bandwidth:${new Date().toISOString().slice(0, 7)}`;
  const limit = action === 'preview' ? MAX_PREVIEW_PER_HOUR : MAX_DOWNLOAD_PER_HOUR;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. IP Request count reservation
      const [ipBucket] = await tx.execute(sql`
        INSERT INTO portfolio.rate_limit_buckets (key, count, bytes_served, window_start, expires_at)
        VALUES (${hourKey}, 1, ${bytesExpected}, NOW(), NOW() + INTERVAL '1 hour')
        ON CONFLICT (key) DO UPDATE
        SET count = portfolio.rate_limit_buckets.count + 1,
            bytes_served = portfolio.rate_limit_buckets.bytes_served + ${bytesExpected}
        RETURNING count;
      `) as any;

      // 2. Global Bandwidth reservation (using 64-bit bigint)
      const [globalBucket] = await tx.execute(sql`
        INSERT INTO portfolio.rate_limit_buckets (key, count, bytes_served, window_start, expires_at)
        VALUES (${monthKey}, 1, ${bytesExpected}, NOW(), NOW() + INTERVAL '32 days')
        ON CONFLICT (key) DO UPDATE
        SET bytes_served = portfolio.rate_limit_buckets.bytes_served + ${bytesExpected}
        RETURNING bytes_served;
      `) as any;

      return { ipCount: Number(ipBucket.count), globalBytes: Number(globalBucket.bytes_served) };
    });

    if (result.ipCount > limit) return { allowed: false, retryAfter: 3600 };
    if (result.globalBytes > GLOBAL_MONTHLY_BYTES) return { allowed: false, retryAfter: 86400 };

    return { allowed: true };
  } catch (err) {
    // Fail closed on database unavailability
    return { allowed: false, retryAfter: 60 };
  }
}
```

* **Trusted IP Extraction:**
  ```typescript
  export function getTrustedClientIp(req: NextRequest): string {
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    if (vercelIp) return vercelIp.split(',')[0].trim();
    const xff = req.headers.get('x-forwarded-for');
    return xff ? xff.split(',')[0].trim() : '127.0.0.1';
  }
  ```

---

## 9. Skill Icon System & Visual Polish

### 9.1 Valid CSS Alpha Color Representation
Card border wash and glow use CSS `color-mix()`:
```css
.skill-card {
  --skill-accent: #E34F26;
  border-color: color-mix(in srgb, var(--skill-accent) 40%, transparent);
}

.skill-card:hover .skill-glow-wash {
  background: radial-gradient(
    circle at 50% 0%,
    color-mix(in srgb, var(--skill-accent) 20%, transparent),
    transparent 70%
  );
}
```

### 9.2 Bundle Optimization
Public bundle imports only the exact SVGs for the ~12 active skills. Admin `IconPicker` loads the search catalog dynamically on the dashboard route only.

---

## 10. UI Polish, Accessibility & Motion Consolidation (C12)

### 10.1 Layout Fixes & Reference Viewports
* **Hero vs. Social Rail Overlap:**
  * Update [FloatingSidebar.tsx](file:///c:/projects/mohammadardi-portfolio/src/components/FloatingSidebar.tsx#L24) breakpoint from `lg:flex` to `xl:flex` (1280px+).
  * Add reserved left gutter (`xl:pl-20`) to the container.
* **Fixed Header Anchor Offset:** Add `scroll-mt-28` to all section root elements.
* **Certificate Image Containment:** Replace raw images with Next.js `<Image>` using `object-contain max-h-[380px] w-full bg-card/60`.
* **Reference Test Viewports:**
  * Mobile: 375x667, 390x844
  * Tablet: 768x1024
  * Desktop: 1024x768, 1280x800, 1440x900

### 10.2 Motion Consolidation
* Consolidate onto `framer-motion` (`12.23.26`). Remove `motion`, `gsap`, and `lenis`.
* Base styles default to `opacity: 1; transform: none;`. Motion variants animate components post-mount. Content remains 100% visible if scripts fail.
* Reduced Motion: Use `useReducedMotion()`. Transitions resolve instantly (`duration: 0`) if preferred.

---

## 11. Contact Form & Anti-Spam Pipeline

1. **Client Form Island (`components/public/ContactSection.tsx`):**
   * Name, Email, Message, Cloudflare Turnstile widget, hidden honeypot input (`<input name="bot_field" className="hidden" tabIndex={-1} autoComplete="off" />`).
2. **Server Action (`actions/contact.ts`):**
   * Honeypot trap: discards bot submission if `bot_field` is filled.
   * Rate limit: max 3 submissions / 60 minutes per IP.
   * Turnstile verification against Cloudflare endpoint.
   * Zod validation: `name` (2-100 chars), `email` (RFC format), `message` (10-2000 chars).
   * Transactional email delivery via Resend (`resend.emails.send()`) to `miftahulislam9037@gmail.com`.

---

## 12. Deployment, Backup, Quotas & Recovery Procedures (C10)

### 12.1 Deployment Environment & Licensing Caveats
* **Provisional Target:** Vercel Hobby + Supabase Free Tier ($0/month).
* **Licensing Note:** Vercel Hobby is for personal, non-commercial use. If the portfolio is used for freelance client acquisition, Vercel Pro ($20/month) or Railway ($5/month) is required.
* **Quotas:** Vercel Function Payload: 3.5 MB enforced per-file; Supabase: 500 MB DB, 1 GB storage, 2 GB egress; Resend: 100 emails/day; Cloudflare Turnstile: Free unlimited.

### 12.2 Complete Backup & Reverse Restoration Drill (C10)
1. **PostgreSQL Database Backup & Restore:**
   ```bash
   # Create logical custom-format backup
   pg_dump "postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
     --schema=portfolio --format=custom --file=backup_portfolio_$(date +%F).dump

   # Restore backup to target database
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
     backup_portfolio_$(date +%F).dump

   # Post-restore permission & session flush script:
   psql "postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" -c "
     ALTER SCHEMA portfolio OWNER TO portfolio_migrator;
     GRANT USAGE ON SCHEMA portfolio TO portfolio_app;
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portfolio TO portfolio_app;
     GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA portfolio TO portfolio_app;
     UPDATE portfolio.admin_sessions SET is_revoked = TRUE;
     UPDATE portfolio.fresh_login_nonces SET used_at = NOW();"
   ```
2. **Object Storage Backup & Reverse Restore Commands:**
   ```bash
   # BACKUP: Synchronize all 3 buckets to local backup directory
   rclone sync supabase-s3:private-documents ./backups/storage/private-documents/
   rclone sync supabase-s3:private-staging ./backups/storage/private-staging/
   rclone sync supabase-s3:public-media ./backups/storage/public-media/

   # REVERSE RESTORE: Synchronize local backup directory back to Supabase Storage
   rclone sync ./backups/storage/private-documents/ supabase-s3:private-documents/
   rclone sync ./backups/storage/private-staging/ supabase-s3:private-staging/
   rclone sync ./backups/storage/public-media/ supabase-s3:public-media/
   ```

---

## 13. Initial Content & Media Seed Strategy (C09)

### 13.1 Standalone Seed Script (`scripts/seed-portfolio.ts`)
Executes deterministic, non-destructive seeding using fixed UUIDs:
* Non-destructive default: Uses `ON CONFLICT (id) DO NOTHING` so re-running does not overwrite owner edits.
* Intentional reset mode: Re-running with `--reset` executes `DO UPDATE` to restore original factory content.
* Missing CV handling: If `seeds/resume.pdf` is absent, logs a warning and sets `profile.resumeMediaId = null` (cleanly hiding the homepage CV download button) rather than failing the seed.
* Converts local PNGs (`src/assets/*`) and downloads remote assets (Postimg, CS50, GitHub) to optimized WebP derivatives in `public-media`.
* Populates `portfolio.profile`, `portfolio.skills` (11 items), `portfolio.projects` (3 items including HeroRide separate frontend/backend links), `portfolio.achievements` (2 items), and `portfolio.social_links` (5 items).

---

## 14. Phased Implementation Roadmap & File Mappings (C11, C14)

### 14.1 Old-to-New File Mapping
| Existing Lovable / Vite File | New Next.js App Router File | Purpose |
| :--- | :--- | :--- |
| `src/main.tsx`, `src/App.tsx` | `app/layout.tsx`, `app/(public)/layout.tsx` | Root shell, fonts (`next/font/google`), providers |
| `src/pages/Index.tsx` | `app/(public)/page.tsx` | Main Server Component rendering all sections |
| `src/pages/NotFound.tsx` | `app/not-found.tsx` | App Router 404 page |
| `src/components/SmoothScroll.tsx` | *Removed* | Replaced by native CSS `scroll-behavior: smooth` |
| `src/components/HeroSection.tsx` | `components/public/HeroSection.tsx` | Server profile data + client CTA & glow avatar |
| `src/components/AboutSection.tsx` | `components/public/AboutSection.tsx` | Server biography (GSAP removed) |
| `src/components/SkillsSection.tsx` | `components/public/SkillsSection.tsx` | Server skills + dynamic CSS `color-mix()` glow |
| `src/components/ProjectsSection.tsx` | `components/public/ProjectsSection.tsx` | Server projects + separate frontend/backend links |
| `src/components/AchievementsSection.tsx`| `components/public/AchievementsSection.tsx`| Server certificates + aspect containment |
| `src/components/ContactSection.tsx` | `components/public/ContactSection.tsx` | Client form + Turnstile + Server Action |
| `src/components/FloatingSidebar.tsx`| `components/public/FloatingSidebar.tsx`| Responsive gutter positioning (`xl:flex`) |
| `src/components/Footer.tsx` | `components/public/Footer.tsx` | Unified social links from DB |
| *New* | `app/api/media/[type]/[id]/route.ts` | Public media proxy with publication checks |
| *New* | `app/api/admin/upload/route.ts` | Bounded multipart upload handler (3.5 MB) |
| *New* | `app/api/cron/cleanup/route.ts` | Storage cleanup queue worker |

### 14.2 Retained vs. Pruned UI Primitives (C14)
* **Retained & Adapted:** `dialog.tsx`, `sheet.tsx`, `command.tsx`, `tabs.tsx`, `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `sonner.tsx`.
* **Pruned in Final Tree-Shake:** `accordion.tsx`, `alert-dialog.tsx`, `aspect-ratio.tsx`, `calendar.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `context-menu.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `slider.tsx`, `switch.tsx`, `table.tsx`, `toggle-group.tsx`.

### 14.3 Atomic Mutation & Concurrency Contracts (C11)
* **Entity Updates:**
  ```sql
  UPDATE portfolio.projects
  SET title = $title, description = $description, live_url = $live_url,
      github_url = $github_url, github_server_url = $github_server_url,
      updated_at = NOW(), version = version + 1
  WHERE id = $id AND version = $expected_version
  RETURNING id, version;
  ```
  If 0 rows returned, throws `OptimisticConcurrencyConflictError` (HTTP 409).
* **Reorder Contract:** Submits `items: { id: string; version: number; displayOrder: number }[]`.
  In a single transaction, updates each item checking its version. If any single item has a version mismatch, the entire transaction aborts.

### 14.4 Verifiable Implementation Phases
* **Phase 0: Baseline & Git Init:** Run `git init`. Commit current state. Fix 3 ESLint errors. Pass gate: `pnpm lint` exits 0.
* **Phase 1: Next.js Parity:** Setup Next.js 15.5.29 App Router. Migrate static components. Remove `gsap`, `lenis`, `motion`. Pass gate: `pnpm build` exits 0; visual parity verified at all 5 reference viewports.
* **Phase 2: Database Setup & Seed:** Setup Drizzle schema `portfolio`. Run `pnpm drizzle-kit migrate`. Run `pnpm tsx scripts/seed-portfolio.ts`. Pass gate: public page loads all seeded content from database.
* **Phase 3: Auth, MFA & 24h Engine:** Implement `/admin/login`, `/admin/mfa/*`, `requireOwnerAdmin()`, and `admin_sessions`. Pass gate: Tests 01–09 pass.
* **Phase 4: Dashboard CRUD & Media:** Implement `/admin` CMS, `IconPicker`, `ImageCropUpload`, and `storage_cleanup_queue`. Pass gate: Tests 10–15 pass.
* **Phase 5: CV Delivery & Contact:** Implement `/api/resume/*` with Range/Rate limiting, Turnstile contact action. Pass gate: Tests 16–18 pass.
* **Phase 6: E2E Verification & Audit:** Execute full 22-scenario test matrix. Run Lighthouse audits (accessibility >= 95, performance >= 90).
* **Phase 7: Production Cutover:** Deploy to Vercel production. Run migrations. Switch DNS. Maintain old deployment as 48-hour rollback target.

---

## 15. Verification & Testing Matrix (C11, C12)

| Test ID | Test Scenario | Execution Method & Acceptance Criteria |
| :--- | :--- | :--- |
| **TEST-01** | Unauthenticated Admin Denial | Direct HTTP request to `/admin` or Server Actions without session. Returns 401 Unauthorized or redirects to `/admin/login`. |
| **TEST-02** | Non-Owner User Denial | Authenticate with valid Supabase user whose ID does not match `OWNER_USER_ID`. Rejects with 403 Forbidden. |
| **TEST-03** | Password-Only (`aal1`) Denial | Sign in with email/password; attempt admin action before TOTP verification. Returns 403 Forbidden. |
| **TEST-04** | MFA Enrollment & Verification | Scan QR code with TOTP app; enter 6-digit code. Elevates to `aal2` and inserts `admin_sessions` record. |
| **TEST-05** | Sign-Out & Revocation | Call `logoutAction()`. Marks `admin_sessions.is_revoked = true`. Subsequent requests rejected. |
| **TEST-06** | Session Access at 23h 59m | Send request 1 minute prior to 24-hour deadline. Must succeed normally. |
| **TEST-07** | Session Denial at 24h 00m 01s | Send request 1 second past 24-hour deadline. Must fail with 401 and redirect to `/admin/login`. |
| **TEST-08** | Token Refresh Deadline Invariance | Trigger Supabase access token refresh at hour 1, 2, and 5. Verify `admin_sessions.deadline_at` remains unchanged. |
| **TEST-09** | Stale Nonce Renewal Rejection | Submit expired or reused `login_challenge_nonce` to MFA verification. Server rejects with 401. |
| **TEST-10** | Private CV Direct Access Block | Direct HTTP GET to Supabase Storage URL for resume PDF returns 403/404. |
| **TEST-11** | Full Content CRUD & Reorder | Create, update, reorder, toggle visibility, and delete an item in each collection. Public page revalidates immediately. |
| **TEST-12** | Optional Repository Links | Edit HeroRide to verify separate frontend/backend links; edit Qurbani Hat with single GitHub; edit another with no GitHub. No broken buttons rendered. |
| **TEST-13** | Icon Picker & Dynamic Glow | Assign Simple Icon, Lucide icon, and custom PNG icon to skills. Verify hover radial glow matches specified accent color via `color-mix`. |
| **TEST-14** | Media Upload Failure Rollback | Simulate database failure during image replacement. Newly uploaded storage object is scheduled in cleanup queue; old image is preserved. |
| **TEST-15** | Referenced Media Deletion Lock | Attempt to delete a `media_assets` row currently referenced by an active project or avatar. Foreign key constraint rejects deletion. |
| **TEST-16** | CV Range & HEAD Requests | Send `HEAD /api/resume/preview` (verifies `Content-Length`). Send `Range: bytes=0-1023` and `Range: bytes=1024-` (verifies `206 Partial Content`). Send out-of-bounds range (verifies `416`). |
| **TEST-17** | CV Rate Limiter Thresholds | Send 31 preview requests and 11 download requests within 1 hour. Requests 31 and 11 return `429 Too Many Requests` with `Retry-After`. |
| **TEST-18** | Optimistic Concurrency Conflict | Open project in two tabs; edit in Tab A (version 1 -> 2); attempt save in Tab B (with version 1). Tab B returns 409 Conflict. |
| **TEST-19** | Draft Image Privacy | Create a project in draft (`is_published: false`). Verify image derivative is not present in `public-media` bucket. |
| **TEST-20** | Upload Gateway Limit Protection | Upload 5 MB uncompressed file. Client canvas pre-scales to <3.5 MB; server rejects unscaled files >3.5 MB with 400 Bad Request before hitting Vercel 4.5 MB limit. Direct curl with >4.5 MB body receives gateway 413. |
| **TEST-21** | Administrative MFA Recovery | Execute `scripts/admin-recover-mfa.ts`. Verified factor deleted, sessions revoked, fresh password login and re-enrollment required. |
| **TEST-22** | Accessibility & Script-Failure Visibility | Tab navigation through all interactive elements (focus visible). Screen reader check on mobile menu drawer. Verify entire portfolio is 100% visible and readable with JavaScript disabled. |

---

## 16. Tooling, Verified Dependency Pinning & Handoff Protocol (C01, V1, V2)

### 16.1 Exact Verified Dependencies (Resolving C01, V1, V2)
```json
{
  "dependencies": {
    "next": "15.5.29",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "@supabase/ssr": "0.12.7",
    "@supabase/supabase-js": "2.119.0",
    "drizzle-orm": "0.38.4",
    "postgres": "3.4.5",
    "framer-motion": "12.23.26",
    "sharp": "0.33.5",
    "simple-icons": "14.12.0",
    "lucide-react": "0.462.0",
    "resend": "4.1.2",
    "zod": "3.25.76",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0"
  },
  "devDependencies": {
    "@types/node": "22.16.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "drizzle-kit": "0.30.4",
    "tailwindcss": "3.4.17",
    "typescript": "5.8.3"
  }
}
```
*Verification Evidence:* 
* `next@15.5.29` incorporates critical remote-code-execution patches (CVE-2025-66478 / CVE-2025-55182).
* `react@19.3.1` and `react-dom@19.3.1` are verified published releases on the npm registry.
* `@types/react@19.3.0` and `@types/react-dom@19.3.0` are verified published releases matching React 19.3 (replacing unreleased `19.3.1` type pins).
* `@supabase/supabase-js@2.119.0` bundles `@supabase/auth-js@2.119.0`, which officially exposes the `getClaims()` method.
* `@supabase/ssr@0.12.7` peerDependencies officially specify `'@supabase/supabase-js': '^2.114.0'`.
* *Optional Drizzle MCP:* If Drizzle MCP is adopted, the exact pinned compatible RC pair is `drizzle-orm@0.40.0-rc.1` and `drizzle-kit@0.30.5-rc.1`. Otherwise, stable `0.38.4` / `0.30.4` is used.

### 16.2 Shared Review Coordination with Codex
* All progress, verified test runs, database migrations, and plan deviations are recorded in **`docs/implementation-status.md`**.
* Antigravity owns active file modifications. Once each implementation phase finishes and passes checks, a git commit checkpoint is published for Codex to review in read-only mode.
* No credentials, private tokens, or connection secrets will ever be written to status or documentation files.
