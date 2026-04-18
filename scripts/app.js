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
      link.innerHTML = `clear ${ticked} checks? <span class="cancel">cancel</span> <span class="confirm">confirm</span>`;
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
