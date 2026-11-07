## Plan: Advanced Animations Upgrade (Lenis + GSAP + Framer Motion)

Layer in smooth scrolling, scroll-triggered reveals, and richer micro-interactions across the portfolio — without changing layout, Tailwind classes, theme, or component structure. Framer Motion is already installed; only Lenis and GSAP need to be added.

### Phase 1 — Setup & Global Wrapper

**Dependencies**
- Add `lenis` (the current published package; `@studio-freight/lenis` was renamed and is deprecated — same API, recommended drop-in)
- Add `gsap` (includes `ScrollTrigger`)

**New file: `src/components/SmoothScroll.tsx`**
- Client wrapper that initializes a single Lenis instance on mount
- Hooks Lenis into `requestAnimationFrame`
- Bridges Lenis with GSAP ScrollTrigger:
  - `gsap.registerPlugin(ScrollTrigger)`
  - On every Lenis `scroll` event → `ScrollTrigger.update()`
  - `gsap.ticker.add` drives Lenis `raf` and disables lag smoothing
- Cleans up on unmount (destroy Lenis, remove ticker, kill ScrollTriggers it created)

**`src/App.tsx`**
- Wrap the existing `<BrowserRouter>` tree with `<SmoothScroll>` so smoothing applies globally (works with all routes, including 404)

**Anchor scroll compatibility**
- Patch `Navbar`/`FloatingSidebar` smooth-scroll handlers to use Lenis (`lenis.scrollTo('#id')`) when available, falling back to native `scrollIntoView`. This avoids fighting between native smooth-scroll and Lenis.
- Expose the Lenis instance via a tiny module-level getter (`getLenis()`) from `SmoothScroll.tsx` — no React context churn, no prop drilling.

### Phase 2 — Component Animations

**1. Hero (`HeroSection.tsx`) — Framer Motion only**
- Already staggers headline/subheadline/paragraph/CTA via individual `motion` elements. Convert to a parent `motion.div` with `variants` + `staggerChildren` for cleaner, true staggered reveal (slide-up + fade).
- Profile picture: keep existing `y: [0, -10, 0]` float loop (already present) — confirm easing/duration tuned for "gentle" feel.

**2. About (`AboutSection.tsx`) — GSAP ScrollTrigger**
- Remove the existing Framer Motion entrance on the two columns (keep section-title motion intact).
- Add refs to text column and image column.
- In `useLayoutEffect` with `gsap.context`:
  - Text column: `from { x: -50, opacity: 0 }` with ScrollTrigger `{ trigger: section, start: 'top 75%', end: 'top 30%', scrub: 1 }`
  - Image column: `from { x: 50, opacity: 0 }` with same scrub trigger
- Cleanup via `ctx.revert()`.

**3. Skills (`SkillsSection.tsx`) — GSAP + Framer Motion**
- Replace per-card Framer entrance with a GSAP `from` on `.skill-card` children using `stagger: 0.15`, ScrollTrigger `start: 'top 80%'`, `toggleActions: 'play none none none'`.
- Wrap each card in a `motion.div` (or add `whileHover={{ scale: 1.05 }}` to the existing card div) for hover micro-interaction. Keep all Tailwind classes intact.

**4. Projects (`ProjectsSection.tsx`) & Achievements (`AchievementsSection.tsx`) — GSAP ScrollTrigger.batch**
- Remove per-card Framer entrance animations.
- Use `ScrollTrigger.batch('.project-card' / '.achievement-card', { onEnter: batch => gsap.to(batch, { opacity: 1, scale: 1, stagger: 0.1, duration: 0.6, ease: 'power2.out' }), start: 'top 85%' })`.
- Set initial state with `gsap.set(cards, { opacity: 0, scale: 0.95 })`.
- Add a marker className to each card (`project-card`, `achievement-card`) — purely a hook, no visual class.

**5. Contact (`ContactSection.tsx`) — Framer Motion `whileInView`**
- Convert the form's individual `motion.div` blocks (Name, Email, Message, ReCAPTCHA, Submit) to use a parent `motion.form` with `whileInView` + `viewport={{ once: true, margin: '-100px' }}` and `variants` with `staggerChildren: 0.12`.
- Each child variant: `hidden { opacity: 0, y: -15 }` → `visible { opacity: 1, y: 0 }` (slide-down feel as requested).
- Left-side info block left untouched.

### Technical Details

- **Why Lenis + GSAP bridge:** Without bridging, ScrollTrigger reads native scroll position while Lenis lerp-scrolls, causing jank. The `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker` pattern is the official integration.
- **`useLayoutEffect` + `gsap.context`:** Scopes selectors to the component and provides synchronous cleanup on unmount/HMR — prevents duplicate ScrollTriggers during dev.
- **Reduced motion:** Lenis respects `prefers-reduced-motion` natively. We'll also gate GSAP scroll animations with `gsap.matchMedia` `'(prefers-reduced-motion: no-preference)'` so users with reduced-motion get instant, non-animated reveals.
- **Sticky/fixed elements:** The `FloatingSidebar` and `Navbar` (fixed) are unaffected by Lenis transforms because Lenis scrolls the document root, not a transformed wrapper.
- **No layout changes:** Every existing className, structure, and component boundary is preserved. New code only adds refs, `motion` wrappers around already-present elements, and a hook className (`project-card`, `achievement-card`) used solely as a GSAP selector.

### Files Touched

- `package.json` — add `lenis`, `gsap`
- `src/components/SmoothScroll.tsx` — **new**
- `src/App.tsx` — wrap tree
- `src/components/Navbar.tsx` — Lenis-aware anchor scroll
- `src/components/FloatingSidebar.tsx` — Lenis-aware anchor scroll (if it has anchor handlers)
- `src/components/HeroSection.tsx` — variants-based stagger
- `src/components/AboutSection.tsx` — GSAP scrub reveal
- `src/components/SkillsSection.tsx` — GSAP stagger + hover scale
- `src/components/ProjectsSection.tsx` — GSAP batch reveal
- `src/components/AchievementsSection.tsx` — GSAP batch reveal
- `src/components/ContactSection.tsx` — `whileInView` variants

### Rollout Order (safe, incremental)

1. Install deps + add `SmoothScroll` + wrap App → verify smooth scroll works, no jank, anchors still jump correctly.
2. Hero + Contact (Framer-only changes) → low risk.
3. About (GSAP scrub) → first GSAP integration, verify ScrollTrigger bridge.
4. Skills, Projects, Achievements (GSAP batch/stagger) → roll out together.
5. Final pass: test reduced-motion, mobile viewport, and route change cleanup.
