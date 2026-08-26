# ADR-003: Procedural hologram rendering boundary

Status: Accepted

Date: 2026-08-26

## Context

Jarvis needs a persistent visual identity that communicates the public application state, active agent, and voice activity without putting orchestration, credentials, or privileged tools in the renderer. The earlier CSS-only core could not provide independent 3D orbital structures, real audio response, or a maintainable quality/fallback strategy.

## Decision

Use React Three Fiber and Three.js for a procedural renderer-owned hologram. Keep the public input small and serializable:

```ts
{ state, agent, audio: { source, rms, low, mid, high } }
```

The pure mapper in `apps/desktop/src/renderer/hologram/model.ts` maps every `AppState` to a distinct target profile and applies normalized audio bands. `HologramScene` damps target values in `useFrame` through refs; React state is used only for configuration and the optional development harness, never for per-frame animation. The scene is composed of a deformed icosahedron core, nucleus, energy shells, segmented orbital rings, and a bounded deterministic particle field. Agent identity affects structure and motion as well as color so the result remains one Jarvis visual language.

Use explicit `FULL` and `REDUCED` quality profiles with bounded DPR, geometry detail, particle count, and motion scale. Honor `prefers-reduced-motion`. Mount the Canvas only when WebGL is available, contain runtime failures in an error boundary, and fall back to a CSS visualization with matching semantic state labels. No model files or post-processing pipeline are required for this milestone.

Use one shared pure audio-feature implementation for microphone streams and assistant TTS media elements. Each browser analyser owns and releases its `AudioContext`, source, analyser node, timer, and buffers. TTS playback also revokes its object URL on completion or interruption.

## Consequences

Positive:

- Visual behavior is testable without a browser through pure mapping, damping, audio, and quality tests.
- The renderer has no new authority; it receives semantic values and remains outside the trusted main process.
- Quality and fallback paths are explicit and can evolve independently of orchestration.
- Microphone and assistant speech use the same visual contract.

Tradeoffs:

- Three.js increases the renderer bundle size and requires deliberate performance limits.
- Native Electron visual verification is still dependent on a host where Electron launches successfully.
- The current TTS path remains buffered audio; analyser reactivity begins after the returned audio payload is available.

## Rejected alternatives

- CSS-only animation: insufficient for the requested procedural 3D depth and independent structures.
- External model assets: unnecessary for an abstract hologram and would add loading, licensing, and cleanup complexity.
- Per-frame React state: adds avoidable render pressure and makes 60fps behavior less predictable.
