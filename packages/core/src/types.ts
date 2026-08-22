export type AgentId = "CHATGPT" | "CODEX";

export type AppState =
  | "IDLE"
  | "LISTENING"
  | "TRANSCRIBING"
  | "ROUTING"
  | "THINKING"
  | "TOOL_CALL"
  | "CODEX_WORKING"
  | "SPEAKING"
  | "WAITING_FOR_PERMISSION"
  | "ERROR"
  | "OFFLINE";

export type TaskComplexity = "LOW" | "MEDIUM" | "HIGH";

export type TaskKind =
  | "CONVERSATION"
  | "EXPLANATION"
  | "RESEARCH"
  | "PLANNING"
  | "CODE_DISCUSSION"
  | "REPOSITORY_INSPECTION"
  | "CODE_MODIFICATION"
  | "BUILD_OR_TEST"
  | "GIT_OPERATION";

export interface TaskProfile {
  kind: TaskKind;
  complexity: TaskComplexity;
  requiresRepositoryAccess: boolean;
  requiresMutation: boolean;
}

export interface RouteDecision {
  agent: AgentId;
  explicit: boolean;
  confidence: number;
  normalizedInput: string;
  reason: string;
  task: TaskProfile;
}

export interface AgentRequest {
  requestId: string;
  text: string;
  model?: string;
  projectId?: string;
  signal?: AbortSignal;
}

export type AgentStreamEvent =
  | { type: "started"; agent: AgentId; model?: string }
  | { type: "status"; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "completed"; responseId?: string }
  | { type: "cancelled" }
  | { type: "error"; message: string; code?: string };

export interface Agent {
  readonly id: AgentId;
  stream(request: AgentRequest): AsyncIterable<AgentStreamEvent>;
}

export type OrchestratorEvent =
  | { type: "state"; state: AppState }
  | { type: "route"; decision: RouteDecision }
  | { type: "agent"; event: AgentStreamEvent };
