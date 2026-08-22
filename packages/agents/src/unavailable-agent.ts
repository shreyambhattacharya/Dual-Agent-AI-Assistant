import { Agent, AgentRequest, AgentStreamEvent, AgentId } from "@jarvis/core";

export class UnavailableAgent implements Agent {
  constructor(
    readonly id: AgentId,
    private readonly message: string,
  ) {}

  async *stream(_request: AgentRequest): AsyncIterable<AgentStreamEvent> {
    yield { type: "started", agent: this.id };
    yield { type: "error", code: "AGENT_NOT_IMPLEMENTED", message: this.message };
  }
}
