# Site improvement pass — August 2026

A polish pass over the personal site (no redesign: the palette, the live
multi-agent simulation, and the scroll narrative are untouched in concept).
Every change is a separate conventional commit, so `git log` reads as the
story of the pass.

## What changed, per commit

| Commit | Task |
| --- | --- |
| `fix(copy)` | "Cooperate" step now speaks at the same thousands-of-agents scale as the other narrative steps; sentence case across titles/labels/CTAs; award descriptions in active voice. |
| `refactor(content)` | GAIME $75K de-duplicated from 4 placements to 2: a subtle hero chip and the full Awards entry. The freed stats slot now highlights simulation scale ("1000s agents per simulation"); awards count corrected to 6. |
| `refactor(skills)` | 53-item list culled to two tiers — Core research stack (8) and Engineering & deployment (8) — plus one closing line covering the long tail. PHP/Laravel/Dart/Angular/Firebase no longer dilute the researcher identity. |
| `fix(awards)` | Award cards have an optional big number: money awards keep the bold amount; the VR Pioneer and top-of-class entries show a small-caps highlight label instead of "-" or a bare GPA. |
| `feat(publications)` | New "Publications & writing" section between Research and Experience with an In-preparation entry structure, plus a Google Scholar slot next to LinkedIn/GitHub. All placeholder content is TODO-marked (see below). |
| `feat(research)` | Each Current-work card supports a repo/demo/paper link row, hidden while empty, TODO-marked. |
| `feat(meta)` | New composed 1200×630 social card (`/og-image-wide.jpg`) for og:image + twitter:image (`summary_large_image`); the 1:1 image stays as secondary og:image for square-preferring platforms. Canonical, robots, viewport, and JSON-LD (Person/WebSite/ProfilePage) verified on the built HTML. |
| `feat(a11y)` | Reduced-motion: canvas sim renders a static constellation, showcase robots hold a static pose, reveals/marquee/letter animation disabled. Sim perf: ~30fps tick + DPR≤1.5 on small viewports, off-screen pause kept. Mobile menu: focus moves in on open, Tab trapped, Escape closes and restores focus. Visible `:focus-visible` outlines. Muted text raised above 4.5:1 AA. |
| `fix(a11y)` | Axe-driven: sr-only hero name for screen readers (was a prohibited aria-label on a span), showcase stage no longer blanket aria-hidden around a focusable 3D viewer, caption heading order fixed, award label contrast cleared. |
| `perf` | Fonts self-hosted via next/font (was render-blocking Google Fonts CSS); model-viewer vendored and lazy-injected when the showcase nears the viewport; city backdrop lazy-loaded the same way; favicon was the raw 3.1 MB portrait, now 10 KB; `experimental.inlineCss` removes the render-blocking stylesheet fetch that intermittently painted unstyled content (CLS 0.38–0.42 on cold responses — root-caused via trace filmstrips). |

## Lighthouse (local prod build, headless Chrome)

| | Perf | A11y | Best practices | SEO | FCP | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile, before perf work | 72 | 100¹ | 100 | 100 | 4.0 s | 5.1 s | 0 |
| **Mobile, final** | **97–98** | **100** | **100** | **100** | 0.8 s | 2.5 s | 0 |
| **Desktop, final** | **100** | **100** | **100** | **100** | 0.2 s | 0.5 s | 0 |

¹ First measurement was taken after the accessibility commits; before them,
axe reported 2 serious violation types (aria-hidden-focus,
aria-prohibited-attr) plus a heading-order issue, so the true starting A11y
score was lower.

Mobile CLS is stable at 0 across repeated cold-start runs (the flaky
0.38–0.42 FOUC shift was reproduced deterministically and eliminated with
inlined CSS).

## Axe

- Before: 3 violation types (2 serious: `aria-hidden-focus`,
  `aria-prohibited-attr`; 1 moderate: `heading-order`) at both 375px and
  1440px.
- After: **0 serious/critical**. One moderate remains (`landmark-unique`):
  both `<model-viewer>` instances emit an identical "Live announcements"
  region inside their own shadow DOM — internal to the library, not
  addressable from page code, and not part of Lighthouse's scored audit set.

## Screenshots

Final states, inspected at 375 / 768 / 1440 px — see `docs/screenshots/`:

- `hero-{375,768,1440}.jpg` — hero with sim canvas, single GAIME chip, new stats
- `narrative-{375,1440}.jpg` — scroll narrative mid-sequence (stages 2–3)
- `publications-1440.jpg` — new Publications & writing section
- `awards-{375,1440}.jpg` — awards grid with optional big number
- `skills-{375,1440}.jpg` — two-tier skills layout
- `reduced-motion-{hero,narrative}.jpg` — `prefers-reduced-motion` emulation:
  static constellation + posed robots, all content visible

No layout breaks, overflow, or cramped spacing at any of the three
breakpoints.

## Verification loop

Six Lighthouse iterations, three axe iterations, two full screenshot passes:

1. Baseline after content tasks: axe 3 violation types; mobile perf 72.
2. Axe fixes → 1 serious left (shadow-DOM focusable inside aria-hidden).
3. Restructured stage aria → 0 serious; perf work round 1 (fonts, favicon,
   self-hosted assets) → 62–82, flaky CLS appears.
4. Perf round 2 (lazy model-viewer + backdrop) → 78–98; CLS traced to
   cold-start FOUC via trace filmstrips.
5. `inlineCss` fix → three consecutive cold-start runs at 98 / CLS 0.
6. Final full suite (Lighthouse mobile + desktop, axe both viewports,
   12 screenshots, meta/JSON-LD checks) — all exit criteria met.

## Remaining TODOs (grep `TODO`)

| Location | What you need to fill in |
| --- | --- |
| `lib/data.ts:46` | Real Google Scholar profile URL (currently `?user=PLACEHOLDER`). |
| `lib/data.ts:104` | Research card 01 — repo/demo/paper links when artifacts ship. |
| `lib/data.ts:111` | Research card 02 — same. |
| `lib/data.ts:118` | Research card 03 — same. |
| `lib/data.ts:131` | Publications entry — real paper title, target venue, one-line summary. |
| `components/Contact.tsx:75` | Reminder comment at the Scholar link (updates via `lib/data.ts`). |

## Notes

- `experimental.inlineCss` is a Next.js experimental flag; it's what holds
  CLS at 0 on slow stylesheet responses. If a future Next upgrade drops it,
  re-verify CLS on a cold server before shipping.
- `public/vendor/model-viewer.min.js` is pinned at v4.3.1 (previously the
  site floated on unpkg's latest).
- `app/globals.css` and `app/theme.css` are dead files (only
  `app/showcase.css` is imported) — left in place, candidates for deletion.
