# prd-cheatsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `prd-cheatsheet` — a vanilla HTML/CSS/JS static site that turns the PRD-to-V1 workflow into an interactive personal tracker, deployed to Vercel on a `dineshd.dev` subdomain.

**Architecture:** Single scrolling page, data-driven DOM rendering from `data/phases.js`. LocalStorage persistence with heterogeneous `checks` map (booleans for tasks, option ids for choices). Phase modals lazy-rendered on first open and cached. Pure-logic JS modules (storage, router, progress math) unit-tested with Node's built-in test runner; DOM and visual work verified via `TESTING.md` manual smoke.

**Tech Stack:**
- Vanilla HTML, CSS (custom properties + modern flex/grid), ES modules.
- Node 20+ built-in test runner (`node --test`) — zero npm dependencies.
- Self-hosted fonts: Cabinet Grotesk Variable, Geist Variable (WOFF2).
- Vercel static hosting (no build command).

**Source of truth:** `docs/superpowers/specs/2026-04-18-prd-cheatsheet-design.md`. Read it before starting any task. When in doubt, the spec wins.

**Source content:** `/Users/Dinesh/Desktop/checklist.md` — the 10-phase checklist that becomes the site's data.

**Branch strategy:** All work happens on a feature branch (`feat/initial-implementation`) off `main`. The final task opens a PR back to `main`. No direct commits to `main`.

---

## File Layout Overview

```
prd-cheatsheet/
├── index.html                       semantic shell + noscript
├── package.json                     zero-dep, type:module, test script
├── vercel.json                      static config + cache headers
├── .vercelignore                    excludes tests/, docs/, node_modules/
├── .gitignore                       (already committed)
├── README.md                        one-paragraph: what this is
├── TESTING.md                       manual smoke checklist
├── styles/
│   ├── tokens.css                   design tokens
│   ├── base.css                     reset + font-face + body
│   ├── layout.css                   hero, bento, packet, footer
│   ├── tile.css                     phase tile (double-bezel)
│   ├── modal.css                    overlay + dialog + safe-area
│   └── sigils.css                   per-sigil perpetual animations
├── scripts/
│   ├── app.js                       entry / wiring
│   ├── render.js                    DOM builders + progress math (pure)
│   ├── storage.js                   localStorage + debounced flush
│   ├── router.js                    hash state machine
│   └── reveal.js                    IntersectionObserver wrapper
├── data/
│   └── phases.js                    the content module
├── assets/
│   ├── sigils.svg                   10 <symbol> defs
│   └── fonts/
│       ├── CabinetGrotesk-Variable.woff2
│       └── Geist-Variable.woff2
├── tests/
│   ├── phases.test.js               validates data/phases.js schema
│   ├── storage.test.js              load/save/prune/flush
│   ├── router.test.js               parseHash + close-mode logic
│   └── progress.test.js             ratio & totals computation
└── docs/superpowers/                (specs + plans — already exists)
```

**Decomposition principle:** Pure logic lives in small modules that can be exercised by `node --test` without a DOM. DOM-building lives in `render.js` but progress math is exported as pure functions for testing. CSS is split by concern (tokens, base, layout, tile, modal, sigils) so each file stays under ~200 lines.

---

## Task 1 — Feature branch + scaffolding files

**Files:**
- Create: `README.md`, `TESTING.md`, `package.json`, `vercel.json`, `.vercelignore`
- Create empty directories: `styles/`, `scripts/`, `data/`, `assets/fonts/`, `tests/`

- [ ] **Step 1: Create a feature branch off `main`**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet checkout -b feat/initial-implementation
```

Expected: `Switched to a new branch 'feat/initial-implementation'`.

- [ ] **Step 2: Create the empty working directories**

```bash
mkdir -p /Users/Dinesh/dev/prd-cheatsheet/{styles,scripts,data,assets/fonts,tests}
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "prd-cheatsheet",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

No dependencies. `"type": "module"` so Node treats `.js` files as ES modules (same semantics the browser uses).

- [ ] **Step 4: Write `README.md`**

```markdown
# prd-cheatsheet

A personal cheatsheet for the PRD-to-V1 workflow. Tracks checklist
progress for one greenfield project at a time, persisted in localStorage.
Vanilla HTML / CSS / JS. Deployed static on Vercel.

## Editing content

Checklist content lives in `data/phases.js`. Edit that file and reload.

## Running the logic tests

```
node --test tests/
```

No build step. Open `index.html` in a browser, or run any static server
from the project root.
```

- [ ] **Step 5: Write `TESTING.md`**

```markdown
# TESTING

Manual smoke checklist. Run this after every meaningful change.

## Setup

1. Run `node --test tests/` — all pure-logic tests must pass.
2. Serve the project root (`python3 -m http.server 8080` or any static
   server), then open `http://localhost:8080/`.

## Smoke checks

- [ ] Hero renders with correct `{ticked} / {total}` meter.
- [ ] Tile progress matches localStorage state.
- [ ] Click each phase tile — its modal opens. Verify DOM inspector:
  modal is built on first open, reused afterwards.
- [ ] Deep-link `/#phase-07` opens Phase 07 on load. Close via ×: URL
  loses the hash without navigating away.
- [ ] Deep-link `/#phase-03`: the choice block renders as a radio group.
  Pick one option → prior pick clears. Click inline "clear" — option
  clears. Tile progress updates live.
- [ ] Esc, backdrop click, and × all close the modal.
- [ ] Browser back button closes a grid-opened modal.
- [ ] Task toggle persists across reload.
- [ ] Toggle a checkbox, immediately close the tab, reopen — the toggle
  persisted. Repeat on iOS Safari.
- [ ] Reset flow: click `RESET PROGRESS` → inline confirm → `✓ confirm`
  wipes localStorage and reloads.
- [ ] Phase 07 anti-gate items are tickable, render in warn color rows,
  and do NOT change phase 07 or hero progress.
- [ ] Packet (Artifact Set, Pre-Code Check): toggles update each card's
  progress count; hero meter unaffected.
- [ ] Mobile (`< 768px`) is single-column at 360px / 375px / 390px with
  no horizontal scroll.
- [ ] iOS Safari (portrait and landscape): modal and footer respect
  safe-area insets. No clipped content.
- [ ] `prefers-reduced-motion: reduce` (devtools toggle) disables
  perpetual and reveal animations. Modal fade and hover still work.
- [ ] Full keyboard traversal: Tab through grid, Enter opens a modal,
  Tab inside (arrow keys within radio groups), Esc closes, focus
  returns to the opening tile.
- [ ] `localStorage` blocked (private mode): app functions in-memory,
  footer shows `progress not saved this session`.
- [ ] JavaScript disabled: hero renders, `#phases` shows `<noscript>`
  notice. No console errors visible in the raw HTML.

## Lighthouse (Vercel preview)

Gates:
- Accessibility = 100 (hard gate)
- Best Practices ≥ 95 (hard gate)
- Performance ≥ 80 mobile / ≥ 90 desktop (warn-only, not merge-blocking)
```

- [ ] **Step 6: Write `vercel.json`**

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/assets/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000" }
      ]
    },
    {
      "source": "/styles/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000" }
      ]
    },
    {
      "source": "/",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300, must-revalidate" }
      ]
    }
  ]
}
```

- [ ] **Step 7: Write `.vercelignore`**

```
tests/
docs/
node_modules/
package-lock.json
*.md
!README.md
```

- [ ] **Step 8: Verify Node test runner is available**

```bash
node --version
```

Expected: `v20.x.x` or newer. If older, install a newer Node before proceeding.

- [ ] **Step 9: Run the (empty) test suite**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/
```

Expected: `ℹ tests 0` (no tests yet, but runner works).

- [ ] **Step 10: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add README.md TESTING.md package.json vercel.json .vercelignore
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "chore(scaffold): add config, README, TESTING, empty dirs"
```

---

## Task 2 — Design tokens + base styles

**Files:**
- Create: `styles/tokens.css`
- Create: `styles/base.css`

- [ ] **Step 1: Write `styles/tokens.css`**

Values match spec §7. This is transcription — use these exact values.

```css
:root {
  /* Palette */
  --bg: #F6F6F4;
  --surface: #FFFFFF;
  --surface-shell: rgba(10, 10, 10, 0.025);
  --ink: #0B0B0C;
  --ink-muted: #5B5B5F;
  --ink-faint: #9A9A9D;
  --hairline: rgba(10, 10, 10, 0.06);
  --accent: #2F6F4E;
  --accent-soft: #E7EEE9;
  --warn: #8C3B3B;
  --warn-soft: #F3E7E7;

  /* Shadow */
  --shadow-card:
    0 1px 1px rgba(10, 10, 10, 0.02),
    0 8px 24px -12px rgba(10, 10, 10, 0.08),
    0 24px 48px -24px rgba(10, 10, 10, 0.05);
  --shadow-card-hover:
    0 2px 2px rgba(10, 10, 10, 0.03),
    0 12px 32px -14px rgba(10, 10, 10, 0.12),
    0 32px 64px -24px rgba(10, 10, 10, 0.08);

  /* Spacing — 4px base */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 20px; --s-6: 24px; --s-7: 32px; --s-8: 40px;
  --s-9: 48px; --s-10: 64px; --s-11: 80px; --s-12: 96px;

  /* Radii */
  --r-xl: 32px;
  --r-lg: 26px;
  --r-md: 14px;
  --r-pill: 9999px;

  /* Typography — scale */
  --t-eyebrow-size: 10px;
  --t-eyebrow-track: 0.22em;
  --t-meta-size: 12px;
  --t-body-size: 15px;
  --t-body-lh: 1.55;
  --t-tile-num: clamp(64px, 8vw, 120px);
  --t-h2: clamp(28px, 3.2vw, 44px);
  --t-hero: clamp(56px, 8.5vw, 128px);

  /* Motion */
  --ease-out: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --d-fast: 180ms;
  --d-med: 280ms;
  --d-slow: 700ms;

  /* Fonts */
  --font-display: "Cabinet Grotesk", system-ui, -apple-system, sans-serif;
  --font-body: "Geist", system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

- [ ] **Step 2: Write `styles/base.css`**

```css
/* Reset (minimal — modern browsers only) */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  font-size: var(--t-body-size);
  line-height: var(--t-body-lh);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img, svg, video { display: block; max-width: 100%; }
button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
input, label { font: inherit; color: inherit; }
a { color: inherit; text-decoration: none; }

/* Font-face — self-hosted WOFF2 */
@font-face {
  font-family: "Cabinet Grotesk";
  src: url("../assets/fonts/CabinetGrotesk-Variable.woff2") format("woff2-variations"),
       url("../assets/fonts/CabinetGrotesk-Variable.woff2") format("woff2");
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Geist";
  src: url("../assets/fonts/Geist-Variable.woff2") format("woff2-variations"),
       url("../assets/fonts/Geist-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* Reusable typography classes */
.eyebrow {
  font-family: var(--font-body);
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-faint);
}
.eyebrow--pill {
  display: inline-block;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
  color: var(--ink-muted);
}
.meta { font-size: var(--t-meta-size); color: var(--ink-muted); }

/* Scroll-reveal base state */
.reveal { opacity: 0; transform: translateY(40px); filter: blur(8px); }
.reveal.is-visible {
  opacity: 1; transform: translateY(0); filter: blur(0);
  transition:
    opacity var(--d-slow) var(--ease-out),
    transform var(--d-slow) var(--ease-out),
    filter var(--d-slow) var(--ease-out);
  transition-delay: calc(var(--i, 0) * 60ms);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal.is-visible {
    opacity: 1; transform: none; filter: none; transition: none;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus-visible — visible only on keyboard */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add styles/tokens.css styles/base.css
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(styles): design tokens + base reset + font-face"
```

---

## Task 3 — Self-host fonts

**Files:**
- Create: `assets/fonts/CabinetGrotesk-Variable.woff2`
- Create: `assets/fonts/Geist-Variable.woff2`

- [ ] **Step 1: Download Geist Variable WOFF2**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet/assets/fonts
curl -L -o Geist-Variable.woff2 \
  "https://cdn.jsdelivr.net/npm/geist@1.4.2/dist/fonts/geist-sans/Geist-Variable.woff2"
ls -lh Geist-Variable.woff2
```

Expected: file present, ~60–80 KB.

If the URL 404s (version changed), substitute the latest version from
`https://www.npmjs.com/package/geist`.

- [ ] **Step 2: Download Cabinet Grotesk Variable**

Cabinet Grotesk is distributed as a zip by Fontshare. Download manually:

1. Visit `https://www.fontshare.com/fonts/cabinet-grotesk`.
2. Click "Download Family" — you get a zip.
3. Unzip and copy `CabinetGrotesk-Variable.woff2` into
   `/Users/Dinesh/dev/prd-cheatsheet/assets/fonts/`.

If you can't do the interactive download, stop here and ask Dinesh to
provide the file. Do NOT substitute a different grotesk — the visual
system is tuned for this specific face.

- [ ] **Step 3: Verify the two files load**

Open `/Users/Dinesh/dev/prd-cheatsheet/assets/fonts/` in Finder. Both files
should be present, each 60–100 KB. Total font payload target: under 150 KB
combined.

```bash
du -h /Users/Dinesh/dev/prd-cheatsheet/assets/fonts/*.woff2
```

- [ ] **Step 4: Commit the font binaries**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add assets/fonts/
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(assets): self-host Cabinet Grotesk and Geist variable fonts"
```

---

## Task 4 — Phases data module + validator test (TDD)

**Files:**
- Create: `tests/phases.test.js`
- Create: `data/phases.js`

The data module is the single source of truth for content. The validator
test enforces the schema so future edits can't silently break it.

- [ ] **Step 1: Write the validator test first**

Create `tests/phases.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHEATSHEET } from "../data/phases.js";

const VALID_KINDS = new Set(["task", "choice"]);

function collectIds(cheatsheet) {
  const ids = [];
  const visit = (arr) => {
    for (const item of arr) {
      ids.push(item.id);
      if (item.kind === "choice") {
        for (const opt of item.options) ids.push(opt.id);
      }
    }
  };
  for (const phase of cheatsheet.phases) {
    ids.push(phase.id);
    visit(phase.items);
    if (phase.gate) visit(phase.gate.items);
    if (phase.antiGate) visit(phase.antiGate.items);
  }
  visit(cheatsheet.extras.artifactSet.items);
  visit(cheatsheet.extras.preCodeCheck.items);
  return ids;
}

function validateItems(items, location) {
  for (const item of items) {
    assert.ok(item.id, `${location}: item missing id`);
    assert.match(item.id, /^[a-z0-9-]+$/, `${location}: bad id format`);
    const kind = item.kind ?? "task";
    assert.ok(VALID_KINDS.has(kind), `${location}: invalid kind ${kind}`);
    if (kind === "task") {
      assert.ok(item.text, `${location}: task ${item.id} missing text`);
    }
    if (kind === "choice") {
      assert.ok(item.text, `${location}: choice ${item.id} missing text`);
      assert.ok(
        Array.isArray(item.options) && item.options.length > 0,
        `${location}: choice ${item.id} missing options[]`
      );
      for (const opt of item.options) {
        assert.ok(opt.id, `${location}: choice ${item.id} option missing id`);
        assert.ok(opt.text, `${location}: choice ${item.id} option missing text`);
      }
    }
  }
}

test("has 10 phases, in order 01..10", () => {
  assert.equal(CHEATSHEET.phases.length, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(CHEATSHEET.phases[i].id, String(i + 1).padStart(2, "0"));
  }
});

test("every phase has id, title, subtitle, sigilId, items[]", () => {
  for (const phase of CHEATSHEET.phases) {
    assert.ok(phase.title, `phase ${phase.id}: missing title`);
    assert.ok(phase.subtitle, `phase ${phase.id}: missing subtitle`);
    assert.ok(phase.sigilId, `phase ${phase.id}: missing sigilId`);
    assert.ok(Array.isArray(phase.items), `phase ${phase.id}: items not array`);
    assert.ok(phase.items.length > 0, `phase ${phase.id}: items empty`);
  }
});

test("only phase 07 has antiGate", () => {
  for (const phase of CHEATSHEET.phases) {
    if (phase.id === "07") {
      assert.ok(phase.antiGate, "phase 07: antiGate missing");
      assert.ok(Array.isArray(phase.antiGate.items));
      assert.ok(phase.antiGate.items.length > 0);
    } else {
      assert.equal(phase.antiGate, undefined, `phase ${phase.id}: unexpected antiGate`);
    }
  }
});

test("phases 09 and 10 have no gate; 01-06 and 08 do", () => {
  const withGate = new Set(["01", "02", "03", "04", "05", "06", "08"]);
  for (const phase of CHEATSHEET.phases) {
    if (withGate.has(phase.id)) {
      assert.ok(phase.gate, `phase ${phase.id}: gate missing`);
      assert.ok(Array.isArray(phase.gate.items));
    } else {
      assert.equal(phase.gate, undefined, `phase ${phase.id}: unexpected gate`);
    }
  }
});

test("every item has a valid id + kind + text (or options for choice)", () => {
  for (const phase of CHEATSHEET.phases) {
    validateItems(phase.items, `phase ${phase.id}.items`);
    if (phase.gate) validateItems(phase.gate.items, `phase ${phase.id}.gate`);
    if (phase.antiGate) validateItems(phase.antiGate.items, `phase ${phase.id}.antiGate`);
  }
  validateItems(CHEATSHEET.extras.artifactSet.items, "extras.artifactSet");
  validateItems(CHEATSHEET.extras.preCodeCheck.items, "extras.preCodeCheck");
});

test("no duplicate ids anywhere in the tree", () => {
  const ids = collectIds(CHEATSHEET);
  const seen = new Set();
  const dupes = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  assert.deepEqual(dupes, [], `duplicate ids: ${dupes.join(", ")}`);
});

test("phase 03 contains a choice item for delivery model", () => {
  const p3 = CHEATSHEET.phases.find((p) => p.id === "03");
  const choice = p3.items.find((it) => it.kind === "choice");
  assert.ok(choice, "phase 03: expected a choice item");
  assert.ok(choice.options.length >= 2);
});

test("extras has artifactSet and preCodeCheck with non-empty items", () => {
  assert.ok(CHEATSHEET.extras.artifactSet.items.length > 0);
  assert.ok(CHEATSHEET.extras.preCodeCheck.items.length > 0);
});
```

- [ ] **Step 2: Run the test — expect failure (data file missing)**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/phases.test.js
```

Expected: `ERR_MODULE_NOT_FOUND` for `../data/phases.js`.

- [ ] **Step 3: Transcribe `/Users/Dinesh/Desktop/checklist.md` into `data/phases.js`**

Read the source file first — it's the authoritative content. Every `- [ ]`
checkbox in the source becomes one entry in the data model. Follow the
rules in the spec §5.2:

- Every item carries `kind: "task"` (explicit, not defaulted).
- Phase 03's `Choose the delivery model:` block (6 sub-options) becomes
  a single `kind: "choice"` entry with `options[]`.
- Phase 02's `Challenge the PRD with "break questions":` — drop the parent
  checkbox; flatten the 5 sub-questions as 5 top-level tasks.
- Phase 07's `Do not scaffold if` section becomes `antiGate.items[]`
  (still `kind: "task"`; positional-only semantics).
- Phases 01–06 and 08 keep their `Gate to move on` as `gate.items[]`.
- Phase 09 has no gate. Phase 10 has no gate.
- `subtitle` is a one-line paraphrase of the phase's intent — use these
  exact subtitles:

```
01 → "Make the PRD legible before planning."
02 → "Pin the V1 boundary and surface risk."
03 → "Commit to the hard-to-reverse technical decisions."
04 → "Produce the planning packet before any code."
05 → "Run the small spikes that de-risk the design."
06 → "Translate design into executable, ordered slices."
07 → "Verify scaffold readiness — or don't scaffold."
08 → "Land the repo into a governed system."
09 → "Build V1 against the scoped backlog only."
10 → "Verify V1 against acceptance criteria; cut drift."
```

Use these sigil ids: `sigil-01` through `sigil-10` matching phase numbers.

Create `data/phases.js`:

```js
// Single source of truth for cheatsheet content.
// See docs/superpowers/specs/2026-04-18-prd-cheatsheet-design.md §5.2.
// Transcribed from /Users/Dinesh/Desktop/checklist.md.

export const CHEATSHEET = {
  phases: [
    {
      id: "01",
      title: "Triage the Rough PRD",
      subtitle: "Make the PRD legible before planning.",
      sigilId: "sigil-01",
      items: [
        { id: "p01-i01", kind: "task", text: "Re-read the PRD and rewrite the core problem in 1–2 sentences" },
        { id: "p01-i02", kind: "task", text: "Identify the target user and their main pain/problem" },
        { id: "p01-i03", kind: "task", text: "Define the exact outcome the product is supposed to create" },
        { id: "p01-i04", kind: "task", text: "Write down success criteria for V1" },
        { id: "p01-i05", kind: "task", text: "Mark what is unclear, vague, or hand-wavy" },
        { id: "p01-i06", kind: "task", text: "Add an explicit non-goals / out-of-scope section" },
        { id: "p01-i07", kind: "task", text: "Add explicit constraints: platform, budget, deadline, compliance, performance, reliability" },
        { id: "p01-i08", kind: "task", text: "Separate requirements from assumptions" },
        { id: "p01-i09", kind: "task", text: "List all open questions that would block planning" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p01-g01", kind: "task", text: "PRD clearly states: problem, user, value, V1 scope, constraints, success criteria" },
          { id: "p01-g02", kind: "task", text: "No major requirement is still ambiguous" },
          { id: "p01-g03", kind: "task", text: "Non-goals exist" },
        ],
      },
    },
    {
      id: "02",
      title: "Clarify Scope and Remove Ambiguity",
      subtitle: "Pin the V1 boundary and surface risk.",
      sigilId: "sigil-02",
      items: [
        { id: "p02-i01", kind: "task", text: "Create a clarified scope doc" },
        { id: "p02-i02", kind: "task", text: "Define the smallest V1 that still proves the product claim" },
        { id: "p02-i03", kind: "task", text: "Write a one-paragraph V1 scope statement" },
        { id: "p02-i04", kind: "task", text: "Write a one-paragraph non-goals statement" },
        { id: "p02-i05", kind: "task", text: "Create an assumptions log" },
        { id: "p02-i06", kind: "task", text: "Create an unknowns log" },
        { id: "p02-i07", kind: "task", text: "Create a risk register" },
        { id: "p02-i08", kind: "task", text: "Create an edge-case list" },
        { id: "p02-i09", kind: "task", text: "Create a dependency list for vendors, APIs, services, packages, and data sources" },
        { id: "p02-i10", kind: "task", text: "Decide the release posture: prototype, internal tool, beta, or production-first" },
        // The parent "Challenge the PRD with break questions:" is dropped; the 5 sub-questions are flattened:
        { id: "p02-i11", kind: "task", text: "Break question: What could make this late?" },
        { id: "p02-i12", kind: "task", text: "Break question: What could make this expensive?" },
        { id: "p02-i13", kind: "task", text: "Break question: What could make this unsafe?" },
        { id: "p02-i14", kind: "task", text: "Break question: What could make this much broader than expected?" },
        { id: "p02-i15", kind: "task", text: "Break question: What could force an architectural rewrite later?" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p02-g01", kind: "task", text: "V1 boundary is sharp and explainable" },
          { id: "p02-g02", kind: "task", text: "Assumptions, risks, and unknowns are explicit" },
          { id: "p02-g03", kind: "task", text: "Edge cases and dependencies are visible" },
          { id: "p02-g04", kind: "task", text: "Out-of-scope is locked" },
        ],
      },
    },
    {
      id: "03",
      title: "Decide the Technical Shape",
      subtitle: "Commit to the hard-to-reverse technical decisions.",
      sigilId: "sigil-03",
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
        { id: "p03-i02", kind: "task", text: "Choose the package manager/build tool" },
        { id: "p03-i03", kind: "task", text: "Choose the hosting/deployment model" },
        { id: "p03-i04", kind: "task", text: "Choose the auth strategy" },
        { id: "p03-i05", kind: "task", text: "Choose the database/storage model" },
        { id: "p03-i06", kind: "task", text: "Define the environment model: local, preview, staging, prod" },
        { id: "p03-i07", kind: "task", text: "Define config and secrets strategy" },
        { id: "p03-i08", kind: "task", text: "Decide logging/metrics/tracing baseline" },
        { id: "p03-i09", kind: "task", text: "Decide CI baseline" },
        { id: "p03-i10", kind: "task", text: "Decide testing baseline" },
        { id: "p03-i11", kind: "task", text: "Decide rollback/recovery posture" },
        { id: "p03-i12", kind: "task", text: "Decide repo structure at a top-level" },
        { id: "p03-i13", kind: "task", text: "Decide which technical decisions are locked now vs. flexible later" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p03-g01", kind: "task", text: "All hard-to-reverse decisions are explicit" },
          { id: "p03-g02", kind: "task", text: "Repo shape is now justified by architecture" },
          { id: "p03-g03", kind: "task", text: "No major infra/auth/data choice is still floating" },
        ],
      },
    },
    {
      id: "04",
      title: "Produce the Pre-Scaffold Artifact Pack",
      subtitle: "Produce the planning packet before any code.",
      sigilId: "sigil-04",
      items: [
        { id: "p04-i01", kind: "task", text: "Finalize the planning-grade PRD / functional spec" },
        { id: "p04-i02", kind: "task", text: "Write the technical design doc" },
        { id: "p04-i03", kind: "task", text: "Create ADRs for major irreversible decisions" },
        { id: "p04-i04", kind: "task", text: "Draw a system/context diagram" },
        { id: "p04-i05", kind: "task", text: "Draw a container/deployment diagram if needed" },
        { id: "p04-i06", kind: "task", text: "Draw a sequence diagram for the most important flow if needed" },
        { id: "p04-i07", kind: "task", text: "Create a logical data model / ERD if data is non-trivial" },
        { id: "p04-i08", kind: "task", text: "Define API contracts / payload shapes / error behavior if applicable" },
        { id: "p04-i09", kind: "task", text: "Create PoC / spike notes for risky unknowns" },
        { id: "p04-i10", kind: "task", text: "Write a testing strategy" },
        { id: "p04-i11", kind: "task", text: "Write an observability plan" },
        { id: "p04-i12", kind: "task", text: "Write a release and rollback note" },
        { id: "p04-i13", kind: "task", text: "Write a repo standards note" },
        { id: "p04-i14", kind: "task", text: "Write a local dev setup plan" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p04-g01", kind: "task", text: "You have one complete planning packet" },
          { id: "p04-g02", kind: "task", text: "Future-you could understand the system without guessing" },
          { id: "p04-g03", kind: "task", text: "Major decisions are documented, not just remembered" },
        ],
      },
    },
    {
      id: "05",
      title: "Retire Critical Unknowns",
      subtitle: "Run the small spikes that de-risk the design.",
      sigilId: "sigil-05",
      items: [
        { id: "p05-i01", kind: "task", text: "Identify every assumption that could invalidate the architecture" },
        { id: "p05-i02", kind: "task", text: "Run small spikes/PoCs only for those risks" },
        { id: "p05-i03", kind: "task", text: "Validate auth feasibility" },
        { id: "p05-i04", kind: "task", text: "Validate third-party API constraints/pricing/limits" },
        { id: "p05-i05", kind: "task", text: "Validate deployment/runtime viability" },
        { id: "p05-i06", kind: "task", text: "Validate any unusual data or performance constraints" },
        { id: "p05-i07", kind: "task", text: "Record findings and update design docs/ADRs" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p05-g01", kind: "task", text: "High-risk unknowns are either validated or intentionally deferred" },
          { id: "p05-g02", kind: "task", text: "No critical technical question remains hidden behind 'we'll figure it out in code'" },
        ],
      },
    },
    {
      id: "06",
      title: "Translate Design into Executable Work",
      subtitle: "Translate design into executable, ordered slices.",
      sigilId: "sigil-06",
      items: [
        { id: "p06-i01", kind: "task", text: "Break V1 into vertical slices" },
        { id: "p06-i02", kind: "task", text: "Order slices by dependency and risk" },
        { id: "p06-i03", kind: "task", text: "Define acceptance criteria for each slice" },
        { id: "p06-i04", kind: "task", text: "Define a project-level Definition of Done" },
        { id: "p06-i05", kind: "task", text: "Decide milestone boundaries" },
        { id: "p06-i06", kind: "task", text: "Identify which slice should be built first" },
        { id: "p06-i07", kind: "task", text: "Confirm each first-slice task is small enough to complete cleanly" },
        { id: "p06-i08", kind: "task", text: "Confirm slices map back to V1 scope only" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p06-g01", kind: "task", text: "First slices are implementation-ready" },
          { id: "p06-g02", kind: "task", text: "Each slice has acceptance criteria" },
          { id: "p06-g03", kind: "task", text: "The backlog reflects the design, not random ideas" },
        ],
      },
    },
    {
      id: "07",
      title: "Run the Scaffold Readiness Review",
      subtitle: "Verify scaffold readiness — or don't scaffold.",
      sigilId: "sigil-07",
      items: [
        { id: "p07-i01", kind: "task", text: "Confirm PRD and technical design agree" },
        { id: "p07-i02", kind: "task", text: "Confirm V1 scope is locked" },
        { id: "p07-i03", kind: "task", text: "Confirm no one-way-door decision is still unresolved" },
        { id: "p07-i04", kind: "task", text: "Confirm repo topology is known" },
        { id: "p07-i05", kind: "task", text: "Confirm local dev approach is known" },
        { id: "p07-i06", kind: "task", text: "Confirm CI baseline is known" },
        { id: "p07-i07", kind: "task", text: "Confirm security baseline is known" },
        { id: "p07-i08", kind: "task", text: "Confirm config/env/secrets strategy is known" },
        { id: "p07-i09", kind: "task", text: "Confirm testing and observability baseline is known" },
        { id: "p07-i10", kind: "task", text: "Confirm first slices are ready to implement" },
      ],
      antiGate: {
        label: "Do not scaffold if",
        items: [
          { id: "p07-a01", kind: "task", text: "You are still debating major stack choices" },
          { id: "p07-a02", kind: "task", text: "You still do not know how auth works" },
          { id: "p07-a03", kind: "task", text: "You still do not know how secrets/config will work" },
          { id: "p07-a04", kind: "task", text: "You still expect coding to clarify requirements" },
          { id: "p07-a05", kind: "task", text: "You expect the repo layout to change in week one" },
        ],
      },
    },
    {
      id: "08",
      title: "Initialize the Repo Scaffold",
      subtitle: "Land the repo into a governed system.",
      sigilId: "sigil-08",
      items: [
        { id: "p08-i01", kind: "task", text: "Create the repository" },
        { id: "p08-i02", kind: "task", text: "Add README, LICENSE, and docs index" },
        { id: "p08-i03", kind: "task", text: "Add the planning docs folder" },
        { id: "p08-i04", kind: "task", text: "Add the ADR folder" },
        { id: "p08-i05", kind: "task", text: "Add diagrams folder" },
        { id: "p08-i06", kind: "task", text: "Create top-level directories based on the chosen architecture" },
        { id: "p08-i07", kind: "task", text: "Pin runtime/toolchain versions" },
        { id: "p08-i08", kind: "task", text: "Add formatter/linter/static analysis config" },
        { id: "p08-i09", kind: "task", text: "Add baseline test runner setup" },
        { id: "p08-i10", kind: "task", text: "Add local bootstrap path" },
        { id: "p08-i11", kind: "task", text: "Add env/config conventions" },
        { id: "p08-i12", kind: "task", text: "Add secrets handling conventions" },
        { id: "p08-i13", kind: "task", text: "Add CI workflow(s)" },
        { id: "p08-i14", kind: "task", text: "Enable dependency update tooling" },
        { id: "p08-i15", kind: "task", text: "Enable security scanning / secret scanning / dependency review as appropriate" },
        { id: "p08-i16", kind: "task", text: "Add branch protections / repo rules if applicable" },
        { id: "p08-i17", kind: "task", text: "Add release/deploy skeleton" },
        { id: "p08-i18", kind: "task", text: "Add observability/logging conventions" },
        { id: "p08-i19", kind: "task", text: "Add scripts/tasks needed for local setup and validation" },
      ],
      gate: {
        label: "Gate to move on",
        items: [
          { id: "p08-g01", kind: "task", text: "The repo is ready for code to land into a governed system" },
          { id: "p08-g02", kind: "task", text: "Standards are enforced before feature work begins" },
          { id: "p08-g03", kind: "task", text: "The repo does not need immediate restructuring" },
        ],
      },
    },
    {
      id: "09",
      title: "Start V1 Implementation",
      subtitle: "Build V1 against the scoped backlog only.",
      sigilId: "sigil-09",
      items: [
        { id: "p09-i01", kind: "task", text: "Begin with the smallest meaningful vertical slice" },
        { id: "p09-i02", kind: "task", text: "Implement only against the scoped V1 backlog" },
        { id: "p09-i03", kind: "task", text: "Keep acceptance criteria visible while building" },
        { id: "p09-i04", kind: "task", text: "Update ADRs if any major decision changes" },
        { id: "p09-i05", kind: "task", text: "Keep docs and contracts in sync with reality" },
        { id: "p09-i06", kind: "task", text: "Avoid sneaking in unplanned architecture changes mid-build" },
      ],
    },
    {
      id: "10",
      title: "Close V1",
      subtitle: "Verify V1 against acceptance criteria; cut drift.",
      sigilId: "sigil-10",
      items: [
        { id: "p10-i01", kind: "task", text: "Verify every V1 requirement against acceptance criteria" },
        { id: "p10-i02", kind: "task", text: "Verify Definition of Done is met" },
        { id: "p10-i03", kind: "task", text: "Verify observability/logging are sufficient" },
        { id: "p10-i04", kind: "task", text: "Verify rollback/recovery path exists" },
        { id: "p10-i05", kind: "task", text: "Verify docs reflect shipped behavior" },
        { id: "p10-i06", kind: "task", text: "Cut anything that drifted beyond V1 scope" },
        { id: "p10-i07", kind: "task", text: "Produce a V1 release note / summary" },
        { id: "p10-i08", kind: "task", text: "Mark post-V1 ideas separately instead of expanding the release" },
      ],
    },
  ],
  extras: {
    artifactSet: {
      title: "Minimal Artifact Set",
      items: [
        { id: "x-art-01", kind: "task", text: "Planning-grade PRD" },
        { id: "x-art-02", kind: "task", text: "Clarified scope + non-goals" },
        { id: "x-art-03", kind: "task", text: "Assumptions/risks/unknowns log" },
        { id: "x-art-04", kind: "task", text: "Technical design doc" },
        { id: "x-art-05", kind: "task", text: "ADRs for major decisions" },
        { id: "x-art-06", kind: "task", text: "Key diagram(s)" },
        { id: "x-art-07", kind: "task", text: "API/data contracts if relevant" },
        { id: "x-art-08", kind: "task", text: "PoC notes for risky unknowns" },
        { id: "x-art-09", kind: "task", text: "Backlog with vertical slices" },
        { id: "x-art-10", kind: "task", text: "Acceptance criteria" },
        { id: "x-art-11", kind: "task", text: "Definition of Done" },
        { id: "x-art-12", kind: "task", text: "Repo standards + local dev plan" },
        { id: "x-art-13", kind: "task", text: "Testing / observability / rollback notes" },
      ],
    },
    preCodeCheck: {
      title: "Final Pre-Code Check",
      items: [
        { id: "x-pcc-01", kind: "task", text: "I know exactly what V1 is" },
        { id: "x-pcc-02", kind: "task", text: "I know exactly what V1 is not" },
        { id: "x-pcc-03", kind: "task", text: "I know what can break the project" },
        { id: "x-pcc-04", kind: "task", text: "I know the technical shape of the system" },
        { id: "x-pcc-05", kind: "task", text: "I know which decisions are locked" },
        { id: "x-pcc-06", kind: "task", text: "I have validated risky unknowns" },
        { id: "x-pcc-07", kind: "task", text: "I have a ready backlog" },
        { id: "x-pcc-08", kind: "task", text: "I know how the repo should be structured" },
        { id: "x-pcc-09", kind: "task", text: "I know how local dev, CI, secrets, testing, and release basics will work" },
        { id: "x-pcc-10", kind: "task", text: "I can scaffold without likely rework in week one" },
      ],
    },
  },
};
```

- [ ] **Step 4: Run tests again — all pass**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/phases.test.js
```

Expected: all 8 tests pass. If any fail, fix the data (not the test — the test encodes spec invariants).

- [ ] **Step 5: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add data/phases.js tests/phases.test.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(data): add phases content module + schema validator"
```

---

## Task 5 — Storage module (TDD)

**Files:**
- Create: `tests/storage.test.js`
- Create: `scripts/storage.js`

`storage.js` owns the localStorage contract. Pure functions (`prune`,
`validIdSet`) tested in Node; stateful functions (`load`, `flush`,
`scheduleSave`) tested by injecting a storage shim.

- [ ] **Step 1: Write `tests/storage.test.js` first**

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prune, validIdSetFrom, createStorage } from "../scripts/storage.js";
import { CHEATSHEET } from "../data/phases.js";

describe("validIdSetFrom", () => {
  test("collects every tickable id", () => {
    const ids = validIdSetFrom(CHEATSHEET);
    assert.ok(ids.has("p01-i01"));
    assert.ok(ids.has("p01-g01"));
    assert.ok(ids.has("p03-c01"));
    assert.ok(ids.has("p07-a01"));
    assert.ok(ids.has("x-art-01"));
    assert.ok(ids.has("x-pcc-01"));
  });

  test("collects choice option ids too", () => {
    const ids = validIdSetFrom(CHEATSHEET);
    assert.ok(ids.has("p03-c01-o01"));
    assert.ok(ids.has("p03-c01-o06"));
  });

  test("does not include phase ids themselves", () => {
    const ids = validIdSetFrom(CHEATSHEET);
    assert.equal(ids.has("01"), false);
  });
});

describe("prune", () => {
  test("drops orphaned keys", () => {
    const state = { checks: { "p01-i01": true, "legacy-xyz": true }, schemaVersion: 1 };
    const validIds = new Set(["p01-i01"]);
    prune(state, validIds);
    assert.deepEqual(state.checks, { "p01-i01": true });
  });

  test("keeps a choice pick whose option is still valid", () => {
    const state = { checks: { "p03-c01": "p03-c01-o02" }, schemaVersion: 1 };
    const validIds = new Set(["p03-c01", "p03-c01-o02"]);
    prune(state, validIds);
    assert.equal(state.checks["p03-c01"], "p03-c01-o02");
  });

  test("drops a choice pick whose option no longer exists", () => {
    const state = { checks: { "p03-c01": "p03-c01-o99" }, schemaVersion: 1 };
    const validIds = new Set(["p03-c01"]); // option o99 missing
    prune(state, validIds);
    assert.equal(state.checks["p03-c01"], undefined);
  });

  test("is a no-op when nothing is stale", () => {
    const state = { checks: { "p01-i01": true }, schemaVersion: 1 };
    const validIds = new Set(["p01-i01"]);
    prune(state, validIds);
    assert.deepEqual(state.checks, { "p01-i01": true });
  });
});

describe("createStorage(shim)", () => {
  function makeShim(initial = {}) {
    let store = { ...initial };
    let throwOnSet = false;
    return {
      get store() { return store; },
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        if (throwOnSet) throw new DOMException("quota", "QuotaExceededError");
        store[k] = v;
      },
      removeItem: (k) => { delete store[k]; },
      breakWrites: () => { throwOnSet = true; },
    };
  }

  test("load() returns a default state when nothing stored", () => {
    const shim = makeShim();
    const s = createStorage(shim);
    const state = s.load();
    assert.deepEqual(state, { checks: {}, schemaVersion: 1 });
  });

  test("load() returns stored state when present and valid", () => {
    const stored = JSON.stringify({ checks: { "p01-i01": true }, schemaVersion: 1 });
    const shim = makeShim({ "prd-cheatsheet.v1.state": stored });
    const s = createStorage(shim);
    const state = s.load();
    assert.equal(state.checks["p01-i01"], true);
  });

  test("load() discards on schemaVersion mismatch", () => {
    const stored = JSON.stringify({ checks: { x: 1 }, schemaVersion: 99 });
    const shim = makeShim({ "prd-cheatsheet.v1.state": stored });
    const s = createStorage(shim);
    const state = s.load();
    assert.deepEqual(state, { checks: {}, schemaVersion: 1 });
  });

  test("load() discards on malformed JSON", () => {
    const shim = makeShim({ "prd-cheatsheet.v1.state": "not-json" });
    const s = createStorage(shim);
    const state = s.load();
    assert.deepEqual(state, { checks: {}, schemaVersion: 1 });
  });

  test("flush() writes JSON with updatedAt", () => {
    const shim = makeShim();
    const s = createStorage(shim);
    const state = s.load();
    state.checks["p01-i01"] = true;
    s.scheduleSave(state);
    s.flush(state); // synchronous flush
    const raw = shim.getItem("prd-cheatsheet.v1.state");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.checks["p01-i01"], true);
    assert.ok(parsed.updatedAt);
  });

  test("flush() degrades gracefully on quota / security errors", () => {
    const shim = makeShim();
    shim.breakWrites();
    const s = createStorage(shim);
    let noticeCount = 0;
    s.onPersistenceError(() => noticeCount++);
    const state = s.load();
    state.checks["p01-i01"] = true;
    s.scheduleSave(state);
    s.flush(state);
    assert.equal(noticeCount, 1);
    assert.equal(shim.getItem("prd-cheatsheet.v1.state"), null);
  });

  test("flush() is a no-op when nothing is pending", () => {
    const shim = makeShim();
    const s = createStorage(shim);
    s.flush({ checks: {}, schemaVersion: 1 });
    assert.equal(shim.getItem("prd-cheatsheet.v1.state"), null);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/storage.test.js
```

Expected: module-not-found for `../scripts/storage.js`.

- [ ] **Step 3: Implement `scripts/storage.js`**

```js
// localStorage-backed persistence. See spec §5.2 + §8.4.

const KEY = "prd-cheatsheet.v1.state";
const CURRENT_SCHEMA = 1;
const DEBOUNCE_MS = 200;

function defaultState() {
  return { checks: {}, schemaVersion: CURRENT_SCHEMA };
}

export function validIdSetFrom(cheatsheet) {
  const ids = new Set();
  const visit = (arr) => {
    for (const item of arr) {
      ids.add(item.id);
      if (item.kind === "choice") {
        for (const opt of item.options) ids.add(opt.id);
      }
    }
  };
  for (const phase of cheatsheet.phases) {
    visit(phase.items);
    if (phase.gate) visit(phase.gate.items);
    if (phase.antiGate) visit(phase.antiGate.items);
  }
  visit(cheatsheet.extras.artifactSet.items);
  visit(cheatsheet.extras.preCodeCheck.items);
  return ids;
}

export function prune(state, validIds) {
  const checks = state.checks;
  for (const id of Object.keys(checks)) {
    if (!validIds.has(id)) {
      delete checks[id];
      continue;
    }
    const value = checks[id];
    // A choice pick is stored as string (option id). Drop if the option is gone.
    if (typeof value === "string" && !validIds.has(value)) {
      delete checks[id];
    }
  }
}

export function createStorage(storage = globalThis.localStorage) {
  let timer = null;
  let pending = false;
  let onError = null;

  function load() {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== CURRENT_SCHEMA) return defaultState();
      if (!parsed.checks || typeof parsed.checks !== "object") return defaultState();
      return parsed;
    } catch {
      return defaultState();
    }
  }

  function scheduleSave(state) {
    pending = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => flush(state), DEBOUNCE_MS);
  }

  function flush(state) {
    if (!pending) return;
    pending = false;
    if (timer) { clearTimeout(timer); timer = null; }
    state.updatedAt = new Date().toISOString();
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      if (onError) onError(err);
    }
  }

  function wipe() {
    pending = false;
    if (timer) { clearTimeout(timer); timer = null; }
    try { storage.removeItem(KEY); } catch { /* ignore */ }
  }

  function onPersistenceError(cb) {
    onError = cb;
  }

  return { load, scheduleSave, flush, wipe, onPersistenceError };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/storage.test.js
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/storage.js tests/storage.test.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(storage): localStorage wrapper with prune + debounced flush"
```

---

## Task 6 — Router module (TDD)

**Files:**
- Create: `tests/router.test.js`
- Create: `scripts/router.js`

Pure logic here is `parseHash(hash, validPhaseIds) → { kind, phaseId }`.
The open/close state machine is also testable by injecting a history shim.

- [ ] **Step 1: Write `tests/router.test.js`**

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseHash, createRouter } from "../scripts/router.js";

const validPhases = new Set(["01","02","03","04","05","06","07","08","09","10"]);

describe("parseHash", () => {
  test("empty → grid", () => {
    assert.deepEqual(parseHash("", validPhases), { kind: "grid" });
    assert.deepEqual(parseHash("#", validPhases), { kind: "grid" });
  });
  test("#phase-07 → phase open", () => {
    assert.deepEqual(parseHash("#phase-07", validPhases), { kind: "phase", phaseId: "07" });
  });
  test("uppercase PHASE works", () => {
    assert.deepEqual(parseHash("#PHASE-03", validPhases), { kind: "phase", phaseId: "03" });
  });
  test("bogus hash → invalid", () => {
    assert.deepEqual(parseHash("#garbage", validPhases), { kind: "invalid" });
  });
  test("out-of-range phase → invalid", () => {
    assert.deepEqual(parseHash("#phase-99", validPhases), { kind: "invalid" });
  });
  test("phase-1 without zero-pad → invalid (strict)", () => {
    assert.deepEqual(parseHash("#phase-1", validPhases), { kind: "invalid" });
  });
});

describe("createRouter(historyShim, locationShim)", () => {
  function makeHistoryShim() {
    const stack = [{ state: null, url: "/" }];
    const listeners = new Set();
    return {
      get length() { return stack.length; },
      pushState(state, _title, url) { stack.push({ state, url }); },
      replaceState(state, _title, url) { stack[stack.length - 1] = { state, url }; },
      back() {
        if (stack.length > 1) stack.pop();
        for (const l of listeners) l();
      },
      addListener(cb) { listeners.add(cb); },
      get top() { return stack[stack.length - 1]; },
    };
  }

  test("openFromTile pushes history and marks pushed=true", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("03");
    assert.equal(hist.top.url, "#phase-03");
    assert.equal(r.isCurrentPushed(), true);
  });

  test("openFromDeepLink does NOT push (pushed=false)", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "#phase-07", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromDeepLink("07");
    // no push — history length unchanged
    assert.equal(hist.length, 1);
    assert.equal(r.isCurrentPushed(), false);
  });

  test("close after push uses history.back", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("03");
    assert.equal(hist.length, 2);
    r.close();
    assert.equal(hist.length, 1);
  });

  test("close after deep-link uses replaceState to drop hash", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "#phase-07", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromDeepLink("07");
    r.close();
    assert.equal(hist.top.url, "/");
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/router.test.js
```

- [ ] **Step 3: Implement `scripts/router.js`**

```js
// Hash-based routing for phase modals. See spec §8.3.

const HASH_RE = /^#phase-(\d{2})$/i;

export function parseHash(hash, validPhaseIds) {
  if (!hash || hash === "#") return { kind: "grid" };
  const match = HASH_RE.exec(hash);
  if (!match) return { kind: "invalid" };
  const phaseId = match[1];
  if (!validPhaseIds.has(phaseId)) return { kind: "invalid" };
  return { kind: "phase", phaseId };
}

export function createRouter(history = globalThis.history, location = globalThis.location) {
  // Track whether the currently-open modal was reached via our own pushState
  // (tile click), or via a direct deep-link (browser URL bar).
  let currentPushed = false;

  function openFromTile(phaseId) {
    history.pushState({ modal: phaseId }, "", `#phase-${phaseId}`);
    currentPushed = true;
  }

  function openFromDeepLink(phaseId) {
    // History entry already exists (the page load). Don't push.
    currentPushed = false;
  }

  function close() {
    if (currentPushed) {
      history.back();
    } else {
      // Deep-link open: drop the hash without navigating.
      const url = location.pathname + (location.search || "");
      history.replaceState(null, "", url);
    }
    currentPushed = false;
  }

  function clearInvalidHash() {
    const url = location.pathname + (location.search || "");
    history.replaceState(null, "", url);
  }

  function isCurrentPushed() { return currentPushed; }
  function resetPushed() { currentPushed = false; }

  return { openFromTile, openFromDeepLink, close, clearInvalidHash, isCurrentPushed, resetPushed };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/router.test.js
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/router.js tests/router.test.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(router): hash parser + push-vs-deep-link close logic"
```

---

## Task 7 — Progress math (TDD)

**Files:**
- Create: `tests/progress.test.js`
- Create: `scripts/progress.js`

Extract progress math into its own small module so tests can hit it without
touching the DOM. `render.js` later imports from here.

- [ ] **Step 1: Write `tests/progress.test.js`**

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  countablePhaseUnits,
  tickedPhaseUnits,
  phaseRatio,
  sectionRatio,
  heroTotals,
  isItemTicked,
} from "../scripts/progress.js";
import { CHEATSHEET } from "../data/phases.js";

const p01 = CHEATSHEET.phases.find((p) => p.id === "01");
const p03 = CHEATSHEET.phases.find((p) => p.id === "03");
const p07 = CHEATSHEET.phases.find((p) => p.id === "07");
const p09 = CHEATSHEET.phases.find((p) => p.id === "09");

describe("countablePhaseUnits", () => {
  test("counts items + gate items, choice as 1, antiGate excluded", () => {
    // p01: 9 items + 3 gate = 12
    assert.equal(countablePhaseUnits(p01), 12);
    // p03: 14 items (13 tasks + 1 choice) + 3 gate = 17. Choice is 1 unit.
    assert.equal(countablePhaseUnits(p03), 17);
    // p07: 10 items + 0 gate. antiGate (5) excluded.
    assert.equal(countablePhaseUnits(p07), 10);
    // p09: 6 items, no gate.
    assert.equal(countablePhaseUnits(p09), 6);
  });
});

describe("isItemTicked", () => {
  test("task with boolean true is ticked", () => {
    assert.equal(isItemTicked({ id: "x", kind: "task" }, { checks: { x: true } }), true);
  });
  test("task with boolean false is not ticked", () => {
    assert.equal(isItemTicked({ id: "x", kind: "task" }, { checks: { x: false } }), false);
  });
  test("task missing from state is not ticked", () => {
    assert.equal(isItemTicked({ id: "x", kind: "task" }, { checks: {} }), false);
  });
  test("choice with a non-empty string is ticked", () => {
    assert.equal(isItemTicked({ id: "c1", kind: "choice", options: [] }, { checks: { c1: "c1-o1" } }), true);
  });
  test("choice with undefined is not ticked", () => {
    assert.equal(isItemTicked({ id: "c1", kind: "choice", options: [] }, { checks: {} }), false);
  });
});

describe("phaseRatio", () => {
  test("empty state → 0", () => {
    assert.equal(phaseRatio(p01, { checks: {} }), 0);
  });
  test("all ticked → 1", () => {
    const checks = {};
    for (const it of p01.items) checks[it.id] = true;
    for (const it of p01.gate.items) checks[it.id] = true;
    assert.equal(phaseRatio(p01, { checks }), 1);
  });
  test("antiGate ticks do not contribute", () => {
    const checks = {};
    for (const it of p07.antiGate.items) checks[it.id] = true;
    assert.equal(phaseRatio(p07, { checks }), 0);
  });
  test("choice counts as 1 when picked", () => {
    const checks = { "p03-c01": "p03-c01-o02" };
    const total = countablePhaseUnits(p03);
    assert.equal(phaseRatio(p03, { checks }), 1 / total);
  });
});

describe("sectionRatio", () => {
  test("extras.artifactSet ratio", () => {
    const section = CHEATSHEET.extras.artifactSet;
    assert.equal(sectionRatio(section, { checks: {} }), 0);
    const checks = { "x-art-01": true };
    assert.equal(sectionRatio(section, { checks }), 1 / section.items.length);
  });
});

describe("heroTotals", () => {
  test("counts across all 10 phases, excludes extras", () => {
    const totals = heroTotals(CHEATSHEET, { checks: {} });
    let expectedTotal = 0;
    for (const phase of CHEATSHEET.phases) expectedTotal += countablePhaseUnits(phase);
    assert.equal(totals.total, expectedTotal);
    assert.equal(totals.ticked, 0);
    assert.equal(totals.currentPhaseId, "01");
  });

  test("current-phase indicator is lowest incomplete phase", () => {
    const checks = {};
    // Complete phase 01 fully.
    for (const it of CHEATSHEET.phases[0].items) checks[it.id] = true;
    for (const it of CHEATSHEET.phases[0].gate.items) checks[it.id] = true;
    const totals = heroTotals(CHEATSHEET, { checks });
    assert.equal(totals.currentPhaseId, "02");
  });

  test("all complete → currentPhaseId is null", () => {
    const checks = {};
    for (const phase of CHEATSHEET.phases) {
      for (const it of phase.items) {
        if (it.kind === "choice") checks[it.id] = it.options[0].id;
        else checks[it.id] = true;
      }
      if (phase.gate) for (const it of phase.gate.items) checks[it.id] = true;
    }
    const totals = heroTotals(CHEATSHEET, { checks });
    assert.equal(totals.currentPhaseId, null);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/progress.test.js
```

- [ ] **Step 3: Implement `scripts/progress.js`**

```js
// Pure progress math. See spec §5.3.

export function isItemTicked(item, state) {
  const v = state.checks[item.id];
  if ((item.kind ?? "task") === "task") return v === true;
  if (item.kind === "choice") return typeof v === "string" && v.length > 0;
  return false;
}

function sumItems(items, state) {
  let total = 0;
  let ticked = 0;
  for (const item of items) {
    total += 1; // choice counts as one regardless of option count
    if (isItemTicked(item, state)) ticked += 1;
  }
  return { total, ticked };
}

export function countablePhaseUnits(phase) {
  let n = phase.items.length;
  if (phase.gate) n += phase.gate.items.length;
  // antiGate NOT counted
  return n;
}

export function tickedPhaseUnits(phase, state) {
  let t = sumItems(phase.items, state).ticked;
  if (phase.gate) t += sumItems(phase.gate.items, state).ticked;
  return t;
}

export function phaseRatio(phase, state) {
  const total = countablePhaseUnits(phase);
  if (total === 0) return 0;
  return tickedPhaseUnits(phase, state) / total;
}

export function sectionRatio(section, state) {
  const { total, ticked } = sumItems(section.items, state);
  return total === 0 ? 0 : ticked / total;
}

export function heroTotals(cheatsheet, state) {
  let total = 0;
  let ticked = 0;
  let currentPhaseId = null;
  for (const phase of cheatsheet.phases) {
    const phaseTotal = countablePhaseUnits(phase);
    const phaseTicked = tickedPhaseUnits(phase, state);
    total += phaseTotal;
    ticked += phaseTicked;
    if (currentPhaseId === null && phaseTicked < phaseTotal) {
      currentPhaseId = phase.id;
    }
  }
  return { total, ticked, currentPhaseId };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/progress.test.js
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/progress.js tests/progress.test.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(progress): pure progress math for phase, section, and hero"
```

---

## Task 8 — HTML shell + noscript

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PRD → V1 · Cheatsheet</title>
  <meta name="description" content="A pre-code ritual: ten phases from rough PRD to scaffold-ready repo." />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#F6F6F4" />

  <link rel="preload" href="assets/fonts/CabinetGrotesk-Variable.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin />

  <link rel="stylesheet" href="styles/tokens.css" />
  <link rel="stylesheet" href="styles/base.css" />
  <link rel="stylesheet" href="styles/layout.css" />
  <link rel="stylesheet" href="styles/tile.css" />
  <link rel="stylesheet" href="styles/modal.css" />
  <link rel="stylesheet" href="styles/sigils.css" />
</head>
<body>
  <main id="main">
    <header class="hero reveal" style="--i:0">
      <span class="eyebrow eyebrow--pill">A PRE-CODE RITUAL</span>
      <h1 class="hero__title">
        <span>From rough PRD</span>
        <span>to scaffold-ready</span>
      </h1>
      <p class="hero__lede">
        Ten phases between a rough idea and a repo you won't rewrite in week one.
        Track your place. Don't skip gates.
      </p>
      <p class="hero__meter" id="hero-meter" aria-live="polite">
        <!-- populated by JS: "47 / 128 complete · phase 04 in progress" -->
      </p>
      <svg class="hero__diagram" aria-hidden="true" viewBox="0 0 400 320">
        <!-- ambient connected-nodes diagram; filled in during visual pass -->
        <g stroke="currentColor" stroke-width="1" fill="none" stroke-opacity="0.12">
          <circle cx="60" cy="60" r="6" /><circle cx="160" cy="40" r="6" />
          <circle cx="260" cy="80" r="6" /><circle cx="340" cy="60" r="6" />
          <circle cx="100" cy="160" r="6" /><circle cx="220" cy="180" r="6" />
          <circle cx="320" cy="160" r="6" /><circle cx="60" cy="260" r="6" />
          <circle cx="180" cy="280" r="6" /><circle cx="320" cy="260" r="6" />
          <path d="M60 60 L160 40 L260 80 L340 60 M100 160 L220 180 L320 160 M60 260 L180 280 L320 260" />
          <path d="M60 60 L100 160 L60 260 M160 40 L220 180 L180 280 M260 80 L320 160 L320 260" />
        </g>
      </svg>
    </header>

    <section id="phases" aria-labelledby="phases-heading" class="phases">
      <div class="section-head reveal" style="--i:1">
        <span class="eyebrow">THE TEN PHASES</span>
        <h2 id="phases-heading" class="section-title">Phase by phase.</h2>
      </div>
      <div class="bento" id="bento-grid">
        <!-- tiles rendered by JS -->
      </div>
      <noscript>
        <div class="noscript-notice">
          <h2>JavaScript required.</h2>
          <p>
            The checklist content is loaded at runtime from a single data file.
            Enable scripts to continue.
          </p>
        </div>
      </noscript>
    </section>

    <section id="packet" aria-labelledby="packet-heading" class="packet">
      <div class="section-head reveal" style="--i:0">
        <span class="eyebrow">THE PACKET</span>
        <h2 id="packet-heading" class="section-title">Two reference lists you scan while you work.</h2>
      </div>
      <div class="packet__grid" id="packet-grid">
        <!-- two cards rendered by JS -->
      </div>
    </section>
  </main>

  <footer class="footer">
    <span class="footer__brand">prd.dineshd.dev</span>
    <button class="footer__reset" id="reset-link" type="button">RESET PROGRESS</button>
    <p class="footer__notice" id="persistence-notice" hidden>
      progress not saved this session
    </p>
  </footer>

  <div id="modal-root" aria-hidden="true"></div>

  <script type="module" src="scripts/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Serve and open in browser**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && python3 -m http.server 8080 >/dev/null 2>&1 &
sleep 1
open http://localhost:8080/
```

Expected: hero text renders with placeholder fonts (fonts not fully wired
to visual yet but declared). Phases and Packet sections empty. Noscript
block only visible with JS disabled. Stop the server after:

```bash
pkill -f "http.server 8080" || true
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add index.html
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(html): semantic shell with hero, phases, packet, modal root, noscript"
```

---

## Task 9 — Layout CSS

**Files:**
- Create: `styles/layout.css`

- [ ] **Step 1: Write `styles/layout.css`**

```css
/* Layout: hero, bento grid, packet, footer. Spec §6. */

main {
  max-width: 1400px;
  margin: 0 auto;
  padding-left: max(var(--s-6), env(safe-area-inset-left));
  padding-right: max(var(--s-6), env(safe-area-inset-right));
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-6);
  padding: var(--s-12) 0 var(--s-11);
  min-height: 80dvh;
  align-content: center;
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: 1.4fr 1fr;
    align-items: center;
    gap: var(--s-10);
  }
}

.hero__title {
  font-family: var(--font-display);
  font-weight: 200;
  font-size: var(--t-hero);
  line-height: 0.92;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin-top: var(--s-5);
  margin-bottom: var(--s-6);
  display: flex;
  flex-direction: column;
}
.hero__title span { display: block; }
.hero__title span + span { color: var(--ink-muted); }

.hero__lede {
  font-family: var(--font-body);
  color: var(--ink-muted);
  max-width: 48ch;
  margin-bottom: var(--s-6);
}

.hero__meter {
  font-family: var(--font-body);
  font-size: var(--t-meta-size);
  color: var(--ink-muted);
  letter-spacing: 0.01em;
}

.hero__diagram {
  width: 100%;
  height: auto;
  max-height: 360px;
  color: var(--ink);
  justify-self: end;
  grid-row: 1;
}
@media (max-width: 899px) {
  .hero__diagram { display: none; }
}

/* ---------- Sections (shared) ---------- */
.section-head {
  margin-bottom: var(--s-8);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.section-title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--t-h2);
  letter-spacing: -0.02em;
  color: var(--ink);
  max-width: 38ch;
}

.phases { padding: var(--s-12) 0; }
.packet { padding: var(--s-11) 0 var(--s-12); }

/* ---------- Bento grid ---------- */
.bento {
  display: grid;
  gap: var(--s-5);
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1100px) {
  .bento {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 220px;
    gap: var(--s-6);
  }
  .tile[data-phase="01"],
  .tile[data-phase="02"],
  .tile[data-phase="04"],
  .tile[data-phase="07"],
  .tile[data-phase="09"],
  .tile[data-phase="10"] { grid-column: span 2; grid-row: span 1; }
  .tile[data-phase="03"],
  .tile[data-phase="08"] { grid-column: span 2; grid-row: span 2; }
  .tile[data-phase="05"],
  .tile[data-phase="06"] { grid-column: span 1; grid-row: span 1; }
}

/* Noscript notice — styled to match the aesthetic */
.noscript-notice {
  padding: var(--s-8);
  border-radius: var(--r-xl);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  max-width: 48ch;
}
.noscript-notice h2 {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--t-h2);
  letter-spacing: -0.02em;
  margin-bottom: var(--s-3);
}

/* ---------- Packet ---------- */
.packet__grid {
  display: grid;
  gap: var(--s-5);
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .packet__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-6);
  }
}

.packet-card__shell {
  padding: 6px;
  border-radius: var(--r-xl);
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
}
.packet-card__core {
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow:
    var(--shadow-card),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: var(--s-8);
}
.packet-card__title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--t-h2);
  letter-spacing: -0.02em;
  margin-bottom: var(--s-2);
}
.packet-card__meta { color: var(--ink-muted); margin-bottom: var(--s-6); }
.packet-card__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Checklist row (used in Packet + modal) */
.check-row {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  transition: background-color var(--d-fast) var(--ease-out);
}
.check-row:hover { background: var(--surface-shell); }
.check-row--checked { background: var(--accent-soft); }
.check-row--warn { background: transparent; color: var(--warn); }
.check-row--warn.check-row--checked { background: var(--warn-soft); }
.check-row input[type="checkbox"],
.check-row input[type="radio"] {
  margin-top: 4px;
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.check-row--warn input[type="checkbox"] { accent-color: var(--warn); }
.check-row label { cursor: pointer; flex: 1; }

/* ---------- Footer ---------- */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-5);
  max-width: 1400px;
  margin: 0 auto;
  padding:
    var(--s-11)
    max(var(--s-6), env(safe-area-inset-right))
    calc(var(--s-11) + env(safe-area-inset-bottom))
    max(var(--s-6), env(safe-area-inset-left));
  flex-wrap: wrap;
}
.footer__brand {
  font-family: var(--font-mono);
  font-size: var(--t-meta-size);
  color: var(--ink-muted);
}
.footer__reset {
  font-family: var(--font-body);
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  color: var(--ink-faint);
  transition: color var(--d-fast) var(--ease-out);
}
.footer__reset:hover { color: var(--ink-muted); }
.footer__reset--confirming {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
}
.footer__notice {
  width: 100%;
  font-size: var(--t-meta-size);
  color: var(--warn);
  margin-top: var(--s-3);
}
```

- [ ] **Step 2: Refresh browser, verify layout**

Serve again (see Task 8 Step 2). The hero should now show with proper
typography, spacing, two-column layout above 900px. Sections have
correct breathing room. Footer sits at the bottom. No phase tiles yet
(JS not wired). No console errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add styles/layout.css
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(styles): layout — hero, bento grid, packet, footer"
```

---

## Task 10 — Sigils SVG + tile CSS

**Files:**
- Create: `assets/sigils.svg`
- Create: `styles/tile.css`

- [ ] **Step 1: Write `assets/sigils.svg`**

All 10 sigils as `<symbol>` definitions. Each on 64×64, `stroke="currentColor"`,
`fill="none"`, `stroke-width="1.5"`, `stroke-linecap="round"`. The SVG
file is served but not rendered inline; tiles use `<use href="...#sigil-NN">`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <!-- 01 Triage: concentric arcs offset, signal converging to clarity -->
    <symbol id="sigil-01" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M12 32a20 20 0 0 1 40 0" />
      <path d="M18 32a14 14 0 0 1 28 0" />
      <path d="M24 32a8 8 0 0 1 16 0" />
      <circle cx="32" cy="40" r="1.2" fill="currentColor" />
    </symbol>

    <!-- 02 Scope: square frame with a quadrant cut away -->
    <symbol id="sigil-02" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M14 14h36v36" />
      <path d="M14 14v26h26" />
      <path d="M32 14v12H14" />
    </symbol>

    <!-- 03 Shape: stacked horizontal lines + vertical spine -->
    <symbol id="sigil-03" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M14 20h36" />
      <path d="M14 32h36" />
      <path d="M14 44h36" />
      <path d="M32 14v36" />
    </symbol>

    <!-- 04 Pack: overlapping rectangles staggered like pages -->
    <symbol id="sigil-04" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <rect x="16" y="20" width="28" height="32" rx="2" />
      <rect x="20" y="14" width="28" height="32" rx="2" opacity="0.6" />
    </symbol>

    <!-- 05 Spike: line ascending through a circle -->
    <symbol id="sigil-05" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="32" cy="32" r="14" />
      <path d="M16 48 L48 16" />
    </symbol>

    <!-- 06 Slice: vertical ruled fringe, stack cut into slices -->
    <symbol id="sigil-06" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M20 14v36" />
      <path d="M26 14v36" />
      <path d="M32 14v36" />
      <path d="M38 14v36" />
      <path d="M44 14v36" />
    </symbol>

    <!-- 07 Readiness: crosshair inside bracket frame -->
    <symbol id="sigil-07" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M14 20v-6h6" />
      <path d="M44 14h6v6" />
      <path d="M14 44v6h6" />
      <path d="M44 50h6v-6" />
      <circle cx="32" cy="32" r="6" />
      <path d="M32 22v4 M32 38v4 M22 32h4 M38 32h4" />
    </symbol>

    <!-- 08 Scaffold: grid intersection — 3 verticals × 2 horizontals -->
    <symbol id="sigil-08" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M22 14v36" />
      <path d="M32 14v36" />
      <path d="M42 14v36" />
      <path d="M14 24h36" />
      <path d="M14 40h36" />
    </symbol>

    <!-- 09 Build: open triangle pointing up-right with one edge extended -->
    <symbol id="sigil-09" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M16 48 L48 16 L48 48 Z" />
      <path d="M16 48 L8 48" />
    </symbol>

    <!-- 10 Close: circle with a horizontal line through the meridian -->
    <symbol id="sigil-10" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="32" cy="32" r="18" />
      <path d="M10 32h44" />
    </symbol>
  </defs>
</svg>
```

- [ ] **Step 2: Write `styles/tile.css`**

```css
/* Phase tile — double-bezel card, sigil, progress meter. Spec §6.2 + §7.4. */

.tile {
  display: block;
  width: 100%;
  padding: 6px;
  border-radius: var(--r-xl);
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
  text-align: left;
  transition:
    transform var(--d-fast) var(--ease-out),
    box-shadow var(--d-fast) var(--ease-out);
}
.tile:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 0 0 1px var(--hairline),
    0 8px 24px -16px rgba(10, 10, 10, 0.12);
}
.tile:active { transform: scale(0.985); }

.tile__core {
  position: relative;
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow:
    var(--shadow-card),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: var(--s-7);
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-4);
  min-height: 220px;
}

.tile__eyebrow {
  grid-column: 1; grid-row: 1;
  font-family: var(--font-body);
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-faint);
}

.tile__num {
  grid-column: 2; grid-row: 1 / span 2;
  font-family: var(--font-display);
  font-size: var(--t-tile-num);
  font-weight: 200;
  letter-spacing: -0.04em;
  color: var(--ink-faint);
  line-height: 0.9;
  align-self: start;
  text-align: right;
}

.tile__title {
  grid-column: 1; grid-row: 2;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(20px, 2.4vw, 28px);
  letter-spacing: -0.02em;
  color: var(--ink);
  max-width: 20ch;
  transition: color var(--d-fast) var(--ease-out);
}

.tile__sigil {
  grid-column: 1; grid-row: 3;
  align-self: end;
  width: 44px;
  height: 44px;
  color: var(--ink);
  transition: color var(--d-med) var(--ease-out);
}

.tile__meter {
  grid-column: 1 / -1; grid-row: 4;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  font-size: var(--t-meta-size);
  color: var(--ink-muted);
}
.tile__meter-bar {
  flex: 1;
  height: 3px;
  border-radius: var(--r-pill);
  background: var(--hairline);
  position: relative;
  overflow: hidden;
}
.tile__meter-fill {
  position: absolute;
  inset: 0;
  width: var(--ratio, 0%);
  background: var(--accent);
  border-radius: var(--r-pill);
  transition: width var(--d-med) var(--ease-out);
}

/* Complete state */
.tile[data-complete="true"] .tile__sigil { color: var(--accent); }
.tile[data-complete="true"] .tile__title { color: var(--ink-muted); }
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add assets/sigils.svg styles/tile.css
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(assets,styles): sigils SVG sprite + phase tile styles"
```

---

## Task 11 — Sigil perpetual animations

**Files:**
- Create: `styles/sigils.css`

Subtle perpetual motion per sigil, paused when off-screen via the
`[data-in-view="false"]` attribute written by `reveal.js` (Task 14).

- [ ] **Step 1: Write `styles/sigils.css`**

```css
/* Perpetual sigil micro-animations. Spec §7.6. Paused off-screen. */

.tile__sigil svg,
.tile__sigil use {
  transform-origin: 50% 50%;
  will-change: transform;
}

/* Only animate when the tile is in view */
.tile[data-in-view="true"] .tile__sigil use {
  animation-duration: var(--sigil-dur, 10s);
  animation-timing-function: var(--ease-in-out);
  animation-iteration-count: infinite;
}

/* 01 — concentric breath */
.tile[data-phase="01"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-breath;
  --sigil-dur: 9s;
}
@keyframes sigil-breath {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}

/* 02 — quadrant nudge */
.tile[data-phase="02"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-nudge;
  --sigil-dur: 10s;
}
@keyframes sigil-nudge {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(0.6px, -0.6px); }
}

/* 03 — spine glide */
.tile[data-phase="03"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-glide;
  --sigil-dur: 11s;
}
@keyframes sigil-glide {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(1px); }
}

/* 04 — page shift */
.tile[data-phase="04"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-shift;
  --sigil-dur: 12s;
}
@keyframes sigil-shift {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-0.8px, 0.8px); }
}

/* 05 — spike drift */
.tile[data-phase="05"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-drift;
  --sigil-dur: 9s;
}
@keyframes sigil-drift {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(1.2deg); }
}

/* 06 — slice sway */
.tile[data-phase="06"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-sway;
  --sigil-dur: 10s;
}
@keyframes sigil-sway {
  0%, 100% { transform: skewX(0deg); }
  50%      { transform: skewX(0.6deg); }
}

/* 07 — crosshair pulse */
.tile[data-phase="07"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-breath;
  --sigil-dur: 8s;
}

/* 08 — grid pulse */
.tile[data-phase="08"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-breath;
  --sigil-dur: 11s;
}

/* 09 — triangle extend (edge grows) */
.tile[data-phase="09"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-glide;
  --sigil-dur: 10s;
}

/* 10 — meridian breath */
.tile[data-phase="10"][data-in-view="true"] .tile__sigil use {
  animation-name: sigil-breath;
  --sigil-dur: 12s;
}

@media (prefers-reduced-motion: reduce) {
  .tile__sigil use { animation: none !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add styles/sigils.css
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(styles): per-sigil perpetual animations + reduced-motion guard"
```

---

## Task 12 — Modal CSS (+ safe-area)

**Files:**
- Create: `styles/modal.css`

- [ ] **Step 1: Write `styles/modal.css`**

```css
/* Modal overlay + dialog. Spec §6.5. Safe-area aware. */

#modal-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, 0.4);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  opacity: 0;
  transition: opacity var(--d-med) var(--ease-out);
  pointer-events: none;
}

.modal-dialog {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, calc(-50% + 32px)) scale(0.98);
  filter: blur(4px);
  opacity: 0;
  width: min(640px, calc(100vw - 32px));
  max-height: min(85dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px));
  padding: 6px;
  border-radius: var(--r-xl);
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
  transition:
    opacity var(--d-med) var(--ease-out),
    transform var(--d-med) var(--ease-out),
    filter var(--d-med) var(--ease-out);
  pointer-events: none;
}

#modal-root.is-open { pointer-events: auto; }
#modal-root.is-open .modal-overlay { opacity: 1; pointer-events: auto; }
#modal-root.is-open .modal-dialog {
  transform: translate(-50%, -50%) scale(1);
  filter: blur(0);
  opacity: 1;
  pointer-events: auto;
}

.modal-core {
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow:
    var(--shadow-card),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: var(--s-8)
           max(var(--s-8), env(safe-area-inset-right))
           max(var(--s-8), env(safe-area-inset-bottom))
           max(var(--s-8), env(safe-area-inset-left));
  max-height: inherit;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: max(var(--s-5), env(safe-area-inset-top));
  right: max(var(--s-5), env(safe-area-inset-right));
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3) var(--s-2) var(--s-4);
  border-radius: var(--r-pill);
  background: var(--surface-shell);
  box-shadow: inset 0 0 0 1px var(--hairline);
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  color: var(--ink-muted);
  transition:
    transform var(--d-fast) var(--ease-out),
    color var(--d-fast) var(--ease-out);
}
.modal-close:hover { color: var(--ink); }
.modal-close:active { transform: scale(0.98); }
.modal-close__icon {
  width: 28px;
  height: 28px;
  border-radius: var(--r-pill);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--hairline);
  display: inline-grid;
  place-items: center;
  transition: transform var(--d-fast) var(--ease-out);
}
.modal-close:hover .modal-close__icon { transform: translate(1px, -1px) scale(1.05); }

.modal-eyebrow {
  font-family: var(--font-body);
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: var(--s-3);
}
.modal-num {
  font-family: var(--font-display);
  font-weight: 200;
  font-size: var(--t-tile-num);
  letter-spacing: -0.04em;
  color: var(--ink-faint);
  line-height: 0.9;
  margin-bottom: var(--s-2);
}
.modal-title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--t-h2);
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: var(--s-2);
  max-width: 28ch;
}
.modal-subtitle {
  color: var(--ink-muted);
  margin-bottom: var(--s-7);
  max-width: 48ch;
}

.modal-section { margin-bottom: var(--s-7); }
.modal-section__eyebrow {
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: var(--s-3);
  font-weight: 500;
}
.modal-section--warn .modal-section__eyebrow { color: var(--warn); }

.modal-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Choice block inside modal */
.choice {
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-shell);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.choice__prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  color: var(--ink);
}
.choice__clear {
  font-size: var(--t-eyebrow-size);
  letter-spacing: var(--t-eyebrow-track);
  text-transform: uppercase;
  color: var(--ink-faint);
}
.choice__clear[hidden] { display: none; }
.choice__options {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* When modal open: lock background */
html.is-modal-open { overflow: hidden; }
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add styles/modal.css
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(styles): modal overlay + dialog with safe-area insets"
```

---

## Task 13 — Render module DOM builders

**Files:**
- Create: `scripts/render.js`

Builds DOM from data. Exposes targeted mutators used by the state flow.

- [ ] **Step 1: Write `scripts/render.js`**

```js
// DOM builders + live progress mutators. Spec §6 + §8.2.
// Progress math is in ./progress.js; this file owns the DOM.

import {
  isItemTicked,
  phaseRatio,
  sectionRatio,
  heroTotals,
  countablePhaseUnits,
  tickedPhaseUnits,
} from "./progress.js";

const SIGIL_SPRITE = "assets/sigils.svg";

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "dataset") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function svg(symbolId) {
  const wrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrap.setAttribute("viewBox", "0 0 64 64");
  wrap.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `${SIGIL_SPRITE}#${symbolId}`);
  wrap.appendChild(use);
  return wrap;
}

function formatRatio(ticked, total) {
  return `${ticked} / ${total}`;
}

// ---------- Tile ----------
export function buildTile(phase, state, onOpen) {
  const total = countablePhaseUnits(phase);
  const ticked = tickedPhaseUnits(phase, state);
  const ratio = total === 0 ? 0 : ticked / total;

  const tile = el("button", {
    class: "tile reveal",
    type: "button",
    dataset: { phase: phase.id, complete: String(ratio === 1), inView: "false" },
    "aria-label": `Open phase ${phase.id}: ${phase.title}`,
    style: "--i: " + Number(phase.id),
    onclick: () => onOpen(phase.id),
  });
  const core = el("div", { class: "tile__core" },
    el("span", { class: "tile__eyebrow", text: `PHASE ${phase.id}` }),
    el("span", { class: "tile__num", text: phase.id }),
    el("h3", { class: "tile__title", text: phase.title }),
    (() => {
      const wrapper = el("span", { class: "tile__sigil" });
      wrapper.appendChild(svg(phase.sigilId));
      return wrapper;
    })(),
    el("div", { class: "tile__meter" },
      el("span", { class: "tile__meter-label", text: formatRatio(ticked, total) }),
      el("span", { class: "tile__meter-bar" },
        el("span", { class: "tile__meter-fill", style: `--ratio: ${ratio * 100}%` })
      )
    ),
  );
  tile.appendChild(core);
  return tile;
}

export function updatePhaseProgress(phaseId, ratio, ticked, total) {
  const tile = document.querySelector(`.tile[data-phase="${phaseId}"]`);
  if (!tile) return;
  tile.dataset.complete = String(ratio === 1);
  const label = tile.querySelector(".tile__meter-label");
  if (label) label.textContent = formatRatio(ticked, total);
  const fill = tile.querySelector(".tile__meter-fill");
  if (fill) fill.style.setProperty("--ratio", `${ratio * 100}%`);
}

// ---------- Packet card ----------
export function buildPacketCard(section, state, sectionId, onToggle) {
  const ratio = sectionRatio(section, state);
  const ticked = section.items.filter((it) => isItemTicked(it, state)).length;
  const total = section.items.length;

  const list = el("ul", { class: "packet-card__list reveal", style: "--i: 2" });
  for (const item of section.items) {
    list.appendChild(buildCheckRow(item, state, (checked) => onToggle(item, checked), { variant: "plain" }));
  }
  const shell = el("div", { class: "packet-card__shell", dataset: { section: sectionId } },
    el("div", { class: "packet-card__core" },
      el("h3", { class: "packet-card__title", text: section.title }),
      el("p", { class: "packet-card__meta", id: `packet-meta-${sectionId}`, text: formatRatio(ticked, total) }),
      list,
    )
  );
  return shell;
}

export function updatePacketProgress(sectionId, ticked, total) {
  const meta = document.getElementById(`packet-meta-${sectionId}`);
  if (meta) meta.textContent = formatRatio(ticked, total);
}

// ---------- Check row (task) ----------
function buildCheckRow(item, state, onChange, { variant = "plain" } = {}) {
  const checked = isItemTicked(item, state);
  const li = el("li", {
    class: `check-row${checked ? " check-row--checked" : ""}${variant === "warn" ? " check-row--warn" : ""}`,
    dataset: { itemId: item.id },
  });
  const cb = el("input", {
    type: "checkbox",
    id: `cb-${item.id}`,
    "aria-label": item.text,
  });
  cb.checked = checked;
  cb.addEventListener("change", () => {
    li.classList.toggle("check-row--checked", cb.checked);
    onChange(cb.checked);
  });
  const label = el("label", { for: `cb-${item.id}`, text: item.text });
  li.append(cb, label);
  return li;
}

// ---------- Choice block ----------
function buildChoiceBlock(item, state, onPick, onClear) {
  const picked = state.checks[item.id];
  const block = el("div", { class: "choice", dataset: { itemId: item.id } });
  const prompt = el("div", { class: "choice__prompt" },
    el("span", { class: "choice__prompt-text", text: item.text }),
    el("button", {
      type: "button",
      class: "choice__clear",
      hidden: !picked,
      onclick: () => { onClear(); rerenderPick(null); },
      text: "clear",
    }),
  );
  const options = el("ul", { class: "choice__options" });
  const name = `choice-${item.id}`;
  for (const opt of item.options) {
    const id = `r-${opt.id}`;
    const li = el("li", { class: `check-row${picked === opt.id ? " check-row--checked" : ""}` });
    const input = el("input", {
      type: "radio",
      name,
      id,
      "aria-label": opt.text,
    });
    input.checked = picked === opt.id;
    input.addEventListener("change", () => {
      if (input.checked) { onPick(opt.id); rerenderPick(opt.id); }
    });
    li.append(input, el("label", { for: id, text: opt.text }));
    options.appendChild(li);
  }
  block.append(prompt, options);

  function rerenderPick(newPick) {
    prompt.querySelector(".choice__clear").hidden = !newPick;
    options.querySelectorAll("li").forEach((li, idx) => {
      const isPicked = item.options[idx].id === newPick;
      li.classList.toggle("check-row--checked", isPicked);
      li.querySelector("input").checked = isPicked;
    });
  }

  return block;
}

// ---------- Modal ----------
export function buildModal(phase, state, handlers) {
  const { onToggle, onChoicePick, onChoiceClear, onClose } = handlers;

  function section(title, items, variant = "plain") {
    const ul = el("ul", { class: "modal-list" });
    for (const it of items) {
      if (it.kind === "choice") {
        ul.appendChild(buildChoiceBlock(it, state,
          (optId) => onChoicePick(it.id, optId),
          () => onChoiceClear(it.id),
        ));
      } else {
        ul.appendChild(buildCheckRow(it, state, (checked) => onToggle(it, checked), { variant }));
      }
    }
    return ul;
  }

  const dialog = el("div", {
    class: "modal-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": `modal-title-${phase.id}`,
  });
  const core = el("div", { class: "modal-core" },
    el("button", {
      type: "button",
      class: "modal-close",
      "aria-label": "Close",
      onclick: onClose,
    },
      "Close",
      el("span", { class: "modal-close__icon", "aria-hidden": "true" },
        (() => {
          const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          s.setAttribute("viewBox", "0 0 24 24");
          s.setAttribute("width", "12"); s.setAttribute("height", "12");
          s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.5");
          s.setAttribute("fill", "none"); s.setAttribute("stroke-linecap", "round");
          s.innerHTML = '<path d="M5 5l14 14M19 5L5 19" />';
          return s;
        })()
      ),
    ),
    el("span", { class: "modal-eyebrow", text: `PHASE ${phase.id}` }),
    el("div", { class: "modal-num", text: phase.id }),
    el("h2", { class: "modal-title", id: `modal-title-${phase.id}`, text: phase.title }),
    el("p", { class: "modal-subtitle", text: phase.subtitle }),
    el("div", { class: "modal-section" }, section("Items", phase.items)),
  );
  if (phase.gate) {
    core.appendChild(
      el("div", { class: "modal-section" },
        el("span", { class: "modal-section__eyebrow", text: "GATE TO MOVE ON" }),
        section("Gate", phase.gate.items),
      )
    );
  }
  if (phase.antiGate) {
    core.appendChild(
      el("div", { class: "modal-section modal-section--warn" },
        el("span", { class: "modal-section__eyebrow", text: "DO NOT SCAFFOLD IF" }),
        section("AntiGate", phase.antiGate.items, "warn"),
      )
    );
  }
  dialog.appendChild(core);
  return dialog;
}

// ---------- Hero meter ----------
export function renderHeroMeter(cheatsheet, state) {
  const totals = heroTotals(cheatsheet, state);
  updateHeroMeter(totals);
}

export function updateHeroMeter(totals) {
  const meter = document.getElementById("hero-meter");
  if (!meter) return;
  if (totals.currentPhaseId === null) {
    meter.textContent = `${totals.ticked} / ${totals.total} complete · all phases done`;
  } else {
    meter.textContent = `${totals.ticked} / ${totals.total} complete · phase ${totals.currentPhaseId} in progress`;
  }
}

// ---------- Mount ----------
export function mount(cheatsheet, state, handlers) {
  // Hero meter
  renderHeroMeter(cheatsheet, state);

  // Bento grid (tiles)
  const bento = document.getElementById("bento-grid");
  if (bento) {
    bento.innerHTML = "";
    for (const phase of cheatsheet.phases) {
      bento.appendChild(buildTile(phase, state, handlers.onTileClick));
    }
  }

  // Packet cards
  const packetGrid = document.getElementById("packet-grid");
  if (packetGrid) {
    packetGrid.innerHTML = "";
    packetGrid.appendChild(
      buildPacketCard(cheatsheet.extras.artifactSet, state, "artifactSet",
        (item, checked) => handlers.onPacketToggle("artifactSet", item, checked))
    );
    packetGrid.appendChild(
      buildPacketCard(cheatsheet.extras.preCodeCheck, state, "preCodeCheck",
        (item, checked) => handlers.onPacketToggle("preCodeCheck", item, checked))
    );
  }
}

// Re-export the progress helpers consumers can reach for convenience.
export { phaseRatio, sectionRatio, countablePhaseUnits, tickedPhaseUnits, heroTotals, isItemTicked };
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/render.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(render): DOM builders for tiles, packet, modal; targeted mutators"
```

---

## Task 14 — Reveal module

**Files:**
- Create: `scripts/reveal.js`

Two IntersectionObservers: one for the one-shot scroll reveal, one to
flip `data-in-view` on tiles so perpetual sigil animations pause off-screen.

- [ ] **Step 1: Write `scripts/reveal.js`**

```js
// IntersectionObserver-driven reveal + in-view toggle for tiles.
// Spec §7.6 + §8.1.

export function observeReveals(root = document) {
  if (!("IntersectionObserver" in window)) {
    // Fallback: show everything.
    root.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

  root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

export function observeTilesInView(root = document) {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.dataset.inView = entry.isIntersecting ? "true" : "false";
    }
  }, { threshold: 0.2 });

  root.querySelectorAll(".tile").forEach((el) => io.observe(el));
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/reveal.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(reveal): IntersectionObserver for scroll reveals + tile in-view"
```

---

## Task 15 — App wiring

**Files:**
- Create: `scripts/app.js`

Entry point. Loads state, mounts, binds all handlers, installs persistence
listeners, manages the modal lifecycle.

- [ ] **Step 1: Write `scripts/app.js`**

```js
// Entry point. Wires render → state → router → persistence.

import { CHEATSHEET } from "../data/phases.js";
import { createStorage, validIdSetFrom, prune } from "./storage.js";
import { parseHash, createRouter } from "./router.js";
import {
  phaseRatio, sectionRatio, heroTotals,
  countablePhaseUnits, tickedPhaseUnits,
  mount, buildModal, updatePhaseProgress, updatePacketProgress, updateHeroMeter,
} from "./render.js";
import { observeReveals, observeTilesInView } from "./reveal.js";

const VALID_PHASE_IDS = new Set(CHEATSHEET.phases.map((p) => p.id));

// ---------- State & storage ----------
const storage = createStorage();
const state = storage.load();
prune(state, validIdSetFrom(CHEATSHEET));

storage.onPersistenceError(() => {
  const notice = document.getElementById("persistence-notice");
  if (notice) notice.hidden = false;
});

// ---------- Router ----------
const router = createRouter();

// ---------- Modal cache ----------
const modalRoot = document.getElementById("modal-root");
const overlay = document.createElement("div");
overlay.className = "modal-overlay";
overlay.addEventListener("click", closeModal);
modalRoot.appendChild(overlay);

const modalCache = new Map();
let openPhaseId = null;
let lastTrigger = null;

function getOrBuildModal(phaseId) {
  if (modalCache.has(phaseId)) return modalCache.get(phaseId);
  const phase = CHEATSHEET.phases.find((p) => p.id === phaseId);
  const dialog = buildModal(phase, state, {
    onToggle: (item, checked) => toggleTask(item, checked, phaseId),
    onChoicePick: (choiceId, optionId) => pickChoice(choiceId, optionId, phaseId),
    onChoiceClear: (choiceId) => clearChoice(choiceId, phaseId),
    onClose: closeModal,
  });
  modalRoot.appendChild(dialog);
  modalCache.set(phaseId, dialog);
  return dialog;
}

function openModal(phaseId, origin) {
  if (openPhaseId === phaseId) return;
  if (openPhaseId) closeModalCleanup();
  const dialog = getOrBuildModal(phaseId);
  modalRoot.classList.add("is-open");
  modalRoot.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("is-modal-open");
  document.getElementById("main")?.setAttribute("inert", "");
  if (origin === "tile") router.openFromTile(phaseId);
  else if (origin === "deep-link") router.openFromDeepLink(phaseId);
  openPhaseId = phaseId;
  requestAnimationFrame(() => {
    const first = dialog.querySelector('input[type="checkbox"], input[type="radio"], button');
    if (first) first.focus();
    trapFocus(dialog);
  });
}

function closeModalCleanup() {
  modalRoot.classList.remove("is-open");
  modalRoot.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("is-modal-open");
  document.getElementById("main")?.removeAttribute("inert");
  openPhaseId = null;
  if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
}

function closeModal() {
  if (!openPhaseId) return;
  router.close();
  closeModalCleanup();
}

// Focus trap
function trapFocus(container) {
  container.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
}

// ---------- Mutation handlers ----------
function recomputePhase(phaseId) {
  const phase = CHEATSHEET.phases.find((p) => p.id === phaseId);
  const total = countablePhaseUnits(phase);
  const ticked = tickedPhaseUnits(phase, state);
  updatePhaseProgress(phaseId, total === 0 ? 0 : ticked / total, ticked, total);
  const totals = heroTotals(CHEATSHEET, state);
  updateHeroMeter(totals);
}

function recomputePacket(sectionId) {
  const section = CHEATSHEET.extras[sectionId];
  const total = section.items.length;
  const ticked = section.items.filter((it) => {
    const v = state.checks[it.id];
    return it.kind === "choice" ? typeof v === "string" && v.length > 0 : v === true;
  }).length;
  updatePacketProgress(sectionId, ticked, total);
}

function toggleTask(item, checked, phaseId) {
  if (checked) state.checks[item.id] = true;
  else delete state.checks[item.id];
  if (phaseId) recomputePhase(phaseId);
  storage.scheduleSave(state);
}

function pickChoice(choiceId, optionId, phaseId) {
  state.checks[choiceId] = optionId;
  if (phaseId) recomputePhase(phaseId);
  storage.scheduleSave(state);
}

function clearChoice(choiceId, phaseId) {
  delete state.checks[choiceId];
  if (phaseId) recomputePhase(phaseId);
  storage.scheduleSave(state);
}

// ---------- Reset flow ----------
function setupResetLink() {
  const link = document.getElementById("reset-link");
  if (!link) return;
  let confirming = false;
  link.addEventListener("click", () => {
    if (!confirming) {
      confirming = true;
      const ticked = Object.keys(state.checks).length;
      link.classList.add("footer__reset--confirming");
      link.innerHTML = `clear ${ticked} checks? <span class="cancel">✕ cancel</span> <span class="confirm">✓ confirm</span>`;
      link.querySelector(".cancel").addEventListener("click", (e) => {
        e.stopPropagation(); confirming = false;
        link.textContent = "RESET PROGRESS";
        link.classList.remove("footer__reset--confirming");
      });
      link.querySelector(".confirm").addEventListener("click", (e) => {
        e.stopPropagation();
        storage.wipe();
        window.location.reload();
      });
    }
  });
}

// ---------- Boot ----------
function boot() {
  mount(CHEATSHEET, state, {
    onTileClick: (phaseId) => {
      lastTrigger = document.querySelector(`.tile[data-phase="${phaseId}"]`);
      openModal(phaseId, "tile");
    },
    onPacketToggle: (sectionId, item, checked) => {
      if (checked) state.checks[item.id] = true;
      else delete state.checks[item.id];
      recomputePacket(sectionId);
      storage.scheduleSave(state);
    },
  });

  observeReveals();
  observeTilesInView();
  setupResetLink();

  // Initial deep-link
  const parsed = parseHash(location.hash, VALID_PHASE_IDS);
  if (parsed.kind === "phase") openModal(parsed.phaseId, "deep-link");
  else if (parsed.kind === "invalid") router.clearInvalidHash();

  // Global listeners
  window.addEventListener("popstate", () => {
    const p = parseHash(location.hash, VALID_PHASE_IDS);
    if (p.kind === "phase") openModal(p.phaseId, "deep-link");
    else { router.resetPushed(); closeModalCleanup(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openPhaseId) { e.preventDefault(); closeModal(); }
  });

  // Persistence flush
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") storage.flush(state);
  });
  window.addEventListener("pagehide", () => storage.flush(state));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
```

- [ ] **Step 2: Run the full test suite to make sure nothing regressed**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/
```

Expected: all tests pass (4 test files).

- [ ] **Step 3: Commit**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet add scripts/app.js
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "feat(app): wire render, state, router, persistence, modal lifecycle"
```

---

## Task 16 — Integration smoke pass

**Files:**
- Modify: any file that fails a smoke check

- [ ] **Step 1: Serve locally and run TESTING.md top-to-bottom**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && python3 -m http.server 8080 >/dev/null 2>&1 &
sleep 1
open http://localhost:8080/
```

Work through every smoke check in `TESTING.md`. Note any failures.

- [ ] **Step 2: Fix each failure**

For each issue found, edit the responsible file, re-serve (kill and
restart the server), re-verify. Small fix commits are fine — commit per
issue, not a single catch-all commit.

After all fixes:

```bash
pkill -f "http.server 8080" || true
```

- [ ] **Step 3: Run pure-logic tests one more time**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && node --test tests/
```

Expected: all green.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet status
# if anything outstanding:
git -C /Users/Dinesh/dev/prd-cheatsheet add <files>
git -C /Users/Dinesh/dev/prd-cheatsheet commit -m "fix: <what you fixed>"
```

---

## Task 17 — Open PR, deploy to Vercel, verify Lighthouse

**Files:** none (deployment work)

- [ ] **Step 1: Push the feature branch**

Confirm with Dinesh first that the GitHub remote is set up. If not, stop
and ask him to create the repo and add the remote before proceeding.

```bash
git -C /Users/Dinesh/dev/prd-cheatsheet push -u origin feat/initial-implementation
```

- [ ] **Step 2: Open a PR**

```bash
cd /Users/Dinesh/dev/prd-cheatsheet && gh pr create \
  --base main \
  --head feat/initial-implementation \
  --title "feat: initial implementation of prd-cheatsheet" \
  --body "$(cat <<'EOF'
## Summary

Initial working implementation of prd-cheatsheet per
`docs/superpowers/specs/2026-04-18-prd-cheatsheet-design.md`.

- 10-phase bento grid + Packet reference section
- Modal overlay with hash deep-linking (`/#phase-07`)
- LocalStorage persistence with debounced flush + page-hide flush
- `choice` item kind (Phase 3 delivery model); Phase 7 anti-gate
- Soft Structuralism aesthetic: self-hosted Cabinet Grotesk + Geist
- Pure-logic modules covered by `node --test`

## Test plan

- [ ] `node --test tests/` passes
- [ ] TESTING.md manual smoke checklist passes end-to-end
- [ ] Vercel preview: Lighthouse a11y = 100, BP ≥ 95 (hard gates)
- [ ] Vercel preview: Lighthouse perf ≥ 80 mobile / ≥ 90 desktop (warn-only)
EOF
)"
```

- [ ] **Step 3: Wait for the Vercel preview deployment**

Vercel auto-builds on PR push. Watch the checks section on the PR page
for the preview URL.

- [ ] **Step 4: Run Lighthouse against the preview**

Open the preview URL in Chrome. DevTools → Lighthouse → Mobile profile.
Run the audit. Verify:

- Accessibility = 100 — if not, fix and re-push.
- Best Practices ≥ 95 — if not, fix and re-push.
- Performance ≥ 80 — if below, note why in the PR body and discuss with
  Dinesh whether to tune or accept.

- [ ] **Step 5: Hand off to Dinesh for review**

Once the hard gates pass, comment on the PR: "Ready for review. Smoke
checks clear, Lighthouse gates met. Final subdomain (`prd.dineshd.dev`?)
still needs a Vercel domain assignment — needs your sign-off."

Do NOT merge the PR. That is Dinesh's decision per repo policy.

---

## Self-Review

**Spec coverage.** Every section of the spec maps to at least one task:
- §1 Purpose, §2 Non-Goals, §3 Constraints → embedded throughout; `README.md` in Task 1.
- §4 Success Criteria → test-backed in Tasks 4–7; Lighthouse gates in Task 17.
- §5.1 File layout → Tasks 1, 8, 9, 10, 11, 12.
- §5.2 Data model → Task 4 (data + validator).
- §5.3 Progress semantics → Task 7 (pure math).
- §6.1 Hero → Task 8 (HTML) + Task 9 (CSS).
- §6.2 Bento → Task 9 (grid CSS) + Task 10 (tile) + Task 13 (render).
- §6.3 Packet → Task 9 (CSS) + Task 13 (render).
- §6.4 Footer + reset → Task 9 (CSS) + Task 15 (reset flow).
- §6.5 Modal → Task 12 (CSS) + Task 13 (buildModal) + Task 15 (lifecycle).
- §7 Visual system → Task 2 (tokens) + Task 3 (fonts) + Task 10 (tile) + Task 11 (sigils) + Task 12 (modal).
- §7.7 Accessibility → covered in CSS focus styles (Task 2), semantic HTML (Task 8), ARIA + focus trap (Task 15).
- §8.1 Boot sequence → Task 15.
- §8.2 State mutation → Task 15 (`toggleTask`, `pickChoice`, `clearChoice`).
- §8.3 Routing → Task 6 (pure) + Task 15 (wiring).
- §8.4 Persistence → Task 5 (module) + Task 15 (listeners).
- §8.5 Reset → Task 15 (`setupResetLink`).
- §8.6 Keyboard → Task 15 (Esc, Tab trap).
- §8.7 No-JS → Task 8 (`<noscript>`).
- §9 Error & edge → Task 5 (storage), Task 4 (validator), Task 14 (IO fallback), Task 12 (safe-area).
- §10 Testing → Task 16 (manual) + Task 17 (Lighthouse).
- §11 Deployment → Task 1 (`vercel.json`) + Task 17 (PR/preview).
- §12 Open items — sigil artwork iterates in Task 10/16; subdomain deferred to Task 17.

**Placeholder scan.** No "TODO / TBD / implement later / similar to Task N"
placeholders in any task. Every step either has complete code or a
deterministic action (download URL, curl command, manual UI step with
explicit outcome). Task 4 step 3 is a transcription task with a provided
source file (`/Users/Dinesh/Desktop/checklist.md`) and full transcribed
output — not a placeholder.

**Type consistency.** Function names match across tasks:
- `phaseRatio`, `sectionRatio`, `heroTotals`, `countablePhaseUnits`,
  `tickedPhaseUnits`, `isItemTicked` — defined in Task 7, imported in
  Tasks 13 and 15.
- `createStorage`, `prune`, `validIdSetFrom` — defined in Task 5, imported
  in Task 15.
- `parseHash`, `createRouter` — defined in Task 6, imported in Task 15.
- `buildTile`, `buildPacketCard`, `buildModal`, `updatePhaseProgress`,
  `updatePacketProgress`, `updateHeroMeter`, `mount` — defined in Task 13,
  imported in Task 15.
- `observeReveals`, `observeTilesInView` — defined in Task 14, imported
  in Task 15.
- Data shape (`CHEATSHEET.phases[].items[].{id, kind, text, options}`)
  consistent across Tasks 4, 5, 7, 13, 15.

---

## Execution Handoff

Plan complete and saved to
`docs/superpowers/plans/2026-04-18-prd-cheatsheet-implementation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per
   task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using
   executing-plans, batch execution with checkpoints.

Which approach?
