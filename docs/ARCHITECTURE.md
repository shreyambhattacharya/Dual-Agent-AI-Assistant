# Jarvis Architecture

## Architectural goal
Jarvis is one desktop application with a unified conversation and task surface. ChatGPT and Codex are specialized agents behind an orchestration layer rather than separate products in the UI.

```mermaid
flowchart TD
    U[User: voice or text] --> UI[Renderer UI]
    UI --> IPC[Typed IPC bridge]
    UI -->|WebRTC + ephemeral secret| RT[OpenAI Realtime transcription]
    RT -->|VAD + transcript events| UI
    IPC --> O[Orchestrator]
    O --> R[Router]
    R --> C[ChatGPT Agent]
    R --> X[Codex Agent]
    O --> P[Project Registry]
    O --> M[Memory]
    O --> T[Tool Registry]
    T --> FS[Filesystem]
    T --> G[Git/GitHub]
    T --> SH[Safe subprocess]
    O --> PM[Permission Engine]
    C --> MR[Model Selector]
    X --> MR
    O --> E[Normalized UI events]
    E --> IPC
    IPC --> UI
```

## Process trust boundary

### Renderer process: untrusted presentation layer
Responsibilities:
- React UI and state rendering.
- Text input and message rendering.
- Microphone permission, device selection, and MediaRecorder capture.
- Realtime WebRTC microphone transport using only a short-lived client secret returned by the trusted process.
- Realtime VAD/transcript event handling, draft rendering, and local playback interruption.
- Local audio playback of bytes returned by the trusted process.
- Hologram rendering and audio-reactive animation.
- Diff/task/status presentation.
- User permission prompts.

Prohibited:
- Reading API keys.
- Direct filesystem access.
- Direct shell/Git execution.
- Direct Codex or OpenAI SDK use.

Electron is configured with `contextIsolation: true`, `nodeIntegration: false`, and a narrow preload bridge.

### Main process: trusted application backend
Responsibilities:
- Orchestration.
- Agent adapters.
- OpenAI credentials.
- Creation of short-lived Realtime client secrets using the long-lived API key.
- Codex SDK.
- Project registry and memory stores.
- Tool execution and permissions.
- Task cancellation.
- Audit logging.

## Why Electron instead of Tauri
Tauri remains viable, but Electron is the deliberate initial choice because the Codex SDK is TypeScript-native and wraps the Codex CLI. Keeping Codex, OpenAI API integration, safe subprocess control, Git, SQLite bindings, and orchestration in one trusted Node runtime removes a Rust-to-Node sidecar boundary and makes session/cancellation/event plumbing simpler.

The main security cost of Electron is addressed by keeping Node authority out of the renderer and exposing only explicit IPC methods through the preload script.

On Windows 11 build 26200, the main process applies a narrowly scoped Electron compatibility workaround for a Chromium GPU child-process sandbox regression. It keeps renderer sandboxing enabled and only changes GPU process placement/sandboxing; the workaround is isolated in the desktop main process and can be disabled with `JARVIS_DISABLE_WINDOWS_26200_WORKAROUND=1` for diagnostics.

This decision can be revisited if memory footprint becomes a material product constraint.

## Core package
`packages/core` contains pure domain logic:
- agent identifiers and task profiles;
- explicit agent parsing;
- intent-classifier abstraction;
- model selection;
- project alias resolution;
- orchestration event contracts.

It does not import Electron, React, OpenAI, SQLite, or filesystem APIs.

## Agent adapters
`packages/agents` implements agent interfaces.

### ChatGPT
The first vertical slice uses the OpenAI Responses API with streaming. Model choice is delegated to the model selector rather than hard-coded at the call site.

### Codex
Planned implementation uses `@openai/codex-sdk` in the main process. A Codex thread will be scoped to a registered repository and its lifecycle will be represented as an explicit task. SDK events will be normalized into public action/status events; private reasoning is never forwarded to the renderer or audit log.

## Model selection
Configuration stores symbolic slots such as `conversation_fast`, `reasoning`, `realtime_voice`, `realtime_transcription`, `speech_to_text`, `text_to_speech`, `coding`, and `coding_deep`. `AUTO` is resolved at runtime.

Initial current-capability defaults:
- low-latency simple text: GPT-5.6 Luna;
- balanced text reasoning: GPT-5.6 Terra;
- deep reasoning: GPT-5.6 Sol;
- realtime voice: resolved independently by the future voice adapter;
- realtime transcription: `gpt-live-transcribe` with server VAD;
- speech-to-text: `gpt-transcribe` for completed recordings;
- text-to-speech: `gpt-4o-mini-tts` for initial playback;
- Codex model: delegated to the Codex integration/configuration rather than the ChatGPT adapter.

Environment overrides can replace every resolved model without code changes.

## Routing design
Explicit addressing is deterministic and has highest priority. Automatic routing is behind `IntentClassifier`, allowing a rule-based local fallback today and a contextual model classifier later.

Automatic classification emits a `RouteDecision` containing:
- selected agent;
- confidence;
- reason suitable for UI/audit display;
- normalized user input with any explicit prefix removed.

## Project registry
Project aliases are normalized and resolved by a dedicated registry. Persistent storage will later move to SQLite, but alias resolution remains pure domain logic.

## Task model
Long-running work will use explicit task objects rather than implicit prompt chains. Task state will include agent, project, goal, phase, timestamps, cancellation token, tool activity, changed files, test results, and permission requests.

## Voice boundary
Voice is a transport and UI-state source, not an alternate orchestrator. The implemented M2 pipeline is:

`selected microphone -> renderer MediaRecorder -> typed voice:transcribe IPC -> main-process transcription provider -> transcript -> existing startChat IPC -> same router/orchestrator -> streamed text -> typed voice:synthesize IPC -> renderer audio playback`

The push-to-talk fallback remains turn-based and uses completed audio recordings. Realtime mode uses this separate transport path:

`main process -> ephemeral client secret -> renderer WebRTC -> OpenAI transcription session -> VAD/transcript events -> final transcript -> existing startChat IPC -> same router/orchestrator`

The Realtime session is transcription-only, so it cannot bypass Jarvis routing or answer independently. Partial transcript events are renderer drafts; only a provider final event may create one user message. Each event is scoped by a session ID and transcript item ID to prevent stale sessions and duplicate finals from mutating the current task.

The renderer keeps the microphone transport and UI state separate from the public `AppState`. `speech_started` performs real interruption by stopping local playback and cancelling the active TTS/chat request before the next final transcript is submitted. A conservative connection failure returns to push-to-talk rather than retrying indefinitely. A spoken transcript creates its user message only when it enters the existing `startChat` path, so voice does not create a second routing or conversation system.

The main process validates session identifiers, MIME types, file names, byte sizes, and TTS text length. Provider failures return typed public errors; credentials and SDK objects never cross the preload boundary.

The long-lived API key is never sent to the renderer. The trusted main process requests a short-lived client secret, and the renderer uses that secret only to negotiate the browser WebRTC session with OpenAI. See [`ADR-002-realtime-voice-transport.md`](ADR-002-realtime-voice-transport.md).

This lets typed and spoken requests share routing, memory, permissions, projects, and tools.

## Persistence plan
SQLite is the planned local system of record for:
- conversations and messages;
- project registry;
- task history;
- structured memory records;
- Codex thread identifiers and session metadata;
- audit events.

Semantic/vector retrieval will only be added if structured + full-text retrieval proves insufficient.
