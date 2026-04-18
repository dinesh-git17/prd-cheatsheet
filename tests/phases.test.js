import { test } from "node:test";
import assert from "node:assert/strict";
import { CHEATSHEET } from "../data/phases.js";

const VALID_KINDS = new Set(["task", "choice"]);

function collectItemIds(cheatsheet) {
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
    visit(phase.items);
    if (phase.gate) visit(phase.gate.items);
    if (phase.antiGate) visit(phase.antiGate.items);
  }
  visit(cheatsheet.extras.artifactSet.items);
  visit(cheatsheet.extras.preCodeCheck.items);
  return ids;
}

function validateItems(items, location, idPrefix) {
  for (const item of items) {
    assert.ok(item.id, `${location}: item missing id`);
    assert.match(item.id, /^[a-z0-9-]+$/, `${location}: bad id format`);
    if (idPrefix) {
      assert.ok(
        item.id.startsWith(idPrefix),
        `${location}: id ${item.id} must start with ${idPrefix}`
      );
    }
    assert.ok(item.kind !== undefined, `${location}: item ${item.id} missing kind`);
    assert.ok(VALID_KINDS.has(item.kind), `${location}: invalid kind ${item.kind}`);
    if (item.kind === "task") {
      assert.ok(item.text, `${location}: task ${item.id} missing text`);
    }
    if (item.kind === "choice") {
      assert.ok(item.text, `${location}: choice ${item.id} missing text`);
      assert.ok(
        Array.isArray(item.options) && item.options.length > 0,
        `${location}: choice ${item.id} missing options[]`
      );
      const optionPrefix = `${item.id}-o`;
      for (const opt of item.options) {
        assert.ok(opt.id, `${location}: choice ${item.id} option missing id`);
        assert.match(opt.id, /^[a-z0-9-]+$/, `${location}: choice ${item.id} option bad id format`);
        assert.ok(
          opt.id.startsWith(optionPrefix),
          `${location}: choice ${item.id} option id ${opt.id} must start with ${optionPrefix}`
        );
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

test("phase ids are unique", () => {
  const seen = new Set();
  const dupes = [];
  for (const phase of CHEATSHEET.phases) {
    if (seen.has(phase.id)) dupes.push(phase.id);
    seen.add(phase.id);
  }
  assert.deepEqual(dupes, [], `duplicate phase ids: ${dupes.join(", ")}`);
});

test("every phase has id, title, subtitle, sigilId, items[]", () => {
  for (const phase of CHEATSHEET.phases) {
    assert.ok(phase.title, `phase ${phase.id}: missing title`);
    assert.ok(phase.subtitle, `phase ${phase.id}: missing subtitle`);
    assert.ok(phase.sigilId, `phase ${phase.id}: missing sigilId`);
    assert.match(phase.sigilId, /^sigil-\d{2}$/, `phase ${phase.id}: bad sigilId`);
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
    validateItems(phase.items, `phase ${phase.id}.items`, `p${phase.id}-`);
    if (phase.gate) validateItems(phase.gate.items, `phase ${phase.id}.gate`, `p${phase.id}-g`);
    if (phase.antiGate) validateItems(phase.antiGate.items, `phase ${phase.id}.antiGate`, `p${phase.id}-a`);
  }
  validateItems(CHEATSHEET.extras.artifactSet.items, "extras.artifactSet", "x-art-");
  validateItems(CHEATSHEET.extras.preCodeCheck.items, "extras.preCodeCheck", "x-pcc-");
});

test("no duplicate item or option ids anywhere in the tree", () => {
  const ids = collectItemIds(CHEATSHEET);
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
