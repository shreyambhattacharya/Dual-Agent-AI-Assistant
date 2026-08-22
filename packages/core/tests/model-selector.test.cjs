const assert = require("node:assert/strict");
const test = require("node:test");
const { AutoModelSelector } = require("../dist/model-selector.js");

const config = {
  conversation_fast: "AUTO",
  reasoning: "AUTO",
  realtime_voice: "AUTO",
  speech_to_text: "AUTO",
  text_to_speech: "AUTO",
  coding: "AUTO",
  coding_deep: "AUTO",
};
const selector = new AutoModelSelector(config);
const task = (complexity) => ({
  kind: "CONVERSATION",
  complexity,
  requiresRepositoryAccess: false,
  requiresMutation: false,
});

test("AUTO resolves low-complexity chat to the fast tier", () => {
  assert.equal(selector.selectForChat(task("LOW")).model, "gpt-5.6-luna");
});

test("AUTO resolves medium chat to balanced tier", () => {
  assert.equal(selector.selectForChat(task("MEDIUM")).model, "gpt-5.6-terra");
});

test("AUTO resolves high-complexity chat to strongest reasoning tier", () => {
  assert.equal(selector.selectForChat(task("HIGH")).model, "gpt-5.6-sol");
});

test("explicit configuration overrides AUTO", () => {
  const custom = new AutoModelSelector({ ...config, reasoning: "custom-reasoning-model" });
  assert.equal(custom.selectForChat(task("HIGH")).model, "custom-reasoning-model");
});

test("voice model slots resolve independently", () => {
  assert.equal(selector.selectSpeechToText().model, "gpt-transcribe");
  assert.equal(selector.selectTextToSpeech().model, "gpt-4o-mini-tts");
});
