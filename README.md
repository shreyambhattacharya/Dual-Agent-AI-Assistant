# Jarvis: Voice-Driven Dual-Agent AI Assistant

Jarvis is a desktop AI environment designed around one interface, one persistent context, and two specialized agents:

- **ChatGPT** for conversation, research, explanations, planning, and general reasoning.
- **Codex** for repository inspection, implementation, debugging, tests, simulations, Git operations, and other direct software-engineering work.

The orchestration layer chooses the appropriate agent unless the user explicitly addresses `ChatGPT`, `GPT`, `Chat`, or `Codex`.

## Current status

This repository has the M0/M1 foundation, the M2 voice vertical slice and realtime voice foundation, and the M3 procedural hologram. The architecture, core routing domain, model-selection layer, project alias resolver, Electron security boundary, typed ChatGPT streaming path, microphone selection, push-to-talk recording, realtime transcription over browser WebRTC, server VAD, partial transcript drafts, barge-in cancellation, file transcription fallback, TTS playback, and the React Three Fiber visual layer are implemented.

Codex routing is recognized now, but the Codex SDK adapter is intentionally not connected until the dedicated Codex milestone. Production wake-word detection, SQLite memory, project persistence, and tool execution remain staged rather than being mocked as complete. A no-op wake-word interface and audio-feature foundation are present so those modules can be replaced later.

See [`docs/MILESTONES.md`](docs/MILESTONES.md) for exact status. The full authoritative product brief is preserved in [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## Architecture

```text
Renderer (React)
      │
      │ narrow typed IPC
      ▼
Electron main process
      │
      ├────────► Ephemeral realtime session provider
      │                         │
      │                         └──► OpenAI Realtime transcription over browser WebRTC
      │                                (renderer holds only a short-lived client secret)
      │
      ├────────► Speech-to-text provider
      ├────────► Text-to-speech provider
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

The renderer’s hologram is a replaceable presentation module. A pure visual mapper converts the public `AppState`, active agent, and semantic audio features into stable targets; React Three Fiber’s frame loop damps those targets into a procedural core, independent orbital rings, an energy shell, and a bounded particle field. WebGL failures and unavailable contexts use the CSS fallback, while `FULL` and `REDUCED` profiles clamp device pixel ratio and scene complexity.

The renderer has no Node.js integration, no filesystem authority, and no access to API credentials. Privileged work stays in the trusted Electron main process.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/ADR-001-desktop-runtime.md`](docs/ADR-001-desktop-runtime.md).

## Technology choices

- **Desktop:** Electron
- **UI:** React + TypeScript + Vite
- **Core orchestration:** framework-independent TypeScript
- **ChatGPT API:** OpenAI Responses API with streaming
- **Voice input/output:** browser WebRTC to an OpenAI Realtime transcription session, with MediaRecorder/file transcription and TTS fallback
- **Codex:** `@openai/codex-sdk` planned for the Codex milestone
- **3D UI:** React Three Fiber + Three.js procedural hologram with CSS fallback
- **Persistence:** SQLite planned for structured local state

Electron was selected deliberately instead of Tauri for the initial architecture because Codex's SDK is TypeScript-native and wraps the Codex CLI. Keeping agent integration, repository tooling, Git, subprocess control, and task orchestration in one trusted Node runtime avoids introducing a Rust/Node sidecar solely for Codex.

## Model selection

Model choice is not hard-coded at individual call sites. Configuration uses symbolic task tiers and permits environment overrides.

With `AUTO`, the current resolver uses:

- simple/fast conversation → `gpt-5.6-luna`
- balanced reasoning → `gpt-5.6-terra`
- deep reasoning → `gpt-5.6-sol`
- realtime voice → `gpt-realtime-2.1` when the voice adapter is implemented
- realtime transcription → `gpt-live-transcribe` with server VAD
- speech-to-text → `gpt-transcribe`
- text-to-speech → `gpt-4o-mini-tts`

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
│   ├── voice/              # pure voice contracts, device rules, lifecycle
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

Run all package tests:

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

## Voice slice

The initial M2 flow is deliberately push-to-talk and turn-based:

```text
microphone selection → MediaRecorder → typed voice IPC → gpt-transcribe
→ existing startChat/orchestrator path → streamed assistant text
→ gpt-4o-mini-tts → local audio playback
```

The transcript is submitted through the same router as typed text and is rendered as one user message. Pressing MIC while speech is playing stops playback and starts a new recording; STOP cancels capture, provider calls, chat, or playback as applicable.

Realtime mode is opt-in from the voice-mode selector:

```text
trusted main process → short-lived client secret
→ renderer WebRTC microphone track → OpenAI Realtime transcription session
→ VAD speech_started / speech_stopped + transcript deltas
→ draft transcript → one final transcript → existing startChat/orchestrator path
```

The Realtime session is transcription-only; it never answers independently. Partial text is a draft, final text is submitted once per provider item, and `speech_started` interrupts active chat cancellation, TTS cancellation, and local playback. If negotiation or the connection fails, the UI returns to push-to-talk. The transport decision and security implications are recorded in [`docs/ADR-002-realtime-voice-transport.md`](docs/ADR-002-realtime-voice-transport.md).

## Procedural hologram

The hologram accepts semantic input rather than owning voice or orchestration state:

```text
push-to-talk / realtime microphone analyser ─┐
                                             ├─► audio features ─► visual mapper ─► R3F frame loop
TTS HTMLAudioElement analyser ───────────────┘                         │
                                                                       └─► CSS fallback when WebGL is unavailable
```

Microphone and assistant playback both expose normalized `rms`, `low`, `mid`, and `high` features. The scene has distinct behavior for every public app state and displays the active agent and audio source in the DOM overlay. For visual QA, run the renderer and open `?hologramHarness=1&hologramQuality=REDUCED`; the development-only harness can inject all states, agents, audio sources, and band levels without an Electron preload.

## Next milestone

The next implementation step is live verification of the ChatGPT and realtime voice paths in a network-enabled environment where Electron launches successfully, followed by Codex SDK integration.
