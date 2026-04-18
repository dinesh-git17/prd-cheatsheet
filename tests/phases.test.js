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
