# AGENTS.md

## Mission
Build Jarvis as one cohesive desktop assistant with one persistent context and two specialized agents: ChatGPT for conversation/reasoning and Codex for software-engineering execution.

## Architectural boundaries
- Renderer/UI code must not contain OpenAI credentials, filesystem authority, shell authority, or Git authority.
- The trusted desktop main process owns agent adapters, tools, permissions, project access, and secrets.
- `packages/core` contains pure orchestration/domain logic and must remain independent of Electron, React, OpenAI SDKs, and storage implementations.
- Agent implementations depend on core interfaces, not the reverse.
- Voice, memory, tools, permissions, projects, and task execution must remain replaceable modules.
- Do not expose hidden chain-of-thought. Emit concise action/status events only.

## Coding conventions
- TypeScript strict mode is required.
- Prefer small modules with explicit interfaces over large service classes.
- Avoid `any`. If unavoidable at an external boundary, narrow immediately.
- All cross-process payloads must use serializable typed contracts.
- Never interpolate untrusted input into a shell command string. Prefer argument arrays and allowlisted executables.
- Avoid synchronous filesystem/subprocess work on the renderer thread.
- Do not commit secrets, tokens, local repository paths, generated databases, or user-specific memory.

## Routing rules
1. Explicit ChatGPT addressing always routes to ChatGPT.
2. Explicit Codex addressing always routes to Codex.
3. Automatic routing is context-aware and must be implemented behind an `IntentClassifier` interface, not baked into UI components.
4. Repository mutation/execution requests normally route to Codex. Conceptual discussion normally routes to ChatGPT.

## Git and tool safety
- Read/search/build/test/status/diff operations may run without confirmation by default.
- Destructive or externally visible actions must pass through the permission layer.
- `git push`, merge, deployment, credential changes, destructive deletion, system configuration, and hardware flashing require explicit permission by default.
- `git force` is denied by default.

## Definition of done for a change
- Relevant tests pass.
- Type checking passes for touched packages.
- Error paths are handled.
- No secrets are introduced.
- The diff contains no unrelated changes.
- Architectural docs are updated when a boundary or dependency changes.
