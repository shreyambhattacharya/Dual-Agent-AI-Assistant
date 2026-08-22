const assert = require("node:assert/strict");
const test = require("node:test");
const { AgentRouter, parseExplicitAgent, RuleBasedIntentClassifier } = require("../dist/routing.js");

const router = new AgentRouter(new RuleBasedIntentClassifier());

test("explicit ChatGPT aliases select ChatGPT and strip the address", () => {
  assert.deepEqual(parseExplicitAgent("ChatGPT, explain virtual memory."), {
    agent: "CHATGPT",
    normalizedInput: "explain virtual memory.",
  });
  assert.deepEqual(parseExplicitAgent("Hey GPT explain caches"), {
    agent: "CHATGPT",
    normalizedInput: "explain caches",
  });
  assert.deepEqual(parseExplicitAgent("Chat: help me plan today"), {
    agent: "CHATGPT",
    normalizedInput: "help me plan today",
  });
});

test("explicit Codex selection overrides automatic classification", async () => {
  const decision = await router.route("Codex, explain what a TLB is.");
  assert.equal(decision.agent, "CODEX");
  assert.equal(decision.explicit, true);
  assert.equal(decision.confidence, 1);
});

test("repository modification routes to Codex", async () => {
  const decision = await router.route("Change the cache controller in my project to pseudo-LRU.");
  assert.equal(decision.agent, "CODEX");
  assert.equal(decision.task.requiresRepositoryAccess, true);
  assert.equal(decision.task.requiresMutation, true);
});

test("conceptual code explanation routes to ChatGPT", async () => {
  const decision = await router.route("How does a cache replacement policy work?");
  assert.equal(decision.agent, "CHATGPT");
  assert.equal(decision.task.requiresRepositoryAccess, false);
});
