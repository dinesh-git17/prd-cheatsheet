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
  grouped (task item vs. gate vs. anti-gate vs. choice). Task items, gate
  items, and anti-gate items are tickable. Choice blocks are single-select
  (one picked child at a time). Anti-gate ticks mean "this red flag is
  present" and are deliberately excluded from phase progress.
- State persists across page reloads and survives browser restart. Pending
  debounced writes are flushed on `visibilitychange` and `pagehide`.
- Deep-linking to a phase via `/#phase-03` opens that phase's modal on load.
- Lighthouse on a Vercel preview deployment (throttled mobile profile):
  Accessibility = 100 (hard gate, blocks merge), Best Practices ≥ 95 (hard
  gate), Performance ≥ 80 mobile / ≥ 90 desktop (tracked, warn-only).
- Layout collapses cleanly on viewports down to 360px wide with no
  horizontal scroll. iOS safe-area insets respected on modal and footer.
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
│   └── fonts/              self-hosted Cabinet Grotesk + Geist WOFF2 only
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

**`data/phases.js`** — single exported object. Each entry in an `items`,
`gate.items`, or `antiGate.items` array carries a `kind` discriminator
(default `"task"` if omitted):

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
          kind: "task",
          text: "Re-read the PRD and rewrite the core problem in 1–2 sentences",
        },
        // … remaining task items in phase 01
      ],
      gate: {
        label: "Gate to move on",
        items: [
          {
            id: "p01-g01",
            kind: "task",
            text: "PRD clearly states problem, user, value, V1 scope, constraints, success criteria",
          },
          // …
        ],
      },
    },
    // Phase 03 demonstrates the choice kind:
    {
      id: "03",
      title: "Decide the Technical Shape",
      // …
      items: [
        {
          id: "p03-c01",
          kind: "choice",
          text: "Choose the delivery model",
          options: [
            { id: "p03-c01-o01", text: "monolith" },
            { id: "p03-c01-o02", text: "modular monolith" },
            { id: "p03-c01-o03", text: "multi-package repo" },
            { id: "p03-c01-o04", text: "app + worker" },
            { id: "p03-c01-o05", text: "frontend + backend" },
            { id: "p03-c01-o06", text: "API-only" },
          ],
        },
        { id: "p03-i01", kind: "task", text: "Choose the primary language/runtime" },
        // …
      ],
    },
    // Phase 07 demonstrates antiGate:
    {
      id: "07",
      title: "Run the Scaffold Readiness Review",
      // …
      items: [ /* task items */ ],
      antiGate: {
        label: "Do not scaffold if",
        items: [
          { id: "p07-a01", kind: "task", text: "You are still debating major stack choices" },
          // …
        ],
      },
    },
    // … remaining phases
  ],
  extras: {
    artifactSet: {
      title: "Minimal Artifact Set",
      items: [ /* 13 task items, ids x-art-01 … x-art-13 */ ],
    },
    preCodeCheck: {
      title: "Final Pre-Code Check",
      items: [ /* 10 task items, ids x-pcc-01 … x-pcc-10 */ ],
    },
  },
};
```

**Item kinds.**

- `task` (default) — a standalone checklist item. Tickable. Counted toward
  phase progress unless it lives inside an `antiGate` list.
- `choice` — a single-select block. Has its own `text` (the prompt) and an
  `options[]` array. Zero or one of the options is picked at any time.
  Counts as **one** unit toward progress (1 if any option is picked, else 0).
- Any future kind must be added to this list explicitly — `render.js`
  switches on `kind` and renders accordingly.

**Per-phase shape rules.**

- `items` is required on every phase.
- `gate` is **optional**. Phases 01–06 and 08 have one. Phases 07, 09, and
  10 do not — render the phase modal without a Gate section when absent.
- `antiGate` is an optional field used only by Phase 07 (the "Do not
  scaffold if" list). Rendered with warn-color styling in the modal.
  Anti-gate items **are** tickable — a tick means "this red flag is
  currently true of my project." They are **not** counted toward phase
  progress (the phase can complete even with red flags ticked, on purpose
  — the tick is a reminder, not a blocker).
- Phase 07 has `antiGate` but no `gate`. Its progress is computed from
  `items` only.

**Nested-bullet handling (source → data model).**

The source `checklist.md` has two kinds of nested sub-bullets. Each is
handled explicitly, not via an implicit rule:

- **Discovery sub-questions** (Phase 02's "Challenge the PRD with break
  questions:" + its 5 sub-prompts). The parent is a label; the children are
  the actual work. **Flattened:** the 5 sub-prompts become 5 top-level
  `task` items in `phase-02.items`. The parent checkbox line in the
  source is intentionally dropped. This is a deliberate divergence from
  source to avoid a redundant parent/child ticking UX (no auto-
  propagation, no tri-state parent — those are fragile and confuse the
  progress count).
- **Radio-style option sets** (Phase 03's "Choose the delivery model:" +
  its 6 sub-options). The parent is the prompt; the children are
  mutually exclusive choices. **Preserved as a `choice` item kind** (see
  above). Exactly one option can be picked at a time.

If a future edit introduces a new nested-bullet pattern in the source,
handle it explicitly here — do not add an implicit rule.

**ID convention.**

- Stable, content-independent ids:
  - `p<phase>-i<index>` — task in `items[]`
  - `p<phase>-g<index>` — task in `gate.items[]`
  - `p<phase>-a<index>` — task in `antiGate.items[]`
  - `p<phase>-c<index>` — choice block
  - `p<phase>-c<index>-o<option-index>` — option within a choice
  - `x-art-<index>`, `x-pcc-<index>` — Packet items
- IDs never change when wording changes. Retired IDs are never reused.

**`localStorage` shape:**

```js
// key: "prd-cheatsheet.v1.state"
{
  checks: {
    "p01-i01": true,             // task items: boolean
    "p03-c01": "p03-c01-o02",   // choice items: the picked option id
    "p07-a03": true,             // anti-gate items: boolean (tickable)
    // …
  },
  updatedAt: "2026-04-18T14:22:11.000Z",
  schemaVersion: 1
}
```

- One key, one JSON blob, read once on boot.
- The `checks` map is heterogeneous by design: task ids map to `boolean`,
  choice ids map to `string` (the picked option id) or are absent.
  `storage.prune` handles both shapes.
- Debounced write on change (200ms) with forced flush on page hide —
  see §8.4.
- `schemaVersion` lets us discard-and-reset on future incompatible changes.

### 5.3 Progress Semantics

- **Countable units per phase:** every `task` item in `items[]` and
  `gate.items[]`, plus every `choice` block (one unit regardless of how
  many options it carries). Anti-gate items are **excluded** from the
  count.
- A task unit is "ticked" when its boolean is `true`. A choice unit is
  "ticked" when any option is picked (its entry in `checks` is a non-empty
  string). An anti-gate tick never contributes to progress.
- **Phase ratio** = ticked countable units / total countable units.
- A phase is complete when its ratio reaches 1. Complete tiles shift the
  sigil color from `--ink` to `--accent` and mute the title. Anti-gate
  ticks never change completion state.
- Extras (Artifact Set, Pre-Code Check) each carry their own ratio, shown
  inline in the Packet section; they do not contribute to the hero's
  aggregate meter of the 10-phase pipeline.
- Hero aggregate meter: `{ticked} / {total countable across all 10 phases}`
  plus a plain-text current-phase indicator (the lowest-numbered phase
  that is not yet complete).

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

Rendered **lazily** into a top-level `#modal-root` container. The markup
for a phase's modal is built the first time that phase is opened (via tile
click or hash match) and cached in memory; subsequent opens reuse the
cached node. This keeps initial DOM small and Lighthouse perf happy.

- Fixed full-viewport overlay. Background: `rgba(10,10,10,0.4)` with
  `backdrop-blur-xl`.
- Dialog: centered, `max-width: 640px`, `max-height: 85dvh`, scrollable.
  Double-bezel outer shell (radius 32px) + inner core (radius 26px).
  Respects iOS safe-area insets via `env(safe-area-inset-top)` and
  `env(safe-area-inset-bottom)` so the × button and last item stay
  reachable under notch / home indicator.
- Contents: phase eyebrow, large decorative phase number, title, subtitle,
  items list (mix of checkboxes for `task` items and single-select radio
  groups for `choice` items — with a small inline `clear` action next to
  a picked choice), Gate section with its own sage eyebrow
  (`GATE TO MOVE ON`) when the phase defines a gate, and for Phase 07 an
  anti-gate block in warn color with eyebrow `DO NOT SCAFFOLD IF` — items
  here are tickable; a tick means "this red flag is present" and renders
  with a warn-tinted row state.
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

Self-hosted WOFF2 (two families only, for performance budget):

- **Display:** Cabinet Grotesk Variable (weights 200–800).
- **Body/UI:** Geist Variable.

Monospace, where it appears (footer domain, dev-surfaced item ids), uses
the system stack `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
— no self-hosted mono font, keeping total font payload under ~150 KB.
Fallback for body: `system-ui, -apple-system, sans-serif`. **Inter is
banned.**

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
   `#phases`, 2 Packet cards in `#packet`, footer reset link. Phase
   modals are **not** pre-rendered — they are built on first open and
   cached (see §6.5).
3. `storage.prune(state, validIds)` drops orphaned keys from storage. For
   choice entries whose picked option id no longer exists, the entry is
   deleted (treated as "unpicked").
4. `reveal.observe()` attaches `IntersectionObserver` to every `.reveal`
   element; fires the reveal class once, then unobserves.
5. `router.init()` reads `location.hash`. `#phase-XX` for a valid phase →
   opens that modal (lazy-builds if first open).
6. Binds: tile click → (build-if-needed + open + pushState); modal close →
   history-aware close (§8.3); task checkbox change → mutate + update
   (§8.2); choice radio pick → mutate (unsets any prior pick for the same
   choice) + update; reset link → inline confirm → wipe + reload.
7. Install persistence flush listeners for `visibilitychange` and
   `pagehide` (§8.4).

### 8.2 State Mutation

```
user toggles a task checkbox (including anti-gate):
  → state.checks[itemId] = event.target.checked
  → re-derive ratio for the owning surface (phase | extras section)
  → update progress DOM for that surface:
      · phase  → updatePhaseProgress(phaseId, ratio)
      · extras → updatePacketProgress(sectionId, ratio)
  → if the surface is a phase → updateHeroMeter(totals)
  → (anti-gate toggles: no progress change — only the row's visual state)
  → scheduleSave(state)           // debounced 200ms

user picks a choice option:
  → state.checks[choiceId] = optionId     // replaces any prior pick
  → (same update chain as above)

user clicks inline "clear" on a picked choice:
  → delete state.checks[choiceId]
  → (same update chain)
```

`render.js` exposes `updatePhaseProgress(phaseId, ratio)`,
`updatePacketProgress(sectionId, ratio)`, and `updateHeroMeter(totals)` as
targeted mutators. Only the affected surface (tile OR Packet card) and —
for phase toggles — the hero meter re-render. No full tree rebuild on
toggle.

### 8.3 Routing

- `#` or empty → grid view.
- `#phase-01` through `#phase-10` → matching modal open.
- Any other hash → cleared via `history.replaceState` → grid view.
- **Opening from the grid** (tile click) uses `history.pushState` — the
  browser back button then closes the modal naturally.
- **Opening via deep-link** (user lands on `/#phase-07` with no prior
  same-session history): the modal opens over the entry-point history
  entry; no push. A session flag `openedFromPush` tracks whether we
  pushed or not for the current open.
- **Closing:**
  - If `openedFromPush` is true → `history.back()` (which triggers
    `popstate` → closes the modal visually).
  - If `openedFromPush` is false (deep-link) → `history.replaceState(null, '', window.location.pathname + window.location.search)`
    to drop the hash without navigating away from the site.
- `popstate` listener re-reads `location.hash` and syncs open/closed
  state with back/forward. This also handles the back-button-close path.

### 8.4 Persistence

Debounced save (200ms) with forced flush on page hide:

```js
let timer;
let pending = false;

function scheduleSave(state) {
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => flush(state), 200);
}

function flush(state) {
  if (!pending) return;
  pending = false;
  clearTimeout(timer);
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // QuotaExceededError, SecurityError (private mode), etc.
    // Fall back to in-memory; surface a subtle footer notice once.
    showPersistenceNotice();
  }
}

// Flush on tab hide / close to catch the last toggle before unload.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush(state);
});
window.addEventListener("pagehide", () => flush(state));
```

- `visibilitychange` is more reliable than `beforeunload` on mobile
  (iOS Safari often skips `beforeunload` on tab close).
- `pagehide` catches the bfcache path that `visibilitychange` can miss.
- `setItem` errors degrade gracefully to in-memory state and surface a
  single unobtrusive footer notice — the app continues to function for
  the session.

### 8.5 Reset

Footer link click swaps its label to an inline confirm row. Confirm wipes
`localStorage` and reloads. Cancel swaps back. No native `confirm()`
dialog.

### 8.6 Keyboard

- `Esc` closes open modal.
- `Tab` is trapped inside dialog while open; natural flow otherwise.
- `Enter` / `Space` on a tile opens its modal (tiles are `<button>`).
- `Space` on a checkbox toggles (native).

### 8.7 No-JS Behavior

The app is **JS-required**. All checklist content lives in `data/phases.js`
and is rendered into the DOM at runtime; there is no static HTML
duplication of the checklist and no build step to generate one. Duplicating
the content statically would fight the "single source of truth" principle
in §5.2.

Without JS, the page shows the hero section and a `<noscript>` notice
inside `#phases`, styled to match the Soft Structuralism aesthetic:

> **JavaScript required.** The checklist content is loaded at runtime from
> a single data file. Enable scripts to continue.

**Print styling** operates on the JS-rendered DOM, not as a no-JS
fallback (see §9 print rule).

## 9. Error & Edge Handling

- **Malformed `phases.js`:** `render.js` validates on boot. For each
  phase it checks: `id` and `items` present; every item has an `id` and,
  by kind — `task` needs `text`; `choice` needs `text` plus a non-empty
  `options[]` where every option has `id` + `text`; optional `gate.items[]`
  valid (all tasks); optional `antiGate.items[]` valid (all tasks); no
  duplicate ids anywhere in the data tree (including option ids). Failure
  → abort render, log a readable error to the console.
- **Stale ids in localStorage:** `storage.prune` drops keys whose ids are
  not in the current `phases.js`. Choice entries whose picked option id
  no longer exists are deleted (treated as unpicked).
- **Duplicate hash triggers:** `router.open(id)` is idempotent; re-opening
  the same modal is a no-op.
- **Tiny viewports (< 360px):** hero numeral caps at 64px; tile grid
  single-column; modal goes full-viewport with its own padding.
- **iOS safe-area insets:** footer, modal container, and the reset-confirm
  row apply `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`,
  and `env(safe-area-inset-right)` via CSS to respect notch, home
  indicator, and rotated landscape.
- **`localStorage` unavailable (private mode, disabled by policy):**
  `load()` catches and starts with empty state; `flush()` catches and
  shows a subtle footer notice `progress not saved this session`. App
  continues in-memory.
- **`localStorage` quota exceeded mid-session:** the `try/catch` inside
  `flush()` (§8.4) triggers the same in-memory degrade + footer notice.
- **Schema mismatch:** if `schemaVersion !== 1`, discard stored state
  and start fresh. No migration logic (nothing to migrate from yet).
- **Reduced motion:** `prefers-reduced-motion: reduce` disables perpetual
  sigil animation, scroll reveals, and the modal's blur-rise entry
  (modal still fades). Hover transitions remain — direct feedback.
- **Print (`@media print`):** strip shadows, bezels, colour fills; render
  phases + Packet as plain H2/UL blocks in order. Operates on the
  JS-rendered DOM — not a no-JS fallback.

## 10. Testing

No framework, no test runner. Verification is manual + CI static checks.

### 10.1 Manual Smoke (`TESTING.md`)

Run after every meaningful change:

- Hero renders with correct meter.
- Tile progress matches state in `localStorage`.
- Click each of the 10 phase tiles → correct modal opens (built on first
  open, reused on subsequent opens — verify via DOM inspector).
- Deep-link `/#phase-07` opens Phase 07 modal on load. Closing returns
  to grid via `replaceState` (URL loses hash, no navigation away).
- Deep-link `/#phase-03` (choice-kind phase): verify the `choice` block
  renders as a radio group; picking one unsets any previous pick;
  inline `clear` action clears the selection.
- Esc, backdrop click, and × button all close the modal.
- Browser back button closes a modal opened from the grid.
- Task toggle persists across reload. Choice pick persists across reload.
- Toggle a checkbox then immediately close the tab → reopen → the toggle
  persisted (flush-on-hide works). Repeat on iOS Safari.
- Reset flow wipes state and reloads.
- Phase 07 anti-gate items are tickable, render with warn-tinted rows,
  and do NOT change Phase 07 progress count or the hero aggregate meter.
- Packet (Artifact Set, Pre-Code Check): toggle items — each card's own
  progress counter updates live; hero meter is unaffected.
- Mobile (`< 768px`) shows single-column grid with no horizontal scroll
  at 360px, 375px, and 390px widths. On iOS Safari: modal and footer
  respect safe-area insets (no clipped content under notch / home
  indicator in portrait and landscape).
- `prefers-reduced-motion: reduce` (toggle via devtools) disables
  perpetual and reveal animations; modal fade and hover still work.
- Full keyboard traversal: Tab through the page, open a modal with Enter,
  Tab inside the modal (including radio groups — arrow keys navigate
  within a group), Esc out, focus returns to the opening tile.
- `localStorage` blocked (private mode) → app still functions in-memory,
  footer shows `progress not saved this session` once.
- JavaScript disabled → hero renders, `#phases` shows the `<noscript>`
  notice, no console errors visible in the network HTML.

### 10.2 CI

Vercel's built-in Lighthouse runs on preview deployments (throttled mobile
profile). Gate policy:

- **Accessibility = 100** — hard gate. Drop below and merge is blocked.
- **Best Practices ≥ 95** — hard gate.
- **Performance ≥ 80 (mobile) / ≥ 90 (desktop)** — tracked and warned
  on, but not merge-blocking. The chosen motion + full-page
  `backdrop-blur` + two self-hosted font families make a perfect perf
  score unrealistic; the a11y and BP gates are the ones that actually
  matter for quality. A sustained perf dip below these targets triggers
  a revisit, not an auto-block.

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
