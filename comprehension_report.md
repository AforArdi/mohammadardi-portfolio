## What this proposes

This plan replaces the existing Vite/React portfolio with one Next.js application containing a server-rendered public site, an owner dashboard, and backend operations while preserving the current visual identity. The dashboard would manage profile content, skills, projects, achievements, social links, images, and a privately stored PDF resume using Supabase PostgreSQL, Drizzle, and Supabase Storage. Owner access would require password authentication plus TOTP, followed by a database-authoritative authorization deadline fixed at 24 hours. The rollout proceeds through migration, database setup, authentication, dashboard implementation, CV/contact delivery, testing, and production cutover with a temporary DNS rollback option.

## How the existing system works, per this document

The current portfolio is a client-rendered Vite/React application with static content, several animation libraries, unused generated components, and three competing package lockfiles. Its build succeeds, but lint reports three errors and eight warnings; the document also identifies large assets, incorrect metadata, layout overlaps, and accessibility gaps. Images and certificates depend partly on external hosts, the resume links to Google Drive, and the contact form uses client-side EmailJS and reCAPTCHA integration. The document reports that the project folder currently lacks Git initialization; the Next.js routes, database tables, dashboard, and administrative recovery script are proposed additions.

1. **C6-1 — Major — Upload capacity remains simultaneously specified and unresolved.**
   **Lines 473–483, 625–629, 780–782.** Sections 7 and 12 promise 12 MB uploads on the provisional Vercel deployment, but Section 16 explicitly questions whether that deployment instead imposes an unavoidable 4.5 MB gateway limit. A reader cannot determine which upload contract to implement or whether direct storage uploads are required before the dashboard can satisfy it. State the selected transport and effective supported size, or identify this as a deployment decision that must precede implementation.

2. **C6-2 — Major — Public CV access conflicts with the stated authorization boundary.**
   **Lines 97, 224–225, 509–531, 777–779.** The requirements describe a public resume preview, and Section 8 specifies public-facing preview/download delivery, but Section 16 says `admin_sessions` is verified on every “file preview.” It is unclear whether this means dashboard-only media previews or the public CV endpoint. Explicitly distinguish public CV delivery from protected administrative previews so an implementer does not accidentally require owner authentication for visitors.

3. **C6-3 — Major — Initial owner setup and post-recovery enrollment are disconnected from the login sequence.**
   **Lines 200–220, 264–286, 298–301, 689–693, 729.** The detailed sequence assumes an existing TOTP factor and redirects password login directly to the challenge page, while a separate enrollment page is listed and recovery removes the owner's factors. The document never explains how the owner account is provisioned, how a password-authenticated owner without a factor reaches enrollment, or how successful enrollment consumes the fresh-login proof and establishes the 24-hour record. Describe that branch so first deployment and recovery have an executable path.

4. **C6-4 — Major — Visibility changes are not connected to the storage publication lifecycle.**
   **Lines 100–103, 486–499, 695–700, 744.** The storage diagram decides whether to copy an image publicly during upload, but visibility can change later without another upload. The plan does not explain how publishing an existing draft promotes its derivative and updates references, or what unpublishing a previously public item does to its public object and public accessibility. This leaves the scope of the draft privacy guarantee unclear across the item's lifecycle.

5. **C6-5 — Major — Public cache refresh is an acceptance requirement without a corresponding mutation workflow.**
   **Lines 686–687, 695–700, 736.** The public page is to use ISR tag `portfolio-content`, and CRUD testing requires immediate public revalidation. The document does not connect successful dashboard writes or media publication to invalidating that tag. Specify when revalidation occurs, including visibility changes and reordering, so the reader can follow a saved dashboard change through to its public result.

6. **C6-6 — Major — The named backup-and-restore procedure leaves the media recovery path incomplete.**
   **Lines 111–114, 633–650.** The plan makes `private-staging` the durable location for unpublished image derivatives, but its object backup commands cover only `private-documents` and `public-media`. It also supplies no storage restoration command or explanation of restoring objects consistently with database media references. A reader cannot tell whether drafts are intentionally disposable or how a complete portfolio recovery is performed; define that policy and complete the recovery sequence.

Read confirmation: The comprehension persona was read completely, and target lines **1–788**, including FeatureRange **1–125** and DetailedRange **126–788**, were read completely. No linked files, repository source, other reports, or external sources were consulted. No requested reading was missing.

Reviewer: `/root/stage6_comprehension`, fresh conversation, completed. This file preserves the complete reviewer result.
