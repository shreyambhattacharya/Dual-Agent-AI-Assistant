import type { AppState } from "@jarvis/core";

export function HoloCore({ state }: { state: AppState }) {
  const label =
    state === "ROUTING"
      ? "Routing"
      : state === "THINKING"
        ? "Thinking"
        : state === "CODEX_WORKING"
          ? "Codex active"
          : state === "ERROR"
            ? "Attention"
            : "Online";

  return (
    <div className={`holo holo--${state.toLowerCase()}`} aria-label={`Jarvis state: ${state}`}>
      <div className="holo__orbit holo__orbit--outer" />
      <div className="holo__orbit holo__orbit--middle" />
      <div className="holo__orbit holo__orbit--inner" />
      <div className="holo__mesh" />
      <div className="holo__core">
        <span className="holo__label">JARVIS</span>
        <span className="holo__status">{label}</span>
      </div>
    </div>
  );
}
