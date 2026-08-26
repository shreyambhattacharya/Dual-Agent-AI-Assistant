import { useState } from "react";
import type { AgentId, AppState } from "@jarvis/core";
import type { HologramInput, HologramAudioSource } from "./model";

const STATES: AppState[] = [
  "IDLE",
  "LISTENING",
  "TRANSCRIBING",
  "ROUTING",
  "THINKING",
  "TOOL_CALL",
  "CODEX_WORKING",
  "SPEAKING",
  "WAITING_FOR_PERMISSION",
  "ERROR",
  "OFFLINE",
];

export function HologramHarness({ value, onChange }: { value: HologramInput; onChange: (value: HologramInput) => void }) {
  const [audioSource, setAudioSource] = useState<HologramAudioSource>(value.audio.source === "NONE" ? "USER" : value.audio.source);
  const updateAudio = (key: "rms" | "low" | "mid" | "high", next: number) => {
    onChange({ ...value, audio: { ...value.audio, source: audioSource, [key]: next } });
  };
  return (
    <aside className="hologram-harness" aria-label="Development hologram harness">
      <div className="hologram-harness__title">DEV VISUAL HARNESS</div>
      <label>
        STATE
        <select value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value as AppState })}>
          {STATES.map((state) => <option key={state}>{state}</option>)}
        </select>
      </label>
      <label>
        AGENT
        <select value={value.agent} onChange={(event) => onChange({ ...value, agent: event.target.value as AgentId })}>
          <option>CHATGPT</option>
          <option>CODEX</option>
        </select>
      </label>
      <label>
        AUDIO
        <select
          value={audioSource}
          onChange={(event) => {
            const source = event.target.value as HologramAudioSource;
            setAudioSource(source);
            onChange({ ...value, audio: { ...value.audio, source } });
          }}
        >
          <option>USER</option>
          <option>ASSISTANT</option>
          <option>NONE</option>
        </select>
      </label>
      {(["rms", "low", "mid", "high"] as const).map((key) => (
        <label key={key}>
          {key.toUpperCase()}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value.audio[key]}
            onChange={(event) => updateAudio(key, Number(event.target.value))}
          />
        </label>
      ))}
    </aside>
  );
}
