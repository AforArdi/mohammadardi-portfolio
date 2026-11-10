# Visual and architecture checkpoint — 2026-11-10

Codex reviewed the owner's six screenshots and agy's release report. Direct changes: header gutter alignment with hero at large widths; portrait centered in its column with a small image-only zoom; copyright moved into the footer's main row without a separate divider; social rail left unchanged. Added one public-only, pointer-transparent Motion atmosphere with faint dots, radial accents, restrained scroll-linked drift and progress, and reduced-motion handling.

Contact public provider identifiers were moved to the ignored local environment and blank example entries, preserving the owner's current values without printing them. These browser-safe IDs are not server secrets. Google must separately allow localhost for local verification. No provider-console configuration or email delivery was changed.

Critical review correction: PDF.js may transfer/detach the buffer passed to its worker. The renderer now passes a copy, preserving the original cached buffer for download. More verification is needed around worker-version synchronization, cancellation and large/many-page documents.

Agy's 26 passing tests are not comprehensive route coverage: some tests reconstruct sample behavior/configuration rather than call production code. Its CI uses version tags rather than immutable SHA pins. Its claimed zero-advisory result is being independently checked. Preserve the report as evidence of the agent's claims, not final acceptance.

Next.js root app/ is supported; src/app is optional. proxy.ts is a Next.js 16 convention, whereas this project still runs Next.js 15.5.29. No untested middleware rename or major framework upgrade was made. The next agy handoff requires an actual supported upgrade with auth/caching verification.

All root Markdown documents moved: GitHub-facing README to .github/README.md; setup to docs/setup; review/status evidence to docs/reviews; prompts to docs/handoffs. LICENSE remains at root. Relative document links were adjusted. Historical command/path references may still need updating before their next use.

Pending: production build and visual browser verification of these latest changes, actual production-boundary tests, clean-checkout CI verification, controlled Next.js upgrade and Google provider allowlist/configuration. These changes are not a production-readiness certification.

Independent checks completed: 26 tests passed; production audit reported no known vulnerabilities; lint, production build and post-build typecheck passed. Known-private-value scan checked 198 current paths plus textual Git history without printing values. Latest homepage first-load JavaScript: 175 kB (not a Lighthouse result). Preview restarted at http://localhost:3101. Modified visual layout has not yet been verified through browser screenshots. No commit or deployment was made. Historical notes previously ignored under docs remain ignored in docs/archive/.
