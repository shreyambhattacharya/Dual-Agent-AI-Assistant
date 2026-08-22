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
Status: NOT STARTED

- [ ] Audio device enumeration.
- [ ] Push-to-talk.
- [ ] Realtime speech transport.
- [ ] Visible transcription.
- [ ] Speech output.
- [ ] Barge-in / interruption.
- [ ] Local wake-word abstraction and initial implementation.

## M3 - Procedural hologram
Status: NOT STARTED

- [ ] React Three Fiber scene.
- [ ] Idle/listening/thinking/speaking states.
- [ ] Audio feature extraction.
- [ ] Smoothed audio-reactive deformation.
- [ ] Performance fallback mode.

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
