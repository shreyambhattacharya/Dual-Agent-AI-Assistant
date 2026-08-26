import type { CSSProperties } from "react";
import { hologramStatusLabel } from "./model";
import type { HologramInput } from "./model";

export function HologramFallback({ input }: { input: HologramInput }) {
  const energy = Math.min(1, Math.max(0, input.audio.source === "NONE" ? 0.12 : input.audio.rms));
  const style = {
    "--fallback-energy": energy,
    "--fallback-speed": input.state === "OFFLINE" ? "26s" : input.state === "IDLE" ? "16s" : "8s",
  } as CSSProperties;
  return (
    <div
      className={`hologram-fallback hologram-fallback--${input.state.toLowerCase()}`}
      style={style}
      role="img"
      aria-label={`Jarvis ${hologramStatusLabel(input.state)} fallback visualization`}
    >
      <div className="hologram-fallback__halo" />
      <div className="hologram-fallback__orbit hologram-fallback__orbit--outer" />
      <div className="hologram-fallback__orbit hologram-fallback__orbit--middle" />
      <div className="hologram-fallback__orbit hologram-fallback__orbit--inner" />
      <div className="hologram-fallback__mesh" />
      <div className="hologram-fallback__core" />
    </div>
  );
}
