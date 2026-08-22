# Jarvis: Voice-Driven Dual-Agent AI Assistant

Jarvis is a desktop AI environment designed around one interface, one persistent context, and two specialized agents:

- **ChatGPT** for conversation, research, explanations, planning, and general reasoning.
- **Codex** for repository inspection, implementation, debugging, tests, simulations, Git operations, and other direct software-engineering work.

The orchestration layer chooses the appropriate agent unless the user explicitly addresses `ChatGPT`, `GPT`, `Chat`, or `Codex`.

## Current status

This repository is at the first implementation milestone. The architecture, core routing domain, model-selection layer, project alias resolver, Electron security boundary, and the first typed ChatGPT streaming vertical slice are implemented.

Codex routing is recognized now, but the Codex SDK adapter is intentionally not connected until the dedicated Codex milestone. Voice, SQLite memory, project persistence, tool execution, and the final React Three Fiber hologram are likewise staged in later milestones rather than being mocked as complete.

See [`docs/MILESTONES.md`](docs/MILESTONES.md) for exact status. The full authoritative product brief is preserved in [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## Architecture

```text
Renderer (React)
      │
      │ narrow typed IPC
      ▼
Electron main process
      │
      ▼
Orchestrator ──► Router ──────► ChatGPT Agent
      │            │
      │            └──────────► Codex Agent (next milestone)
      │
      ├────────► Model selector
      ├────────► Project registry
      ├────────► Memory (planned SQLite)
      ├────────► Permission engine (planned)
      └────────► Tool registry (planned)
```

The renderer has no Node.js integration, no filesystem authority, and no access to API credentials. Privileged work stays in the trusted Electron main process.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/ADR-001-desktop-runtime.md`](docs/ADR-001-desktop-runtime.md).

## Technology choices

- **Desktop:** Electron
- **UI:** React + TypeScript + Vite
- **Core orchestration:** framework-independent TypeScript
- **ChatGPT API:** OpenAI Responses API with streaming
- **Codex:** `@openai/codex-sdk` planned for the Codex milestone
- **3D UI:** React Three Fiber / Three.js planned for the hologram milestone
- **Persistence:** SQLite planned for structured local state

Electron was selected deliberately instead of Tauri for the initial architecture because Codex's SDK is TypeScript-native and wraps the Codex CLI. Keeping agent integration, repository tooling, Git, subprocess control, and task orchestration in one trusted Node runtime avoids introducing a Rust/Node sidecar solely for Codex.

## Model selection

Model choice is not hard-coded at individual call sites. Configuration uses symbolic task tiers and permits environment overrides.

With `AUTO`, the current resolver uses:

- simple/fast conversation → `gpt-5.6-luna`
- balanced reasoning → `gpt-5.6-terra`
- deep reasoning → `gpt-5.6-sol`
- realtime voice → `gpt-realtime-2.1` when the voice adapter is implemented

These mappings live behind `AutoModelSelector` and can change without rewriting agent or UI code.

## Repository layout

```text
jarvis/
├── apps/
│   └── desktop/
│       └── src/
│           ├── main/       # trusted Electron runtime
│           └── renderer/   # React presentation layer
├── packages/
│   ├── core/               # pure orchestration/domain logic
│   └── agents/             # external agent adapters
├── config/              # defaults + project registry example
├── docs/
├── AGENTS.md
└── README.md
```

## Development setup

Requirements:

- Node.js 22 or newer
- npm
- Git
- An OpenAI API key for live ChatGPT requests

Install dependencies:

```bash
npm install
```

Set the API key in your shell. Do not place real credentials in committed files.

macOS/Linux:

```bash
export OPENAI_API_KEY="your-key-here"
```

PowerShell:

```powershell
$env:OPENAI_API_KEY="your-key-here"
```

Start development mode:

```bash
npm run dev
```

Run core tests:

```bash
npm test
```

Build all current packages:

```bash
npm run build
```

## Current interaction examples

Explicit ChatGPT routing:

```text
ChatGPT, explain how virtual memory works.
GPT, help me plan today's work.
Chat, compare two cache policies.
```

Explicit Codex routing:

```text
Codex, inspect my CPU project.
Codex, run the cache tests.
```

The second category currently routes correctly but reports that the Codex adapter is not yet enabled. This is deliberate milestone behavior, not a routing failure.

Automatic routing examples:

```text
How does a cache replacement policy work?
→ ChatGPT

Change the cache controller in my project to pseudo-LRU.
→ Codex
```

Automatic routing is implemented behind an `IntentClassifier` interface. The initial local rule-based classifier is a fallback implementation, not the final architecture. A contextual model-backed classifier and routing evaluation suite are planned.

## Security baseline

- `contextIsolation: true`
- `nodeIntegration: false`
- sandboxed renderer
- no generic `ipcRenderer` exposure
- API key read only by the main process
- secrets ignored by Git
- typed/validated chat IPC payloads
- future subprocess tools must use executable + argument arrays rather than interpolated shell strings
- destructive and externally visible actions will pass through the permission engine

See [`docs/SECURITY.md`](docs/SECURITY.md).

## Next milestone

The next implementation step is to verify the live ChatGPT vertical slice in a network-enabled development environment, then add voice input/output without changing the orchestrator contract. After that, the procedural hologram can consume real audio/state data, followed by Codex SDK integration and repository-scoped task execution.
