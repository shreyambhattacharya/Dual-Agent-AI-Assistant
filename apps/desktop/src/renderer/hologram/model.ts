import type { AgentId, AppState } from "@jarvis/core";
import type { AudioFeatures } from "@jarvis/voice";

export type HologramAudioSource = "USER" | "ASSISTANT" | "NONE";

export interface HologramAudio extends AudioFeatures {
  source: HologramAudioSource;
}

export interface HologramInput {
  state: AppState;
  agent: AgentId;
  audio: HologramAudio;
}

export interface HologramVisualState {
  coreScale: number;
  coreBrightness: number;
  innerRingSpeed: number;
  middleRingSpeed: number;
  outerRingSpeed: number;
  ringSpread: number;
  meshDistortion: number;
  meshRotation: number;
  particleActivity: number;
  particleRadius: number;
  particleConvergence: number;
  pulseStrength: number;
  audioResponse: number;
  warningIntensity: number;
  stability: number;
  scanSpeed: number;
  ringOpacity: number;
}

const DEFAULT_AUDIO: HologramAudio = {
  source: "NONE",
  rms: 0,
  low: 0,
  mid: 0,
  high: 0,
};

const STATE_TARGETS: Record<AppState, Omit<HologramVisualState, "coreScale" | "pulseStrength" | "meshDistortion" | "particleActivity"> & {
  coreScale: number;
  pulseStrength: number;
  meshDistortion: number;
  particleActivity: number;
}> = {
  IDLE: {
    coreScale: 1,
    coreBrightness: 0.56,
    innerRingSpeed: 0.16,
    middleRingSpeed: -0.1,
    outerRingSpeed: 0.055,
    ringSpread: 1,
    meshDistortion: 0.08,
    meshRotation: 0.2,
    particleActivity: 0.18,
    particleRadius: 1.8,
    particleConvergence: 0,
    pulseStrength: 0.16,
    audioResponse: 0.15,
    warningIntensity: 0,
    stability: 1,
    scanSpeed: 0.12,
    ringOpacity: 0.42,
  },
  LISTENING: {
    coreScale: 1.04,
    coreBrightness: 0.82,
    innerRingSpeed: 0.25,
    middleRingSpeed: -0.16,
    outerRingSpeed: 0.1,
    ringSpread: 1.08,
    meshDistortion: 0.14,
    meshRotation: 0.8,
    particleActivity: 0.38,
    particleRadius: 1.92,
    particleConvergence: 0,
    pulseStrength: 0.28,
    audioResponse: 0.9,
    warningIntensity: 0,
    stability: 1,
    scanSpeed: 0.28,
    ringOpacity: 0.56,
  },
  TRANSCRIBING: {
    coreScale: 0.98,
    coreBrightness: 0.72,
    innerRingSpeed: 0.34,
    middleRingSpeed: -0.24,
    outerRingSpeed: 0.16,
    ringSpread: 0.9,
    meshDistortion: 0.12,
    meshRotation: 0.55,
    particleActivity: 0.62,
    particleRadius: 1.48,
    particleConvergence: 0.72,
    pulseStrength: 0.2,
    audioResponse: 0.42,
    warningIntensity: 0,
    stability: 1,
    scanSpeed: 0.85,
    ringOpacity: 0.58,
  },
  ROUTING: {
    coreScale: 1.12,
    coreBrightness: 0.98,
    innerRingSpeed: 0.42,
    middleRingSpeed: -0.28,
    outerRingSpeed: 0.2,
    ringSpread: 1.16,
    meshDistortion: 0.2,
    meshRotation: 1.15,
    particleActivity: 0.68,
    particleRadius: 2.02,
    particleConvergence: 0,
    pulseStrength: 0.52,
    audioResponse: 0.5,
    warningIntensity: 0,
    stability: 0.92,
    scanSpeed: 1.1,
    ringOpacity: 0.7,
  },
  THINKING: {
    coreScale: 1.08,
    coreBrightness: 0.9,
    innerRingSpeed: 0.38,
    middleRingSpeed: -0.31,
    outerRingSpeed: 0.24,
    ringSpread: 1.13,
    meshDistortion: 0.2,
    meshRotation: 1.05,
    particleActivity: 0.74,
    particleRadius: 1.98,
    particleConvergence: 0,
    pulseStrength: 0.42,
    audioResponse: 0.55,
    warningIntensity: 0,
    stability: 0.94,
    scanSpeed: 0.82,
    ringOpacity: 0.64,
  },
  TOOL_CALL: {
    coreScale: 1.12,
    coreBrightness: 0.94,
    innerRingSpeed: 0.46,
    middleRingSpeed: -0.33,
    outerRingSpeed: 0.3,
    ringSpread: 1.25,
    meshDistortion: 0.18,
    meshRotation: 1.02,
    particleActivity: 0.86,
    particleRadius: 2.08,
    particleConvergence: 0,
    pulseStrength: 0.56,
    audioResponse: 0.58,
    warningIntensity: 0,
    stability: 0.88,
    scanSpeed: 1.2,
    ringOpacity: 0.72,
  },
  CODEX_WORKING: {
    coreScale: 1.05,
    coreBrightness: 0.86,
    innerRingSpeed: 0.28,
    middleRingSpeed: -0.34,
    outerRingSpeed: 0.38,
    ringSpread: 1.04,
    meshDistortion: 0.16,
    meshRotation: 0.72,
    particleActivity: 0.8,
    particleRadius: 1.94,
    particleConvergence: 0.12,
    pulseStrength: 0.38,
    audioResponse: 0.48,
    warningIntensity: 0,
    stability: 0.96,
    scanSpeed: 0.62,
    ringOpacity: 0.68,
  },
  SPEAKING: {
    coreScale: 1.07,
    coreBrightness: 0.88,
    innerRingSpeed: 0.24,
    middleRingSpeed: -0.17,
    outerRingSpeed: 0.11,
    ringSpread: 1.11,
    meshDistortion: 0.16,
    meshRotation: 0.86,
    particleActivity: 0.56,
    particleRadius: 2.02,
    particleConvergence: -0.2,
    pulseStrength: 0.42,
    audioResponse: 0.82,
    warningIntensity: 0,
    stability: 0.98,
    scanSpeed: 0.4,
    ringOpacity: 0.6,
  },
  WAITING_FOR_PERMISSION: {
    coreScale: 1,
    coreBrightness: 0.66,
    innerRingSpeed: 0.08,
    middleRingSpeed: -0.05,
    outerRingSpeed: 0.035,
    ringSpread: 0.96,
    meshDistortion: 0.06,
    meshRotation: 0.12,
    particleActivity: 0.2,
    particleRadius: 1.7,
    particleConvergence: 0,
    pulseStrength: 0.26,
    audioResponse: 0.12,
    warningIntensity: 0.25,
    stability: 1,
    scanSpeed: 0.12,
    ringOpacity: 0.48,
  },
  ERROR: {
    coreScale: 1.06,
    coreBrightness: 0.58,
    innerRingSpeed: 0.3,
    middleRingSpeed: -0.2,
    outerRingSpeed: 0.17,
    ringSpread: 1.08,
    meshDistortion: 0.24,
    meshRotation: 0.78,
    particleActivity: 0.5,
    particleRadius: 1.78,
    particleConvergence: 0.05,
    pulseStrength: 0.58,
    audioResponse: 0.25,
    warningIntensity: 0.95,
    stability: 0.52,
    scanSpeed: 0.6,
    ringOpacity: 0.5,
  },
  OFFLINE: {
    coreScale: 0.95,
    coreBrightness: 0.24,
    innerRingSpeed: 0.025,
    middleRingSpeed: -0.018,
    outerRingSpeed: 0.012,
    ringSpread: 0.92,
    meshDistortion: 0.035,
    meshRotation: 0.04,
    particleActivity: 0.08,
    particleRadius: 1.58,
    particleConvergence: 0.1,
    pulseStrength: 0.08,
    audioResponse: 0.05,
    warningIntensity: 0,
    stability: 1,
    scanSpeed: 0.025,
    ringOpacity: 0.22,
  },
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function audioForSource(audio: HologramAudio | undefined): AudioFeatures {
  const source = audio?.source ?? "NONE";
  if (source === "NONE") return DEFAULT_AUDIO;
  return {
    rms: clamp(audio?.rms ?? 0),
    low: clamp(audio?.low ?? 0),
    mid: clamp(audio?.mid ?? 0),
    high: clamp(audio?.high ?? 0),
  };
}

export function resolveHologramVisualState(input: HologramInput): HologramVisualState {
  const base = STATE_TARGETS[input.state];
  const audio = audioForSource(input.audio);
  const hasAudio = input.audio.source !== "NONE";
  const response = base.audioResponse * (hasAudio ? 1 : 0);
  const agentFactor = input.agent === "CODEX" ? 1.16 : 1;

  return {
    ...base,
    coreScale: clamp(base.coreScale + audio.rms * response * 0.16, 0.72, 1.55),
    innerRingSpeed: base.innerRingSpeed * agentFactor + audio.mid * response * 0.04,
    middleRingSpeed: base.middleRingSpeed * agentFactor,
    outerRingSpeed: base.outerRingSpeed * agentFactor + audio.low * response * 0.06,
    ringSpread: clamp(base.ringSpread + audio.low * response * 0.16, 0.7, 1.5),
    meshDistortion: clamp(base.meshDistortion + audio.mid * response * 0.24, 0, 0.75),
    meshRotation: clamp(base.meshRotation + audio.mid * response * 0.5, 0, 2),
    particleActivity: clamp(base.particleActivity + audio.high * response * 0.34),
    particleRadius: clamp(base.particleRadius + (audio.high - 0.35) * response * 0.2, 1.1, 2.6),
    pulseStrength: clamp(base.pulseStrength + audio.rms * response * 0.42),
    audioResponse: response,
    warningIntensity: clamp(base.warningIntensity),
    stability: clamp(base.stability),
    scanSpeed: clamp(base.scanSpeed, 0, 2),
    ringOpacity: clamp(base.ringOpacity, 0.05, 1),
  };
}

export function hologramStatusLabel(state: AppState): string {
  const labels: Record<AppState, string> = {
    IDLE: "ONLINE",
    LISTENING: "LISTENING",
    TRANSCRIBING: "TRANSCRIBING",
    ROUTING: "ROUTING",
    THINKING: "THINKING",
    TOOL_CALL: "TOOL ACTIVE",
    CODEX_WORKING: "CODEX ACTIVE",
    SPEAKING: "SPEAKING",
    WAITING_FOR_PERMISSION: "AWAITING APPROVAL",
    ERROR: "ATTENTION",
    OFFLINE: "OFFLINE",
  };
  return labels[state];
}
