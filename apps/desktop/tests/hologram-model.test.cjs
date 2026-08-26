const assert = require("node:assert/strict");
const test = require("node:test");
const {
  hologramStatusLabel,
  resolveHologramVisualState,
} = require("../dist/hologram-tests/model.js");
const { damp } = require("../dist/hologram-tests/animation.js");
const { resolveHologramQuality } = require("../dist/hologram-tests/quality.js");

const states = [
  "IDLE",
  "LISTENING",
  "TRANSCRIBING",
  "ROUTING",
  "THINKING",
  "TOOL_CALL",
  "CODEX_WORKING",
  "SPEAKING",
  "WAITING_FOR_PERMISSION",
  "ERROR",
  "OFFLINE",
];

function input(state, audio = { source: "NONE", rms: 0, low: 0, mid: 0, high: 0 }) {
  return { state, agent: "CHATGPT", audio };
}

test("every AppState has a deliberate label and finite visual targets", () => {
  states.forEach((state) => {
    const visual = resolveHologramVisualState(input(state));
    assert.ok(hologramStatusLabel(state));
    Object.values(visual).forEach((value) => assert.equal(Number.isFinite(value), true));
    assert.ok(visual.coreScale >= 0.72 && visual.coreScale <= 1.55);
    assert.ok(visual.warningIntensity >= 0 && visual.warningIntensity <= 1);
  });
});

test("audio bands map to their intended visual targets", () => {
  const base = resolveHologramVisualState(input("LISTENING"));
  const rms = resolveHologramVisualState(input("LISTENING", { source: "USER", rms: 1, low: 0, mid: 0, high: 0 }));
  const low = resolveHologramVisualState(input("LISTENING", { source: "USER", rms: 0, low: 1, mid: 0, high: 0 }));
  const mid = resolveHologramVisualState(input("LISTENING", { source: "USER", rms: 0, low: 0, mid: 1, high: 0 }));
  const high = resolveHologramVisualState(input("LISTENING", { source: "USER", rms: 0, low: 0, mid: 0, high: 1 }));
  assert.ok(rms.coreScale > base.coreScale);
  assert.ok(low.ringSpread > base.ringSpread);
  assert.ok(mid.meshDistortion > base.meshDistortion);
  assert.ok(high.particleActivity > base.particleActivity);
});

test("audio input is clamped and assistant audio uses the same mapping", () => {
  const visual = resolveHologramVisualState(input("SPEAKING", {
    source: "ASSISTANT",
    rms: 40,
    low: -2,
    mid: 4,
    high: Number.NaN,
  }));
  Object.values(visual).forEach((value) => assert.equal(Number.isFinite(value), true));
  assert.ok(visual.meshDistortion <= 0.75);
  assert.ok(visual.particleActivity <= 1);
});

test("quality modes preserve semantic behavior while reducing rendering cost", () => {
  const full = resolveHologramQuality({ forced: "FULL" });
  const reduced = resolveHologramQuality({ forced: "REDUCED", prefersReducedMotion: true });
  assert.ok(full.particleCount > reduced.particleCount);
  assert.ok(full.dpr[1] > reduced.dpr[1]);
  assert.ok(reduced.motionScale < 1);
  assert.equal(resolveHologramQuality({ hardwareConcurrency: 2 }).mode, "REDUCED");
});

test("visual targets transition through damped values", () => {
  assert.ok(damp(0, 1, 6, 1 / 60) > 0);
  assert.ok(damp(0, 1, 6, 1 / 60) < 1);
  assert.equal(damp(0, 1, 0, 1), 0);
});
