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
  | "INVALID_VOICE_REQUEST"
  | "REALTIME_UNAVAILABLE"
  | "REALTIME_SESSION_FAILED"
  | "REALTIME_AUTH_FAILED"
  | "REALTIME_CONNECTION_FAILED"
  | "REALTIME_CONNECTION_LOST"
  | "REALTIME_PROTOCOL_ERROR"
  | "REALTIME_TRANSCRIPTION_FAILED"
  | "VOICE_DEVICE_LOST"
  | "VOICE_VAD_FAILED";

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

export type RealtimeVoiceMode = "REALTIME" | "PUSH_TO_TALK";

export type VoiceActivationMode = "PUSH_TO_TALK" | "CONTINUOUS" | "WAKE_WORD";

export type RealtimeTransportState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "LISTENING"
  | "FINALIZING"
  | "CLOSING";

export interface AudioFeatures {
  rms: number;
  low: number;
  mid: number;
  high: number;
}

export interface RealtimeVoiceConfig {
  sessionId: string;
  ephemeralKey: string;
  deviceId?: string;
  signal?: AbortSignal;
}

export type RealtimeVoiceEvent =
  | { type: "connected"; sessionId: string }
  | { type: "speech_started"; sessionId: string; itemId?: string }
  | { type: "speech_stopped"; sessionId: string; itemId?: string }
  | { type: "transcript_partial"; sessionId: string; itemId: string; text: string }
  | { type: "transcript_final"; sessionId: string; itemId: string; text: string }
  | { type: "audio_level"; sessionId: string; features: AudioFeatures }
  | { type: "disconnected"; sessionId: string; reason?: string }
  | { type: "error"; sessionId: string; code: VoiceErrorCode; message: string };

export interface RealtimeVoiceTransport {
  connect(config: RealtimeVoiceConfig): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  cancel(): Promise<void>;
  disconnect(): Promise<void>;
  onEvent(listener: (event: RealtimeVoiceEvent) => void): () => void;
  getState(): RealtimeTransportState;
}

export interface RealtimeSessionRequest {
  sessionId: string;
}

export interface RealtimeSessionToken {
  value: string;
  expiresAt: number;
  model: string;
}

export interface RealtimeSessionProvider {
  createSession(
    request: RealtimeSessionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<RealtimeSessionToken>;
}

export type VoiceOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: VoiceError };
