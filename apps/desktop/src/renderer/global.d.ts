import type { OrchestratorEvent } from "@jarvis/core";
import type {
  VoiceOperationResult,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceTranscriptionRequest,
  VoiceTranscriptionResponse,
  RealtimeSessionRequest,
  RealtimeSessionToken,
} from "@jarvis/voice";

declare global {
  interface Window {
    jarvis: {
      startChat(requestId: string, text: string): Promise<void>;
      cancelChat(requestId: string): Promise<boolean>;
      voice: {
        transcribe(
          request: VoiceTranscriptionRequest,
        ): Promise<VoiceOperationResult<VoiceTranscriptionResponse>>;
        synthesize(
          request: VoiceSynthesisRequest,
        ): Promise<VoiceOperationResult<VoiceSynthesisResponse>>;
        cancel(sessionId: string): Promise<boolean>;
        realtime: {
          createSession(
            request: RealtimeSessionRequest,
          ): Promise<VoiceOperationResult<RealtimeSessionToken>>;
          cancel(sessionId: string): Promise<boolean>;
        };
      };
      onEvent(callback: (payload: { requestId: string; event: OrchestratorEvent }) => void): () => void;
    };
  }
}

export {};
