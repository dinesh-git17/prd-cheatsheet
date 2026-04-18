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

  test("load() discards when checks is an array (not a plain object)", () => {
    const stored = JSON.stringify({ checks: [], schemaVersion: 1 });
    const shim = makeShim({ "prd-cheatsheet.v1.state": stored });
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
