export type HologramQualityMode = "FULL" | "REDUCED";

export interface HologramQualityProfile {
  mode: HologramQualityMode;
  particleCount: number;
  geometryDetail: 1 | 2;
  dpr: [number, number];
  motionScale: number;
  antialias: boolean;
}

export interface HologramQualityInput {
  forced?: HologramQualityMode;
  prefersReducedMotion?: boolean;
  hardwareConcurrency?: number;
}

export function resolveHologramQuality(input: HologramQualityInput = {}): HologramQualityProfile {
  const reducedHardware = input.hardwareConcurrency !== undefined && input.hardwareConcurrency <= 4;
  const mode: HologramQualityMode = input.forced ?? (reducedHardware ? "REDUCED" : "FULL");
  const reduced = mode === "REDUCED";
  return {
    mode,
    particleCount: reduced ? 220 : 480,
    geometryDetail: reduced ? 1 : 2,
    dpr: reduced ? [1, 1.25] : [1, 1.75],
    motionScale: input.prefersReducedMotion ? 0.24 : reduced ? 0.62 : 1,
    antialias: !reduced,
  };
}
