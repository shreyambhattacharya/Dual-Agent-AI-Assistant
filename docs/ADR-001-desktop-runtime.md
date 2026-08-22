# ADR-001: Use Electron as the initial desktop runtime

Status: Accepted

## Context
Jarvis requires a trusted local runtime for OpenAI credentials, Codex integration, Git, repository access, subprocesses, audio coordination, persistent storage, and task cancellation. The Codex SDK is distributed as a TypeScript package and wraps the Codex CLI.

## Decision
Use Electron with React + TypeScript. Keep all privileged capabilities in the main process and expose a minimal typed preload API to the renderer.

## Consequences
Benefits:
- Direct Codex SDK integration without a sidecar.
- One primary language across UI, orchestration adapters, and local tooling.
- Straightforward event streaming and cancellation.
- Mature desktop packaging and debugging ecosystem.

Costs:
- Higher baseline memory footprint than Tauri.
- Electron security requires disciplined process isolation.

Mitigations:
- `contextIsolation: true`.
- `nodeIntegration: false`.
- sandboxed renderer.
- no generic `ipcRenderer` exposure.
- strict IPC allowlist and payload validation as IPC surface grows.
