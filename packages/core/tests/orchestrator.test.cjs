const assert = require("node:assert/strict");
const test = require("node:test");
const {
  AgentRouter,
  AutoModelSelector,
  Orchestrator,
  RuleBasedIntentClassifier,
} = require("../dist/index.js");

const models = {
  conversation_fast: "AUTO",
  reasoning: "AUTO",
  realtime_voice: "AUTO",
  speech_to_text: "AUTO",
  text_to_speech: "AUTO",
  coding: "AUTO",
  coding_deep: "AUTO",
};

class CapturingChatAgent {
  id = "CHATGPT";
  request = null;
  async *stream(request) {
    this.request = request;
    yield { type: "started", agent: "CHATGPT", model: request.model };
    yield { type: "text_delta", delta: "hello" };
    yield { type: "completed", responseId: "resp_test" };
  }
}

class ErrorCodexAgent {
  id = "CODEX";
  async *stream() {
    yield { type: "started", agent: "CODEX" };
    yield { type: "error", code: "NOT_READY", message: "Codex is not ready." };
  }
}

function makeOrchestrator(agents) {
  return new Orchestrator(
    new AgentRouter(new RuleBasedIntentClassifier()),
    new AutoModelSelector(models),
    agents,
  );
}

test("orchestrator streams a normalized ChatGPT request and returns to idle", async () => {
  const chat = new CapturingChatAgent();
  const events = [];
  for await (const event of makeOrchestrator([chat]).handle({
    requestId: "request-123",
    text: "ChatGPT, hello there",
  })) {
    events.push(event);
  }

  assert.equal(chat.request.text, "hello there");
  assert.equal(chat.request.model, "gpt-5.6-luna");
  assert.equal(events.find((event) => event.type === "route").decision.agent, "CHATGPT");
  assert.equal(events.at(-1).state, "IDLE");
});

test("agent errors terminate in ERROR state", async () => {
  const events = [];
  for await (const event of makeOrchestrator([new ErrorCodexAgent()]).handle({
    requestId: "request-456",
    text: "Codex, run the tests",
  })) {
    events.push(event);
  }

  assert.equal(events.at(-1).type, "state");
  assert.equal(events.at(-1).state, "ERROR");
});

test("aborted agent failures normalize to cancellation and return to idle", async () => {
  const controller = new AbortController();
  class AbortingChatAgent {
    id = "CHATGPT";
    async *stream() {
      controller.abort();
      throw new Error("The request was aborted.");
    }
  }

  const events = [];
  for await (const event of makeOrchestrator([new AbortingChatAgent()]).handle({
    requestId: "request-789",
    text: "Explain cancellation",
    signal: controller.signal,
  })) {
    events.push(event);
  }

  assert.equal(events.some((event) => event.type === "agent" && event.event.type === "cancelled"), true);
  assert.equal(events.some((event) => event.type === "agent" && event.event.type === "error"), false);
  assert.equal(events.at(-1).state, "IDLE");
});

test("routing failures are returned as normalized errors", async () => {
  class FailingClassifier {
    async classify() {
      throw new Error("classifier unavailable");
    }
  }

  const orchestrator = new Orchestrator(
    new AgentRouter(new FailingClassifier()),
    new AutoModelSelector(models),
    [],
  );
  const events = [];
  for await (const event of orchestrator.handle({
    requestId: "request-901",
    text: "Hello Jarvis",
  })) {
    events.push(event);
  }

  const error = events.find((event) => event.type === "agent" && event.event.type === "error");
  assert.equal(error.event.code, "ROUTING_FAILURE");
  assert.equal(events.at(-1).state, "ERROR");
});
