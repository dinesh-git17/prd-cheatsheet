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
