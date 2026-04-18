# prd-cheatsheet — Design Spec

**Date:** 2026-04-18
**Status:** Approved for implementation planning
**Owner:** Dinesh

---

## 1. Purpose

A beautifully crafted, mobile-friendly, vanilla-stack web page that serves as a
personal cheatsheet for the PRD → V1 engineering workflow. Deployed on a
`dineshd.dev` subdomain so it is accessible from any machine when starting a
greenfield project. Tracks the current project's progress through 120+
checklist items across 10 phases plus two reference sections.

The source content is the `PRD to V1 Cheatsheet Task List` (10 phases, a
Minimal Artifact Set, and a Final Pre-Code Check).

## 2. Non-Goals

- No multi-project support. One browser = one project state.
- No server. No auth. No account.
- No build step, no framework, no bundler.
- No analytics, no telemetry.
- No print-first design (print is a fallback, not a first-class view).

## 3. Constraints

- **Stack:** Vanilla HTML, CSS, JS only. ES modules. No npm dependencies.
- **Deployment:** Vercel static hosting at a `dineshd.dev` subdomain (proposed
  `prd.dineshd.dev`; final name to be confirmed at deploy time).
- **Browsers:** Latest two versions of Safari, Chrome, Firefox. iOS Safari 16+.
- **Aesthetic:** Soft Structuralism archetype — warm off-white base, bold
  grotesk typography, airy floating cards with diffused ambient shadows,
  single muted accent. Must read as a $150k agency build, not a template.
- **Accessibility:** WCAG AA across every ink-on-surface combination.
  Full keyboard navigability. `prefers-reduced-motion` honored.
- **Governance:** Protocol Zero — no AI attribution anywhere in code or docs.

## 4. Success Criteria

- Every checklist item in the source is present in `phases.js`, correctly
  grouped (item vs. gate vs. anti-gate), and individually tickable (except
  anti-gate items, which are rendered but not interactive).
- State persists across page reloads and survives browser restart.
- Deep-linking to a phase via `/#phase-03` opens that phase's modal on load.
- Lighthouse on a Vercel preview deployment: Performance ≥ 95,
  Accessibility = 100, Best Practices ≥ 95.
- Layout collapses cleanly on viewports down to 360px wide with no
  horizontal scroll.
- Opening, using, and closing a phase modal feels physical — weighted motion
  with custom cubic-beziers, no linear easing.

## 5. Architecture

### 5.1 File & Repo Layout

```
prd-cheatsheet/
├── index.html              single page, semantic shell only
├── styles/
│   ├── tokens.css          design tokens: colors, radii, shadows, type,
│   │                       cubic-bezier easings, motion durations
│   ├── base.css            reset + font-faces + body baseline
│   ├── layout.css          hero, bento grid, extras section, footer, reset
│   ├── tile.css            phase tile (the bento card)
│   ├── modal.css           overlay + dialog + open/close motion
│   └── sigils.css          per-phase sigil perpetual micro-animations
├── scripts/
│   ├── app.js              entry. Wires render → hash routing → storage
│   ├── render.js           pure DOM builders: tiles, modals, extras
│   ├── storage.js          thin localStorage wrapper with a stable key
│   ├── router.js           hash parser + modal open/close sync
│   └── reveal.js           IntersectionObserver scroll reveals
├── data/
│   └── phases.js           the content module — single exported object
├── assets/
│   ├── sigils.svg          all 10 sigils in one SVG sprite (<symbol> defs)
│   └── fonts/              self-hosted Cabinet Grotesk, Geist, Geist Mono WOFF2
├── docs/
│   └── superpowers/specs/  this file lives here
├── vercel.json             static config: clean URLs, cache headers
├── .gitignore
├── README.md               one-paragraph: what this is, how to edit content
└── TESTING.md              manual smoke checklist (see section 10)
```

Rationale:

- CSS split by concern, not by component. Each file stays under ~150 lines.
- JS split by responsibility. `render`, `storage`, `router`, `reveal` each
  testable and reasonable about in isolation. `app.js` is wiring.
- `data/phases.js` is the one place content lives.
- Single `sigils.svg` sprite: one fetch, CSS-stylable via `currentColor`.

### 5.2 Data Model

**`data/phases.js`** — single exported object:

```js
export const CHEATSHEET = {
  phases: [
    {
      id: "01",
      title: "Triage the Rough PRD",
      subtitle: "Make the PRD legible before planning.",
      sigilId: "sigil-01",
      items: [
        {
          id: "p01-i01",
          text: "Re-read the PRD and rewrite the core problem in 1–2 sentences",
        },
        // … one entry per checklist item in phase 01
      ],
      gate: {
        label: "Gate to move on",
        items: [
          {
            id: "p01-g01",
            text: "PRD clearly states problem, user, value, V1 scope, constraints, success criteria",
          },
          // …
        ],
      },
    },
    // … phases 02 through 10
  ],
  extras: {
    artifactSet: {
      title: "Minimal Artifact Set",
      items: [
        /* 13 items, ids x-art-01 … x-art-13 */
      ],
    },
    preCodeCheck: {
      title: "Final Pre-Code Check",
      items: [
        /* 10 items, ids x-pcc-01 … x-pcc-10 */
      ],
    },
  },
};
```

**Per-phase shape rules:**

- `items` is required on every phase.
- `gate` is **optional**. Phases 01–06 and 08 have one. Phases 07, 09, and
  10 do not — render the phase modal without a Gate section when absent.
- `antiGate` is an optional field used only by Phase 07 (the "Do not
  scaffold if" list). Rendered with warn-color styling in the modal,
  **not** tickable, **not** counted toward phase progress.
- Nested sub-bullets in the source (e.g. Phase 02's "break questions"
  list) are **flattened** — each sub-bullet becomes its own top-level
  item with its own stable id. The parent "Challenge the PRD with break
  questions" line is dropped; the five sub-questions stand on their own.
  This keeps the data model a simple flat `items[]` and keeps progress
  counting unambiguous.

**ID convention:**

- Stable, content-independent: `p<phase>-i<index>`, `p<phase>-g<index>`,
  `x-art-<index>`, `x-pcc-<index>`.
- IDs never change when wording changes. Retired IDs are never reused.

**`localStorage` shape:**

```js
// key: "prd-cheatsheet.v1.state"
{
  checks: { "p01-i01": true, "p01-i02": true, /* … */ },
  updatedAt: "2026-04-18T14:22:11.000Z",
  schemaVersion: 1
}
```

- One key, one JSON blob, read once on boot.
- Debounced write on change (200ms).
- `schemaVersion` lets us discard-and-reset on future incompatible changes.

### 5.3 Progress Semantics

- A phase's progress ratio = `(ticked items + ticked gate items) / (total items + total gate items)`.
- `antiGate` items (phase 07 red flags) are not counted, not tickable.
- A phase is complete when its ratio reaches 1. Complete tiles shift the
  sigil color from `--ink` to `--accent` and mute the title.
- Extras (Artifact Set, Pre-Code Check) each carry their own ratio, shown
  inline in the Packet section; they do not contribute to the hero's
  aggregate meter of the 10-phase pipeline.
- Hero aggregate meter: `{ticked} / {total across all phases + gates}` plus
  a plain-text current-phase indicator (the lowest-numbered phase that is
  not yet complete).

## 6. Page Information Architecture

Single scrolling page, no router. Top to bottom:

### 6.1 Hero

- `min-height: 80dvh` (never `h-screen`).
- Asymmetric left-aligned layout on desktop; stacked on mobile.
- Eyebrow pill: `A PRE-CODE RITUAL`.
- H1 over two lines, deliberately broken:
  `From rough PRD` / `to scaffold-ready`.
  Cabinet Grotesk, weight 200, `leading: 0.92`, `tracking: -0.04em`.
- Lede (~2 lines, zinc-500, `max-width: 48ch`).
- Right side: ambient decorative SVG — a large line-drawn architectural
  diagram of the 10 phases as connected nodes, stroke-opacity ~0.12.
  Static; does not advance with progress.
- Hero meter: `{ticked} / {total} complete · phase {n} in progress`.
  Understated, zinc-500.

### 6.2 Phase Bento (`#phases`)

Section eyebrow: `THE TEN PHASES`.

Asymmetric CSS Grid. Desktop (`≥ 1100px`) uses a 4-column × variable-row
layout with tile sizes varying by weight:

| Phase | Title (short) | Span             |
| ----- | ------------- | ---------------- |
| 01    | Triage        | col-span-2 row-1 |
| 02    | Scope         | col-span-2 row-1 |
| 03    | Shape         | col-span-2 row-2 |
| 04    | Pack          | col-span-2 row-1 |
| 05    | Spike         | col-span-1 row-1 |
| 06    | Slice         | col-span-1 row-1 |
| 07    | Readiness     | col-span-2 row-1 |
| 08    | Scaffold      | col-span-2 row-2 |
| 09    | Build         | col-span-2 row-1 |
| 10    | Close         | col-span-2 row-1 |

Tablet (`768–1099px`): 2-column uniform. Mobile (`< 768px`): single-column,
full width, `px-5`, `gap-4`. All desktop span overrides drop on mobile.

Tile content:

- Massive numeral (phase id).
- Eyebrow pill: `PHASE {id}`.
- Title (H3, weight 300).
- Sigil SVG (referenced via `<use href="assets/sigils.svg#sigil-01">`).
- Progress meter row: `{ticked}/{total}` and a hairline progress bar.
- Hover: `translateY(-2px)` + shadow deepen. Active: `scale(0.985)`.
- Entire tile is a semantic `<button>`.

### 6.3 The Packet (`#packet`)

Section eyebrow: `THE PACKET`. Lede: "Two reference lists you scan while
you work, not sequential work."

Two side-by-side cards on desktop (`grid-cols-2`, `gap-6`), stacked on
mobile. Each card renders its full checklist inline — always visible, no
modal. Same double-bezel architecture as tiles but no sigil. Each card
shows its own progress count.

### 6.4 Footer

- Left: `prd.dineshd.dev` in Geist Mono, zinc-500.
- Right: `RESET PROGRESS` link, zinc-400. Click swaps to inline confirm:
  `clear {ticked} checks?  ✕ cancel  ✓ confirm` where `{ticked}` is the
  current ticked total computed at click time. Confirm wipes localStorage
  and reloads.
- Padding: `py-16`. No attribution, no copyright.

### 6.5 Modal Overlay

Rendered into a top-level `#modal-root` container, hidden by default. Opens
on tile click or when the URL hash matches a phase.

- Fixed full-viewport overlay. Background: `rgba(10,10,10,0.4)` with
  `backdrop-blur-xl`.
- Dialog: centered, `max-width: 640px`, `max-height: 85dvh`, scrollable.
  Double-bezel outer shell (radius 32px) + inner core (radius 26px).
- Contents: phase eyebrow, large decorative phase number, title, subtitle,
  items list (checkboxes), Gate section with its own sage eyebrow
  (`GATE TO MOVE ON`), and for phase 07 an anti-gate block in warn color
  with eyebrow `DO NOT SCAFFOLD IF`.
- Close affordances: top-right `×` button (using the button-in-button
  pattern), Esc key, backdrop click, or hash change.
- Open motion: overlay fades in (`opacity 0 → 1`), dialog fades and rises
  (`translateY(32px) blur(4px) opacity-0 → 0/0/1`) over 280ms using
  `cubic-bezier(0.32, 0.72, 0, 1)`.
- ARIA: `role="dialog"`, `aria-modal="true"`, labelled by the phase title.
  Focus trapped. On open, first checkbox receives focus. On close, focus
  returns to the tile that opened it.
- Body scroll locked while open (`overflow: hidden` on `<html>`).
- `<main>` receives `inert` while the modal is open.

## 7. Visual System

### 7.1 Palette

| Token             | Value                     | Use                                   |
| ----------------- | ------------------------- | ------------------------------------- |
| `--bg`            | `#F6F6F4`                 | page background (warm zinc)           |
| `--surface`       | `#FFFFFF`                 | inner cores of cards                  |
| `--surface-shell` | `rgba(10, 10, 10, 0.025)` | outer bezel shells                    |
| `--ink`           | `#0B0B0C`                 | body text (off-black, never #000)     |
| `--ink-muted`     | `#5B5B5F`                 | secondary text                        |
| `--ink-faint`     | `#9A9A9D`                 | eyebrows, meta                        |
| `--hairline`      | `rgba(10, 10, 10, 0.06)`  | hairline borders, dividers            |
| `--accent`        | `#2F6F4E`                 | muted forest-sage (checked, progress) |
| `--accent-soft`   | `#E7EEE9`                 | checked-row tint                      |
| `--warn`          | `#8C3B3B`                 | phase 07 anti-gate                    |
| `--warn-soft`     | `#F3E7E7`                 | anti-gate row tint                    |

Shadow:

```
--shadow-card: 0 1px 1px rgba(10,10,10,0.02),
               0 8px 24px -12px rgba(10,10,10,0.08),
               0 24px 48px -24px rgba(10,10,10,0.05);
```

No gradient text. No neon glow. No AI purple.

### 7.2 Typography

Self-hosted WOFF2:

- **Display:** Cabinet Grotesk Variable (weights 200–800).
- **Body/UI:** Geist Variable.
- **Mono:** Geist Mono.

Fallback stacks: `system-ui, -apple-system, sans-serif` for body;
`ui-monospace, Menlo` for mono. **Inter is banned.**

Type scale (CSS variables, clamp-driven):

```
--t-eyebrow:  10px, uppercase, tracking 0.22em, weight 500
--t-meta:     12px, tracking 0.02em
--t-body:     15px, line-height 1.55, max-w 65ch
--t-tile-num: clamp(64px, 8vw, 120px), weight 200, tracking -0.04em
--t-h2:       clamp(28px, 3.2vw, 44px), weight 300, tracking -0.02em
--t-hero:     clamp(56px, 8.5vw, 128px), weight 200, leading 0.92,
              tracking -0.04em
```

### 7.3 Spacing & Radii

- 4px spacing base. Scale `--s-1`=4 … `--s-12`=96.
- Section padding: `py-24` desktop, `py-16` mobile.
- Radii: `--r-xl` 32 (outer shell), `--r-lg` 26 (inner core),
  `--r-md` 14 (rows, meter end-caps), `--r-pill` 999 (chips, links).

### 7.4 Double-Bezel Card Recipe

Every card (tile, modal, Packet card):

```css
.shell {
  padding: 6px;
  border-radius: 32px;
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
}
.core {
  border-radius: 26px;
  background: var(--surface);
  box-shadow:
    var(--shadow-card),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
```

### 7.5 Sigils

All 10 sigils are ultra-light line art on a 64×64 viewBox, 1.5px stroke,
`stroke="currentColor"`, `fill="none"`, `stroke-linecap="round"`. First-pass
concepts:

| Phase | Sigil concept                                         |
| ----- | ----------------------------------------------------- |
| 01    | Concentric arcs offset — signal converging to clarity |
| 02    | Square frame with a quadrant cut away                 |
| 03    | Three stacked horizontal lines + a vertical spine     |
| 04    | Overlapping thin rectangles staggered like pages      |
| 05    | Single line ascending through a circle                |
| 06    | Vertical ruled fringe — a stack cut into slices       |
| 07    | Crosshair inside a soft bracket frame                 |
| 08    | Grid intersection — 3 verticals × 2 horizontals       |
| 09    | Open triangle pointing up-right, one edge extended    |
| 10    | Circle with a horizontal line through the meridian    |

Implementation detail: all 10 live as `<symbol>` entries inside
`assets/sigils.svg`, referenced from tile markup with
`<svg><use href="assets/sigils.svg#sigil-01"/></svg>`. Colour inherits via
`currentColor`. Complete tiles set `color: var(--accent)` on the SVG.

### 7.6 Motion

- Easings: `--ease-out: cubic-bezier(0.32, 0.72, 0, 1)`,
  `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Durations: `--d-fast: 180ms` (hover), `--d-med: 280ms` (modal),
  `--d-slow: 700ms` (scroll reveal).
- **Scroll reveals:** elements enter with
  `translateY(40px) opacity-0 blur(8px) → 0/1/0`. Staggered via
  `animation-delay: calc(var(--i) * 60ms)`. Triggered by
  `IntersectionObserver`; **no scroll event listeners**.
- **Perpetual sigil animation:** each sigil carries a unique,
  subtle 8–12s infinite CSS animation (e.g., 01's outer arc breathes
  scale 1 → 1.02; 09's extended edge lengthens by 6%). These run only when
  the tile is in-viewport — paused via IntersectionObserver toggling a
  CSS class — to avoid off-screen GPU cost.
- **Tile hover:** `translateY(-2px)` + shadow deepen over `--d-fast` using
  `--ease-out`. Active: `scale(0.985)` tactile feedback.
- **Reduced motion:** `prefers-reduced-motion: reduce` kills all perpetual
  animation, scroll reveals, and modal blur-rise (modal still fades).
  Hover transitions remain — direct user feedback stays honest.

### 7.7 Accessibility

- Every ink-on-surface combination meets WCAG AA.
- Checkboxes are native `<input type="checkbox">`, visually restyled; the
  `<label>` is the full click target.
- `:focus-visible` outlines: 2px, `--accent`, 2px offset.
- Modal: ARIA as above, focus trap, Esc closes, backdrop click closes,
  focus returns to opener on close.

## 8. Interaction & State Flow

### 8.1 Boot Sequence

On `DOMContentLoaded`:

1. `storage.load()` reads `prd-cheatsheet.v1.state`. Missing or malformed →
   start with `{ checks: {}, schemaVersion: 1 }`.
2. `render.mount(CHEATSHEET, state)` builds: hero meter, 10 phase tiles in
   `#phases`, 2 Packet cards in `#packet`, 10 hidden modal dialogs in
   `#modal-root`, footer reset link.
3. `storage.prune(state, validIds)` drops orphaned keys from storage.
4. `reveal.observe()` attaches `IntersectionObserver` to every `.reveal`
   element; fires the reveal class once, then unobserves.
5. `router.init()` reads `location.hash`. `#phase-XX` for a valid phase →
   opens that modal.
6. Binds: tile click → open + pushState; modal close → close +
   history.back or replaceState; checkbox change → mutate + debounced
   persist + live meter update; reset link → confirm → wipe + reload.

### 8.2 State Mutation

```
user toggles checkbox
  → state.checks[itemId] = event.target.checked
  → re-derive phase ratio
  → update tile progress DOM in place
  → update hero aggregate meter
  → schedule debounced persist (200ms)
```

Only the affected tile and the hero meter re-render. `render.js` exposes
`updateProgress(phaseId, ratio)` and `updateHeroMeter(totals)` as targeted
mutators. No full tree rebuild on toggle.

### 8.3 Routing

- `#` or empty → grid view.
- `#phase-01` through `#phase-10` → matching modal open.
- Any other hash → ignored, cleared, grid view.
- Opening a modal uses `history.pushState`. Back button closes it.
- `popstate` keeps open/closed state in sync with back/forward.

### 8.4 Persistence

Debounced save, 200ms:

```js
let timer;
function scheduleSave(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
  }, 200);
}
```

### 8.5 Reset

Footer link click swaps its label to an inline confirm row. Confirm wipes
`localStorage` and reloads. Cancel swaps back. No native `confirm()`
dialog.

### 8.6 Keyboard

- `Esc` closes open modal.
- `Tab` is trapped inside dialog while open; natural flow otherwise.
- `Enter` / `Space` on a tile opens its modal (tiles are `<button>`).
- `Space` on a checkbox toggles (native).

### 8.7 No-JS Fallback

Semantic HTML renders the hero and a visually degraded grid of tile
headings. Below the fold, each phase is rendered again as a plain section
with its full checklist (non-interactive). Without JS: no modals, no
progress, but content is still fully readable. Doubles as the print view.

## 9. Error & Edge Handling

- **Malformed `phases.js`:** `render.js` validates on boot (phases have
  `id` and `items`; each item has `id` + `text`; if `gate` is present it
  must have `items[]`; if `antiGate` is present it must have `items[]`;
  no duplicate ids anywhere). Failure → abort render, log error to
  console.
- **Stale ids in localStorage:** `storage.prune` drops ids not present in
  the current `phases.js`.
- **Duplicate hash triggers:** `router.open(id)` is idempotent; re-opening
  the same modal is a no-op.
- **Tiny viewports (< 360px):** hero numeral caps at 64px; tile grid
  single-column; modal goes full-viewport with its own padding.
- **No `localStorage`:** catch and fall back to in-memory state; show a
  subtle footer notice `progress not saved`.
- **Schema mismatch:** if `schemaVersion !== 1`, discard and start fresh.
- **Reduced motion:** disables perpetual, reveal, and modal blur-rise.
- **Print (`@media print`):** strip shadows, bezels, colour fills; render
  phases + Packet as plain H2/UL blocks in order.

## 10. Testing

No framework, no test runner. Verification is manual + CI static checks.

### 10.1 Manual Smoke (`TESTING.md`)

Run after every meaningful change:

- Hero renders with correct meter.
- Tile progress matches state in `localStorage`.
- Click each of the 10 phase tiles → correct modal opens.
- Deep-link `/#phase-07` opens phase 07 modal on load.
- Esc, backdrop click, and × button all close the modal.
- Browser back button closes an open modal.
- Checkbox toggle persists across reload.
- Reset flow wipes state and reloads.
- Phase 07 anti-gate block renders in warn color and does not affect the
  phase 07 progress count.
- Mobile (`< 768px`) shows single-column grid with no horizontal scroll.
- `prefers-reduced-motion: reduce` (toggle via devtools) disables
  perpetual and reveal animations; modal and hover still work.
- Full keyboard traversal: Tab through the page, open a modal with Enter,
  Tab inside the modal, Esc out, focus returns to the opening tile.

### 10.2 CI

Vercel's built-in Lighthouse runs on preview deployments.
Gates: Performance ≥ 95, Accessibility = 100, Best Practices ≥ 95.
Dropping the accessibility score below 100 blocks a merge.

### 10.3 Browser Support

Latest two versions of Safari, Chrome, Firefox. iOS Safari 16+. No IE, no
polyfills. ES modules used natively — no bundling.

## 11. Deployment

- Static Vercel project. Repo root is the deploy root; no build command.
- `vercel.json`: clean URLs, long cache on `/assets/*` and `/styles/*`,
  short cache on `/index.html`.
- Domain: `prd.dineshd.dev` (or similar — final name confirmed at deploy).
- Preview deploys on every push; production on merge to `main`.

## 12. Open Items / Deferred

- Final sigil artwork (concept list is first-pass; each SVG will be
  iterated during the implementation pass until visually cohesive).
- Exact subdomain name (`prd.dineshd.dev` proposed).
- Whether to add a future v2 shape (multi-project) — explicitly out of
  scope now; `schemaVersion: 1` leaves room.
