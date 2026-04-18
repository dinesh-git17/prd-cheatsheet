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
      if (!parsed.checks || typeof parsed.checks !== "object" || Array.isArray(parsed.checks)) return defaultState();
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
