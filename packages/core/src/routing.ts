import { AgentId, RouteDecision, TaskProfile } from "./types";

export interface IntentClassification {
  agent: AgentId;
  confidence: number;
  reason: string;
  task: TaskProfile;
}

export interface IntentClassifier {
  classify(input: string, context?: RoutingContext): Promise<IntentClassification>;
}

export interface RoutingContext {
  activeProjectId?: string;
  recentAgent?: AgentId;
  repositoryContextAvailable?: boolean;
}

interface ExplicitSelection {
  agent: AgentId;
  normalizedInput: string;
}

const CHATGPT_ALIASES = ["chatgpt", "chat gpt", "gpt", "chat"];
const CODEX_ALIASES = ["codex"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchExplicitAlias(input: string, aliases: string[], agent: AgentId): ExplicitSelection | null {
  const alternatives = aliases.map(escapeRegExp).join("|");
  const pattern = new RegExp(
    `^\\s*(?:hey\\s+)?(?:${alternatives})(?:(?:\\s*[,;:\-]\\s*)|(?:\\s+))(?<rest>.+)$`,
    "i",
  );
  const match = input.match(pattern);
  if (!match?.groups?.rest) {
    return null;
  }

  return {
    agent,
    normalizedInput: match.groups.rest.trim(),
  };
}

export function parseExplicitAgent(input: string): ExplicitSelection | null {
  return (
    matchExplicitAlias(input, CODEX_ALIASES, "CODEX") ??
    matchExplicitAlias(input, CHATGPT_ALIASES, "CHATGPT")
  );
}

export class RuleBasedIntentClassifier implements IntentClassifier {
  async classify(input: string, context: RoutingContext = {}): Promise<IntentClassification> {
    const text = input.trim().toLowerCase();

    const mutationIntent =
      /\b(implement|modify|change|edit|refactor|fix|create|delete|remove|patch|write)\b/.test(text) &&
      /\b(code|file|repo|repository|project|test|implementation|module|controller|parser|feature|bug)\b/.test(text);

    const executionIntent =
      /\b(run|execute|compile|build|test|simulate|lint|format)\b/.test(text) &&
      /\b(test|tests|suite|simulation|simulator|build|compiler|verilator|make|cmake|repo|project)\b/.test(text);

    const gitIntent = /\b(commit|push|pull request|merge|branch|git diff|git status)\b/.test(text);
    const inspectionIntent =
      /\b(inspect|search|read|look through|analyze|review)\b/.test(text) &&
      /\b(repo|repository|codebase|source|project|files?)\b/.test(text);

    if (mutationIntent || executionIntent || gitIntent || inspectionIntent) {
      return {
        agent: "CODEX",
        confidence: 0.86,
        reason: "The request requires repository-level software-engineering execution.",
        task: {
          kind: gitIntent
            ? "GIT_OPERATION"
            : executionIntent
              ? "BUILD_OR_TEST"
              : mutationIntent
                ? "CODE_MODIFICATION"
                : "REPOSITORY_INSPECTION",
          complexity: mutationIntent ? "HIGH" : "MEDIUM",
          requiresRepositoryAccess: true,
          requiresMutation: mutationIntent || gitIntent,
        },
      };
    }

    const codeDiscussion = /\b(code|cache|uart|cpu|algorithm|function|class|api|architecture|debugging)\b/.test(text);
    const highComplexity = text.length > 450 || /\b(deep|rigorous|architecture|tradeoffs|prove|derive)\b/.test(text);

    return {
      agent: "CHATGPT",
      confidence: context.repositoryContextAvailable && codeDiscussion ? 0.7 : 0.82,
      reason: codeDiscussion
        ? "The request is conceptual and does not require direct repository manipulation."
        : "The request is conversational, explanatory, or planning-oriented.",
      task: {
        kind: codeDiscussion ? "CODE_DISCUSSION" : "CONVERSATION",
        complexity: highComplexity ? "HIGH" : text.length < 120 ? "LOW" : "MEDIUM",
        requiresRepositoryAccess: false,
        requiresMutation: false,
      },
    };
  }
}

export class AgentRouter {
  constructor(private readonly classifier: IntentClassifier) {}

  async route(input: string, context: RoutingContext = {}): Promise<RouteDecision> {
    const explicit = parseExplicitAgent(input);
    if (explicit) {
      const task = await this.classifier.classify(explicit.normalizedInput, context);
      return {
        agent: explicit.agent,
        explicit: true,
        confidence: 1,
        normalizedInput: explicit.normalizedInput,
        reason: `Explicit ${explicit.agent} selection overrides automatic routing.`,
        task: task.task,
      };
    }

    const classification = await this.classifier.classify(input, context);
    return {
      agent: classification.agent,
      explicit: false,
      confidence: classification.confidence,
      normalizedInput: input.trim(),
      reason: classification.reason,
      task: classification.task,
    };
  }
}
