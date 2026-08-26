export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, lambda) * Math.max(0, delta)));
}

import type { HologramVisualState } from "./model";

export function dampHologramVisualState(
  current: HologramVisualState,
  target: HologramVisualState,
  lambda: number,
  delta: number,
): HologramVisualState {
  current.coreScale = damp(current.coreScale, target.coreScale, lambda, delta);
  current.coreBrightness = damp(current.coreBrightness, target.coreBrightness, lambda, delta);
  current.innerRingSpeed = damp(current.innerRingSpeed, target.innerRingSpeed, lambda, delta);
  current.middleRingSpeed = damp(current.middleRingSpeed, target.middleRingSpeed, lambda, delta);
  current.outerRingSpeed = damp(current.outerRingSpeed, target.outerRingSpeed, lambda, delta);
  current.ringSpread = damp(current.ringSpread, target.ringSpread, lambda, delta);
  current.meshDistortion = damp(current.meshDistortion, target.meshDistortion, lambda, delta);
  current.meshRotation = damp(current.meshRotation, target.meshRotation, lambda, delta);
  current.particleActivity = damp(current.particleActivity, target.particleActivity, lambda, delta);
  current.particleRadius = damp(current.particleRadius, target.particleRadius, lambda, delta);
  current.particleConvergence = damp(current.particleConvergence, target.particleConvergence, lambda, delta);
  current.pulseStrength = damp(current.pulseStrength, target.pulseStrength, lambda, delta);
  current.audioResponse = damp(current.audioResponse, target.audioResponse, lambda, delta);
  current.warningIntensity = damp(current.warningIntensity, target.warningIntensity, lambda, delta);
  current.stability = damp(current.stability, target.stability, lambda, delta);
  current.scanSpeed = damp(current.scanSpeed, target.scanSpeed, lambda, delta);
  current.ringOpacity = damp(current.ringOpacity, target.ringOpacity, lambda, delta);
  return current;
}
