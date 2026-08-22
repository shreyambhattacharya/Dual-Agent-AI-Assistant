export type VoiceStage = "IDLE" | "LISTENING" | "TRANSCRIBING" | "SPEAKING" | "ERROR";

export type VoiceErrorCode =
  | "MICROPHONE_PERMISSION_DENIED"
  | "MICROPHONE_NOT_FOUND"
  | "MICROPHONE_UNAVAILABLE"
  | "AUDIO_CAPTURE_FAILED"
  | "AUDIO_TOO_LARGE"
  | "INVALID_AUDIO_FORMAT"
  | "TRANSCRIPTION_UNAVAILABLE"
  | "TRANSCRIPTION_FAILED"
  | "EMPTY_TRANSCRIPT"
  | "SYNTHESIS_UNAVAILABLE"
  | "SYNTHESIS_FAILED"
  | "VOICE_CANCELLED"
  | "INVALID_VOICE_REQUEST";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  retryable: boolean;
}

export interface RawAudioInputDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

export interface AudioRecording {
  data: Uint8Array;
  mimeType: string;
  fileName: string;
  durationMs?: number;
}

export interface TranscriptionResult {
  text: string;
  durationMs?: number;
}

export interface SpeechAudio {
  data: Uint8Array;
  mimeType: string;
}

export interface TranscriptionProvider {
  transcribe(input: AudioRecording, options?: { signal?: AbortSignal }): Promise<TranscriptionResult>;
}

export interface SpeechSynthesisProvider {
  synthesize(text: string, options?: { signal?: AbortSignal }): Promise<SpeechAudio>;
}

export interface VoiceSessionState {
  stage: VoiceStage;
  sessionId?: string;
  error?: VoiceError;
}

export type VoiceSessionEvent =
  | { type: "begin_listening"; sessionId: string }
  | { type: "begin_transcription" }
  | { type: "begin_speaking" }
  | { type: "finish" }
  | { type: "cancel" }
  | { type: "fail"; error: VoiceError };

export interface VoiceTranscriptionRequest {
  sessionId: string;
  data: Uint8Array;
  mimeType: string;
  fileName: string;
  durationMs?: number;
}

export interface VoiceSynthesisRequest {
  sessionId: string;
  text: string;
}

export interface VoiceTranscriptionResponse {
  text: string;
  durationMs?: number;
}

export interface VoiceSynthesisResponse {
  data: Uint8Array;
  mimeType: string;
}

export type VoiceOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: VoiceError };
