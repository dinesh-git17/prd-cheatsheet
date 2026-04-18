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
