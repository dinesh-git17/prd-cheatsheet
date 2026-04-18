import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseHash, createRouter } from "../scripts/router.js";

const validPhases = new Set(["01","02","03","04","05","06","07","08","09","10"]);

describe("parseHash", () => {
  test("empty → grid", () => {
    assert.deepEqual(parseHash("", validPhases), { kind: "grid" });
    assert.deepEqual(parseHash("#", validPhases), { kind: "grid" });
  });
  test("#phase-07 → phase open", () => {
    assert.deepEqual(parseHash("#phase-07", validPhases), { kind: "phase", phaseId: "07" });
  });
  test("uppercase PHASE works", () => {
    assert.deepEqual(parseHash("#PHASE-03", validPhases), { kind: "phase", phaseId: "03" });
  });
  test("bogus hash → invalid", () => {
    assert.deepEqual(parseHash("#garbage", validPhases), { kind: "invalid" });
  });
  test("out-of-range phase → invalid", () => {
    assert.deepEqual(parseHash("#phase-99", validPhases), { kind: "invalid" });
  });
  test("phase-1 without zero-pad → invalid (strict)", () => {
    assert.deepEqual(parseHash("#phase-1", validPhases), { kind: "invalid" });
  });
});

describe("createRouter(historyShim, locationShim)", () => {
  function makeHistoryShim() {
    const stack = [{ state: null, url: "/" }];
    const listeners = new Set();
    return {
      get length() { return stack.length; },
      pushState(state, _title, url) { stack.push({ state, url }); },
      replaceState(state, _title, url) { stack[stack.length - 1] = { state, url }; },
      back() {
        if (stack.length > 1) stack.pop();
        for (const l of listeners) l();
      },
      addListener(cb) { listeners.add(cb); },
      get top() { return stack[stack.length - 1]; },
    };
  }

  test("openFromTile pushes history and marks pushed=true", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("03");
    assert.equal(hist.top.url, "#phase-03");
    assert.equal(r.isCurrentPushed(), true);
  });

  test("openFromDeepLink does NOT push (pushed=false)", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "#phase-07", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromDeepLink("07");
    // no push — history length unchanged
    assert.equal(hist.length, 1);
    assert.equal(r.isCurrentPushed(), false);
  });

  test("close after push uses history.back", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("03");
    assert.equal(hist.length, 2);
    r.close();
    assert.equal(hist.length, 1);
  });

  test("close after deep-link uses replaceState to drop hash", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "#phase-07", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromDeepLink("07");
    r.close();
    assert.equal(hist.top.url, "/");
  });

  test("close after push leaves currentPushed=false so a second cycle works", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("03");
    r.close();
    assert.equal(r.isCurrentPushed(), false);
    r.openFromTile("05");
    assert.equal(r.isCurrentPushed(), true);
  });

  test("clearInvalidHash drops the hash via replaceState", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "#garbage", pathname: "/", search: "?a=1" };
    const r = createRouter(hist, loc);
    r.clearInvalidHash();
    assert.equal(hist.top.url, "/?a=1");
  });

  test("resetPushed clears the flag when called externally", () => {
    const hist = makeHistoryShim();
    const loc = { hash: "", pathname: "/", search: "" };
    const r = createRouter(hist, loc);
    r.openFromTile("07");
    assert.equal(r.isCurrentPushed(), true);
    r.resetPushed();
    assert.equal(r.isCurrentPushed(), false);
  });
});
