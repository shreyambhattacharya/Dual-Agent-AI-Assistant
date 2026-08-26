# Milestone Tracker

## M0 - Repository foundation
Status: COMPLETE

- [x] Establish monorepo layout.
- [x] Document architectural boundaries and technology choices.
- [x] Create `AGENTS.md`.
- [x] Add baseline configuration and secret handling.
- [x] Create pure orchestration core and routing tests.

## M1 - Typed ChatGPT vertical slice
Status: IMPLEMENTED, automated verification complete; Electron launch blocked by host-native crash

- [x] Typed user input in desktop renderer.
- [x] IPC bridge with context isolation.
- [x] Orchestrator invocation in trusted main process.
- [x] OpenAI Responses API streaming adapter.
- [x] Token/delta streaming back to renderer.
- [x] Agent/state indicator.
- [x] Missing-key/offline error handling.
- [x] Install npm dependencies in a network-enabled environment.
- [x] Verify the Vite renderer endpoint and main-process TypeScript watch compilation.
- [ ] Launch Electron and verify the native desktop window and live API streaming with a real key.

Runtime note: this development host is Windows 11 build 26200. Electron and an isolated minimal Electron app both terminate with a native `electron.exe` application error before Jarvis code runs. The main process includes the documented GPU compatibility switches and a `did-finish-load` visibility fallback, but a live Electron window still requires a host update/repair or a machine without this Windows 25H2 regression. `OPENAI_API_KEY` was not configured, so live API streaming also remains unverified.

## M2 - Voice
Status: IN PROGRESS — realtime foundation implemented; live provider/Electron verification remains

- [x] Audio device enumeration with deliberate browser permission request.
- [x] Push-to-talk recording using the selected microphone.
- [x] Realtime transcription transport over browser WebRTC with short-lived main-process session secrets.
- [x] Server VAD speech start/stop events and partial transcript drafts.
- [x] Final-transcript deduplication and session/request stale-event protection.
- [x] Completed-recording transcription through the trusted main process.
- [x] Visible transcription through the existing user-message/orchestrator path.
- [x] Speech output through the trusted main process and renderer playback.
- [x] Manual interruption: STOP cancels every active stage and MIC interrupts playback.
- [x] Wake-word detector interface with an explicit no-op implementation.
- [x] Normalized/smoothed audio-feature foundation (`rms`, `low`, `mid`, `high`).

The current slice keeps turn-based file transcription and TTS as a fallback. Realtime mode is transcription-only and continues through the existing orchestrator; it does not create a second answering agent. Production wake-word activation and live provider verification remain outstanding. Live provider verification remains dependent on a configured `OPENAI_API_KEY` and a host where Electron launches successfully.

## M3 - Procedural hologram
Status: IMPLEMENTED; Vite endpoint verified, Electron launch remains host-blocked

- [x] React Three Fiber scene with procedural core, energy shell, orbital rings, and particles.
- [x] Complete public app-state mapping with idle/listening/thinking/speaking, routing, tool, permission, error, and offline behavior.
- [x] Real user microphone and assistant playback audio reactivity.
- [x] Smoothed target transitions without React state updates in the render loop.
- [x] Audio feature extraction foundation (voice package + browser analyser).
- [x] Smoothed audio feature foundation.
- [x] FULL/REDUCED quality profiles, DPR/particle clamping, reduced-motion support.
- [x] CSS/WebGL fallback and development-only visual harness.
- [x] Resource cleanup for analyser contexts, media sources, object URLs, custom geometries, and particle buffers.

The renderer harness is available through Vite with `?hologramHarness=1`; the endpoint responded successfully during verification, but live native Electron inspection remains blocked by the Windows 11 build 26200 Electron crash documented above. The R3F scene has no external model or post-processing asset dependency.

## M4 - Dual-agent router
Status: CORE ROUTING FOUNDATION COMPLETE

- [x] Explicit ChatGPT parsing.
- [x] Explicit Codex parsing.
- [x] Intent classifier interface.
- [x] Rule-based fallback classifier.
- [ ] Model-assisted contextual classifier.
- [ ] Routing telemetry and evaluation set.

## M5 - Codex integration
Status: NOT STARTED

- [ ] Integrate `@openai/codex-sdk` in trusted main process.
- [ ] Thread/session persistence.
- [ ] Repository-scoped working directory.
- [ ] Streaming action/status mapping.
- [ ] Cancellation.
- [ ] Diff/result normalization.
- [ ] AGENTS.md discovery and precedence tests.

## M6 - Projects and memory
Status: FOUNDATION ONLY

- [x] Project alias resolver domain model.
- [ ] SQLite storage.
- [ ] Project registry UI.
- [ ] Structured user/project/session/task memory.
- [ ] Resume previous development sessions.

## M7 - Tool and permission system
Status: NOT STARTED

- [ ] Tool registry.
- [ ] Filesystem tools.
- [ ] Safe subprocess runner.
- [ ] Git tools.
- [ ] Permission engine and UI prompts.
- [ ] Audit log.

## M8 - Developer UX
Status: NOT STARTED

- [ ] Monaco diff viewer.
- [ ] Task manager.
- [ ] Concurrent task support.
- [ ] Developer diagnostics panel.
- [ ] GitHub integration.

## M9 - Personal tools
Status: NOT STARTED

- [ ] Calendar.
- [ ] Gmail.
- [ ] Reminders.
- [ ] Notes/research integrations.

## M10 - Production polish
Status: NOT STARTED

- [ ] Installer/signing strategy.
- [ ] Crash recovery.
- [ ] Performance profiling.
- [ ] Security review.
- [ ] End-to-end tests.
- [ ] Demo recording and resume-ready README media.
