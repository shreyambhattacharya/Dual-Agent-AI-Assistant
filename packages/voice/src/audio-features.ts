import type { AudioFeatures } from "./types";

const DEFAULT_SMOOTHING = 0.2;

export const SILENT_AUDIO_FEATURES: AudioFeatures = {
  rms: 0,
  low: 0,
  mid: 0,
  high: 0,
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function normalizeAudioFeatures(features: AudioFeatures): AudioFeatures {
  return {
    rms: clamp(features.rms),
    low: clamp(features.low),
    mid: clamp(features.mid),
    high: clamp(features.high),
  };
}

export function smoothAudioFeatures(
  previous: AudioFeatures,
  current: AudioFeatures,
  alpha = DEFAULT_SMOOTHING,
): AudioFeatures {
  const amount = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : DEFAULT_SMOOTHING));
  const next = normalizeAudioFeatures(current);
  return normalizeAudioFeatures({
    rms: previous.rms + (next.rms - previous.rms) * amount,
    low: previous.low + (next.low - previous.low) * amount,
    mid: previous.mid + (next.mid - previous.mid) * amount,
    high: previous.high + (next.high - previous.high) * amount,
  });
}

/** Converts normalized analyser magnitudes into coarse bands for the visualizer foundation. */
export function frequencyBinsToAudioFeatures(frequencyBins: readonly number[]): AudioFeatures {
  if (frequencyBins.length === 0) return { ...SILENT_AUDIO_FEATURES };

  const values = frequencyBins.map((value) => Math.min(1, Math.max(0, value / 255)));
  const lowEnd = Math.max(1, Math.floor(values.length * 0.2));
  const midEnd = Math.max(lowEnd + 1, Math.floor(values.length * 0.6));
  const average = (start: number, end: number): number => {
    const slice = values.slice(start, Math.min(end, values.length));
    return slice.length === 0 ? 0 : slice.reduce((sum, value) => sum + value, 0) / slice.length;
  };

  return normalizeAudioFeatures({
    rms: average(0, values.length),
    low: average(0, lowEnd),
    mid: average(lowEnd, midEnd),
    high: average(midEnd, values.length),
  });
}

/** Combines time-domain RMS with the same frequency-band normalization used by every browser analyzer. */
export function analyserSamplesToAudioFeatures(
  timeDomainSamples: readonly number[],
  frequencyBins: readonly number[],
): AudioFeatures {
  if (timeDomainSamples.length === 0) return frequencyBinsToAudioFeatures(frequencyBins);
  let squaredTotal = 0;
  timeDomainSamples.forEach((sample) => {
    const centered = (sample - 128) / 128;
    squaredTotal += centered * centered;
  });
  return {
    ...frequencyBinsToAudioFeatures(frequencyBins),
    rms: clamp(Math.sqrt(squaredTotal / timeDomainSamples.length)),
  };
}
