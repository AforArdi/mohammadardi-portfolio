# Stage 5: Initial zoom out

Reviewer: `/root/stage5_zoom`, fresh conversation, completed.

Scope: full target, lines 1–788. Standard: installed `zoom-out-standard.md`.

## Complete reviewer result

Read manifest: Read both supplied reviewer instructions completely; read `docs/implementation-plan.md` lines 1–788 and every supplied reading-list file: `concepts_brief.md`, `docs/plan-review.md`, `package.json`, `README.md`, `src/App.tsx`, all nine supplied component files (including `ui/command.tsx` and `ui/textarea.tsx`), `src/pages/Index.tsx`, `index.html`, and `tailwind.config.ts`. None missing. Performed code searches for proposed helpers, existing UI primitives, publication filters, cache invalidation, and concurrency fields. No edits or compilation.

**Z5-1 — Major — Public data boundary is unspecified.**
Target: lines 681–687; related lines 736, 744. The proposed public page reads directly through the broadly privileged application database role, but the plan never defines the published/non-deleted projection or excludes private fields from public props and cached results. An ISR tag plus an acceptance test does not establish this boundary. Define one server-only public-content reader that selects permitted fields and published/non-deleted rows, then specify invalidation after successful mutations. Keep owner reads outside that shared cache. This supplies the minimal reusable boundary required by the brief.

**Z5-2 — Major — Media lifecycle covers upload-time publication but omits later state changes.**
Target: lines 486–503, 695–700. The proposed flow chooses storage based on publication status during upload. It does not explain publishing an existing draft without another upload, replacing a published image with a draft, or retaining media for soft-deleted content. Automatically cleaning an old image on replacement can also undermine the proposed restore capability. Define a small lifecycle covering staged, published, replaced, hidden/deleted, and permanently purged assets; make database references and cleanup eligibility follow it. State explicitly what hiding does to previously public URLs.

**Z5-3 — Major — Recovery procedures omit storage that holds saved drafts.**
Target: lines 633–650. The proposed database backup includes draft media references, but object backup copies only `private-documents` and `public-media`. Under Section 7, saved draft derivatives live in `private-staging`; those records would restore with missing files. Include retained draft objects in the backup scope, distinguish disposable raw uploads from durable derivatives, and add an actual object-restore procedure plus one restore check before cutover.

**Z5-4 — Nit — Reuse existing dashboard primitives explicitly.**
Target: lines 63–66, 695–699. The plan calls generated UI components bloat while proposing a searchable icon picker and dashboard controls without identifying reusable pieces. Searches found existing `CommandDialog`/`CommandInput`/`CommandList` in `src/components/ui/command.tsx`, Radix-backed `Dialog` and `Sheet`, and existing `Tabs`, `Form`, and `Slider` primitives. No existing domain-level `IconPicker`, `GlowColorPicker`, or `ImageCropUpload` was found. Preserve suitable primitives and compose the new domain controls from them; prune unused scaffolding after the dashboard’s actual imports are established.
