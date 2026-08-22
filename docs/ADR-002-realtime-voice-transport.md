# ADR-002: Realtime transcription over browser WebRTC

## Status

Accepted for the M2 realtime voice foundation.

## Decision

Jarvis uses an OpenAI Realtime **transcription session** over browser WebRTC for opt-in continuous voice input. The trusted Electron main process creates a short-lived client secret with the long-lived `OPENAI_API_KEY`. The renderer uses the ephemeral value to negotiate WebRTC and sends microphone audio directly to the configured Realtime calls endpoint.

The session is intentionally transcription-only. Realtime VAD and transcript events are inputs to Jarvis; the final transcript is submitted through the existing `startChat` IPC and the same router/orchestrator used by typed input. ChatGPT/Codex remain the only answering agents. Push-to-talk file transcription remains the fallback.

## Why

- WebRTC is the preferred browser transport for low-latency microphone streaming.
- A transcription session preserves explicit control over routing, permissions, cancellation, TTS, and public state.
- Server VAD provides speech start/stop boundaries without putting a provider-specific VAD implementation in the core package.
- The renderer needs no long-lived credential or Node authority.

## Lifecycle rules

- Partial transcript deltas render as a draft and never create a user message.
- A final transcript is accepted once per provider `item_id` and once per active session.
- Every transport event carries the locally generated session ID; stale events are ignored.
- `speech_started` cancels active Jarvis chat/TTS work and stops local playback before the next turn is submitted.
- Negotiation and connection failures fall back to push-to-talk with stable public errors; retries are conservative and finite.
- Realtime state remains internal to the voice session controller instead of expanding the core `AppState` contract.

## Alternatives considered

- Speech-to-speech Realtime agent: rejected for this milestone because it would allow a realtime model to answer outside Jarvis routing and tool/permission policy.
- Server-side WebSocket audio pipeline: rejected for the browser client because it adds a media relay and more trusted audio handling without improving this desktop path.
- Local-only VAD/transcription: deferred; it would add a model/runtime dependency and duplicate provider behavior.
