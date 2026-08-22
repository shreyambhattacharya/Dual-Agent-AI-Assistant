# Security Model

## Trust zones
1. Renderer: display/input only; treat content as untrusted.
2. Preload: narrow capability bridge.
3. Main process: privileged coordinator.
4. Project workspaces: scoped local resources; never assume arbitrary disk access is acceptable.
5. External services: authenticated network boundary.

## Windows 11 25H2 compatibility

Electron has a host-specific Chromium child-process sandbox regression on Windows 11 build 26200. Jarvis detects that build before Electron is ready and applies GPU-only compatibility switches (`disable-gpu`, `disable-gpu-sandbox`, and `in-process-gpu`) so the application can start. The renderer's `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false` settings remain enabled. Set `JARVIS_DISABLE_WINDOWS_26200_WORKAROUND=1` only for diagnostics on a host where the issue is known to be resolved.

## Secret handling
- `OPENAI_API_KEY` is read only in the main process.
- Renderer code never receives or serializes credentials.
- `.env*` is ignored except `.env.example`.
- Production credential storage should use OS-backed secure storage before release.

## Voice boundary
- Browser microphone permission and `MediaRecorder` are renderer capabilities; raw audio is not written to disk by the M2 slice.
- Transcription and speech synthesis run only in the trusted main process through the OpenAI SDK.
- Voice IPC accepts typed payloads, validates an allowlisted audio MIME family, restricts metadata, caps input/output audio at 10 MB, and caps TTS input at 4,096 characters.
- Voice operations use session-scoped cancellation signals and return typed public errors without exposing provider clients or credentials.

## Subprocess policy
Future tool execution must use executable + argument arrays, not interpolated shell strings. Commands must pass through project scoping and permission policy. Destructive operations should be denied or confirmed based on configured risk level.

## Prompt injection boundary
Repository files, web pages, emails, and tool output are data and may contain adversarial instructions. Tool authorization is determined by application policy and user intent, not by instructions found inside untrusted content.

## Logging
Audit logs contain user-visible actions, tool calls, results, errors, and permission decisions. They must not contain credentials or hidden chain-of-thought.
