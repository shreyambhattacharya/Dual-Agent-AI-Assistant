import type { VoiceError, VoiceErrorCode } from "./types";

export function normalizeVoiceError(error: unknown, fallbackCode: VoiceErrorCode): VoiceError {
  if (isAbortLike(error)) {
    return { code: "VOICE_CANCELLED", message: "Voice operation cancelled.", retryable: true };
  }

  if (error instanceof Error && /abort|cancel/i.test(error.message)) {
    return { code: "VOICE_CANCELLED", message: "Voice operation cancelled.", retryable: true };
  }

  return {
    code: fallbackCode,
    message: error instanceof Error ? error.message : "Voice operation failed.",
    retryable: true,
  };
}

function isAbortLike(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError",
  );
}
