import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useState } from "react";
import type { AgentId, AppState } from "@jarvis/core";
import type { AudioFeatures } from "@jarvis/voice";
import { HologramCanvas } from "../hologram/HologramCanvas";
import { HologramFallback } from "../hologram/HologramFallback";
import { HologramHarness } from "../hologram/HologramHarness";
import type { HologramInput, HologramAudioSource } from "../hologram/model";
import { hologramStatusLabel } from "../hologram/model";
import { resolveHologramQuality, type HologramQualityMode } from "../hologram/quality";
import "../styles/hologram.css";

interface HoloCoreProps {
  state: AppState;
  agent: AgentId;
  audio?: AudioFeatures & { source: HologramAudioSource };
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

class HologramErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // WebGL failures are intentionally contained so the CSS fallback remains usable.
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function reducedMotionPreference(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function forcedQualityFromUrl(): HologramQualityMode | undefined {
  if (typeof window === "undefined") return undefined;
  const forced = new URLSearchParams(window.location.search).get("hologramQuality");
  return forced === "FULL" || forced === "REDUCED" ? forced : undefined;
}

function harnessEnabled(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get("hologramHarness") === "1";
}

function webGlAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HoloCore({ state, agent, audio }: HoloCoreProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotionPreference);
  const [webglAvailable] = useState(webGlAvailable);
  const [harnessInput, setHarnessInput] = useState<HologramInput>({
    state,
    agent,
    audio: audio ?? { source: "NONE", rms: 0, low: 0, mid: 0, high: 0 },
  });
  const isHarness = harnessEnabled();
  const input = isHarness ? harnessInput : {
    state,
    agent,
    audio: audio ?? { source: "NONE", rms: 0, low: 0, mid: 0, high: 0 },
  };
  const quality = useMemo(
    () => resolveHologramQuality({
      forced: forcedQualityFromUrl(),
      prefersReducedMotion,
      hardwareConcurrency: navigator.hardwareConcurrency,
    }),
    [prefersReducedMotion],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const label = hologramStatusLabel(input.state);
  return (
    <div className={`hologram hologram--${input.state.toLowerCase()} hologram--${quality.mode.toLowerCase()}`}>
      {webglAvailable ? (
        <HologramErrorBoundary fallback={<HologramFallback input={input} />}>
          <HologramCanvas input={input} quality={quality} />
        </HologramErrorBoundary>
      ) : <HologramFallback input={input} />}
      <div className="hologram__overlay" aria-label={`Jarvis state: ${input.state}`}>
        <span className="hologram__label">JARVIS</span>
        <strong className="hologram__status">{label}</strong>
        <small>{input.agent} / {input.audio.source} AUDIO</small>
      </div>
      {isHarness ? <HologramHarness value={harnessInput} onChange={setHarnessInput} /> : null}
    </div>
  );
}
