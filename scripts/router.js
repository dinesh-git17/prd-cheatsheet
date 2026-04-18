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
