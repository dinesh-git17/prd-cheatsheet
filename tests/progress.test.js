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
