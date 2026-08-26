const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyRealtimeTranscriptEvent,
  analyserSamplesToAudioFeatures,
  createRealtimeTranscriptState,
  frequencyBinsToAudioFeatures,
  smoothAudioFeatures,
} = require("../dist/index.js");

test("realtime transcript deltas accumulate and final text is emitted once", () => {
  let state = createRealtimeTranscriptState();
  let update = applyRealtimeTranscriptEvent(state, {
    type: "transcript_partial",
    sessionId: "session-1",
    itemId: "item-1",
    text: "hello ",
  });
  state = update.state;
  assert.equal(update.partialText, "hello ");

  update = applyRealtimeTranscriptEvent(state, {
    type: "transcript_partial",
    sessionId: "session-1",
    itemId: "item-1",
    text: "Jarvis",
  });
  state = update.state;
  assert.equal(update.partialText, "hello Jarvis");

  update = applyRealtimeTranscriptEvent(state, {
    type: "transcript_final",
    sessionId: "session-1",
    itemId: "item-1",
    text: "hello Jarvis",
  });
  state = update.state;
  assert.equal(update.finalText, "hello Jarvis");

  const duplicate = applyRealtimeTranscriptEvent(state, {
    type: "transcript_final",
    sessionId: "session-1",
    itemId: "item-1",
    text: "hello Jarvis",
  });
  assert.equal(duplicate.finalText, undefined);
  assert.deepEqual(duplicate.state, state);
});

test("realtime transcript state ignores events from a stale session", () => {
  let state = createRealtimeTranscriptState("session-current");
  const update = applyRealtimeTranscriptEvent(state, {
    type: "transcript_final",
    sessionId: "session-old",
    itemId: "item-old",
    text: "stale text",
  });
  assert.deepEqual(update.state, state);
  assert.equal(update.finalText, undefined);
});

test("audio features stay normalized and smoothing damps abrupt changes", () => {
  const features = frequencyBinsToAudioFeatures([0, 64, 128, 255, 400]);
  assert.ok(features.low >= 0 && features.low <= 1);
  assert.ok(features.mid >= 0 && features.mid <= 1);
  assert.ok(features.high >= 0 && features.high <= 1);

  const smoothed = smoothAudioFeatures(
    { rms: 0, low: 0, mid: 0, high: 0 },
    { rms: 1, low: 1, mid: 1, high: 1 },
    0.25,
  );
  assert.deepEqual(smoothed, { rms: 0.25, low: 0.25, mid: 0.25, high: 0.25 });
});

test("analyser features use time-domain RMS and shared frequency bands", () => {
  const features = analyserSamplesToAudioFeatures([128, 192, 64], [255, 0, 128, 64]);
  assert.ok(features.rms > 0);
  assert.equal(features.low, 1);
  assert.ok(features.mid >= 0 && features.high >= 0);
});
