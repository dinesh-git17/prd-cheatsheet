# TESTING

Manual smoke checklist. Run this after every meaningful change.

## Setup

1. Run `npm test` — all pure-logic tests must pass.
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
- [ ] Reset flow: click `RESET PROGRESS` → inline confirm → `confirm`
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
- Best Practices >= 95 (hard gate)
- Performance >= 80 mobile / >= 90 desktop (warn-only, not merge-blocking)
