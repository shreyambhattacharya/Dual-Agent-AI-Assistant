import { TaskProfile } from "./types";

export type ModelSlot =
  | "conversation_fast"
  | "reasoning"
  | "realtime_voice"
  | "coding"
  | "coding_deep";

export interface ModelConfig {
  conversation_fast: string;
  reasoning: string;
  realtime_voice: string;
  coding: string;
  coding_deep: string;
}

export interface ModelSelection {
  slot: ModelSlot;
  model: string;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  reason: string;
}

const CURRENT_AUTO_MODELS = {
  fast: "gpt-5.6-luna",
  balanced: "gpt-5.6-terra",
  deep: "gpt-5.6-sol",
  realtime: "gpt-realtime-2.1",
} as const;

function resolveConfiguredModel(configured: string, fallback: string): string {
  return configured.toUpperCase() === "AUTO" ? fallback : configured;
}

export class AutoModelSelector {
  constructor(private readonly config: ModelConfig) {}

  selectForChat(task: TaskProfile): ModelSelection {
    if (task.complexity === "HIGH") {
      return {
        slot: "reasoning",
        model: resolveConfiguredModel(this.config.reasoning, CURRENT_AUTO_MODELS.deep),
        reasoningEffort: "high",
        reason: "High-complexity reasoning uses the strongest configured reasoning tier.",
      };
    }

    if (task.complexity === "MEDIUM" || task.kind === "CODE_DISCUSSION") {
      return {
        slot: "reasoning",
        model: resolveConfiguredModel(this.config.reasoning, CURRENT_AUTO_MODELS.balanced),
        reasoningEffort: "medium",
        reason: "Balanced reasoning is appropriate for this request.",
      };
    }

    return {
      slot: "conversation_fast",
      model: resolveConfiguredModel(this.config.conversation_fast, CURRENT_AUTO_MODELS.fast),
      reasoningEffort: "low",
      reason: "Low-complexity conversation favors latency and cost efficiency.",
    };
  }

  selectRealtimeVoice(): ModelSelection {
    return {
      slot: "realtime_voice",
      model: resolveConfiguredModel(this.config.realtime_voice, CURRENT_AUTO_MODELS.realtime),
      reason: "Voice uses an independently configurable realtime model tier.",
    };
  }
}
