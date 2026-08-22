import type { VoiceSessionEvent, VoiceSessionState } from "./types";

export const initialVoiceSessionState: VoiceSessionState = { stage: "IDLE" };

export function transitionVoiceSession(
  state: VoiceSessionState,
  event: VoiceSessionEvent,
): VoiceSessionState {
  switch (event.type) {
    case "begin_listening":
      return { stage: "LISTENING", sessionId: event.sessionId };
    case "begin_transcription":
      return { stage: "TRANSCRIBING", sessionId: state.sessionId };
    case "begin_speaking":
      return { stage: "SPEAKING", sessionId: state.sessionId };
    case "finish":
    case "cancel":
      return { stage: "IDLE" };
    case "fail":
      return { stage: "ERROR", sessionId: state.sessionId, error: event.error };
  }
}
