const assert = require("node:assert/strict");
const test = require("node:test");
const { initialVoiceSessionState, transitionVoiceSession } = require("../dist/index.js");

test("voice lifecycle moves from capture through transcription and speech", () => {
  let state = transitionVoiceSession(initialVoiceSessionState, {
    type: "begin_listening",
    sessionId: "voice-1",
  });
  state = transitionVoiceSession(state, { type: "begin_transcription" });
  state = transitionVoiceSession(state, { type: "begin_speaking" });

  assert.deepEqual(state, { stage: "SPEAKING", sessionId: "voice-1" });
  assert.deepEqual(transitionVoiceSession(state, { type: "finish" }), { stage: "IDLE" });
});

test("cancellation clears the current voice session at every stage", () => {
  const state = transitionVoiceSession(
    { stage: "TRANSCRIBING", sessionId: "voice-2" },
    { type: "cancel" },
  );

  assert.deepEqual(state, { stage: "IDLE" });
});
