import { AgentRouter, RoutingContext } from "./routing";
import { AutoModelSelector } from "./model-selector";
import { Agent, AgentRequest, OrchestratorEvent, RouteDecision } from "./types";

export class Orchestrator {
  private readonly agents: ReadonlyMap<string, Agent>;

  constructor(
    private readonly router: AgentRouter,
    private readonly modelSelector: AutoModelSelector,
    agents: Agent[],
  ) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
  }

  async *handle(
    request: Omit<AgentRequest, "model" | "text"> & { text: string },
    context: RoutingContext = {},
  ): AsyncIterable<OrchestratorEvent> {
    yield { type: "state", state: "ROUTING" };

    let decision: RouteDecision;
    try {
      decision = await this.router.route(request.text, context);
    } catch (error) {
      if (request.signal?.aborted) {
        yield { type: "agent", event: { type: "cancelled" } };
        yield { type: "state", state: "IDLE" };
        return;
      }

      yield {
        type: "agent",
        event: {
          type: "error",
          code: "ROUTING_FAILURE",
          message: error instanceof Error ? error.message : "Unable to determine which agent should handle the request.",
        },
      };
      yield { type: "state", state: "ERROR" };
      return;
    }

    yield { type: "route", decision };

    const agent = this.agents.get(decision.agent);
    if (!agent) {
      yield {
        type: "agent",
        event: {
          type: "error",
          code: "AGENT_UNAVAILABLE",
          message: `${decision.agent} is not enabled in this build yet.`,
        },
      };
      yield { type: "state", state: "ERROR" };
      return;
    }

    const selection = decision.agent === "CHATGPT" ? this.modelSelector.selectForChat(decision.task) : undefined;

    yield {
      type: "state",
      state: decision.agent === "CODEX" ? "CODEX_WORKING" : "THINKING",
    };

    try {
      for await (const event of agent.stream({
        ...request,
        text: decision.normalizedInput,
        model: selection?.model,
      })) {
        yield { type: "agent", event };

        if (event.type === "error") {
          yield { type: "state", state: "ERROR" };
          return;
        }

        if (event.type === "cancelled") {
          yield { type: "state", state: "IDLE" };
          return;
        }
      }

      if (request.signal?.aborted) {
        yield { type: "agent", event: { type: "cancelled" } };
      }

      yield { type: "state", state: "IDLE" };
    } catch (error) {
      if (request.signal?.aborted) {
        yield { type: "agent", event: { type: "cancelled" } };
        yield { type: "state", state: "IDLE" };
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown agent failure.";
      yield { type: "state", state: "ERROR" };
      yield { type: "agent", event: { type: "error", message, code: "AGENT_FAILURE" } };
    }
  }
}
