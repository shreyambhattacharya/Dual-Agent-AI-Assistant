import OpenAI from "openai";
import { Agent, AgentRequest, AgentStreamEvent } from "@jarvis/core";

export interface OpenAIChatAgentOptions {
  apiKey: string;
  instructions?: string;
}

const DEFAULT_INSTRUCTIONS = [
  "You are Jarvis, the conversational and reasoning agent inside a dual-agent desktop assistant.",
  "Answer the user's request directly and clearly.",
  "Do not claim to have modified repositories or run tools unless the orchestrator supplied those results.",
  "Do not expose hidden chain-of-thought. Give concise conclusions and useful explanations instead.",
].join(" ");

export class OpenAIChatAgent implements Agent {
  readonly id = "CHATGPT" as const;
  private readonly client: OpenAI;
  private readonly instructions: string;

  constructor(options: OpenAIChatAgentOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.instructions = options.instructions ?? DEFAULT_INSTRUCTIONS;
  }

  async *stream(request: AgentRequest): AsyncIterable<AgentStreamEvent> {
    if (!request.model) {
      yield { type: "error", code: "MODEL_REQUIRED", message: "No model was selected for ChatGPT." };
      return;
    }

    yield { type: "started", agent: this.id, model: request.model };

    const stream = await this.client.responses.create(
      {
        model: request.model,
        instructions: this.instructions,
        input: request.text,
        stream: true,
        store: false,
      },
      request.signal ? { signal: request.signal } : undefined,
    );

    for await (const event of stream) {
      if (request.signal?.aborted) {
        yield { type: "cancelled" };
        return;
      }

      if (event.type === "response.output_text.delta") {
        yield { type: "text_delta", delta: event.delta };
        continue;
      }

      if (event.type === "response.completed") {
        yield { type: "completed", responseId: event.response.id };
        return;
      }

      if (event.type === "response.failed") {
        yield {
          type: "error",
          code: "OPENAI_RESPONSE_FAILED",
          message: event.response.error?.message ?? "The OpenAI response failed.",
        };
        return;
      }
    }
  }
}
