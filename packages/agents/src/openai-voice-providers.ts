import OpenAI, { toFile } from "openai";
import type {
  AudioRecording,
  RealtimeSessionProvider,
  RealtimeSessionRequest,
  RealtimeSessionToken,
  SpeechAudio,
  SpeechSynthesisProvider,
  TranscriptionProvider,
  TranscriptionResult,
} from "@jarvis/voice";

const DEFAULT_TRANSCRIPTION_MODEL = "gpt-transcribe";
const DEFAULT_REALTIME_TRANSCRIPTION_MODEL = "gpt-live-transcribe";
const DEFAULT_SPEECH_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "marin";
const MAX_SPEECH_INPUT_LENGTH = 4096;

export interface OpenAITranscriptionOptions {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
}

export interface OpenAISpeechOptions {
  apiKey?: string;
  model?: string;
  voice?: string;
  client?: OpenAI;
}

export interface OpenAIRealtimeSessionOptions {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
}

function createClient(apiKey: string | undefined, client: OpenAI | undefined): OpenAI {
  if (client) return client;
  if (!apiKey) throw new Error("OpenAI API key is required for voice providers.");
  return new OpenAI({ apiKey });
}

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAITranscriptionOptions) {
    this.client = createClient(options.apiKey, options.client);
    this.model = options.model || DEFAULT_TRANSCRIPTION_MODEL;
  }

  async transcribe(
    input: AudioRecording,
    options?: { signal?: AbortSignal },
  ): Promise<TranscriptionResult> {
    const file = await toFile(input.data, input.fileName, { type: input.mimeType });
    const response = await this.client.audio.transcriptions.create(
      {
        file,
        model: this.model,
        response_format: "json",
      },
      { signal: options?.signal },
    );

    return {
      text: response.text.trim(),
      durationMs: input.durationMs,
    };
  }
}

export class OpenAISpeechSynthesisProvider implements SpeechSynthesisProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly voice: string;

  constructor(options: OpenAISpeechOptions) {
    this.client = createClient(options.apiKey, options.client);
    this.model = options.model || DEFAULT_SPEECH_MODEL;
    this.voice = options.voice || DEFAULT_VOICE;
  }

  async synthesize(text: string, options?: { signal?: AbortSignal }): Promise<SpeechAudio> {
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error("Cannot synthesize an empty response.");
    if (normalizedText.length > MAX_SPEECH_INPUT_LENGTH) {
      throw new Error("The response is too long for the initial voice playback slice.");
    }

    const response = await this.client.audio.speech.create(
      {
        input: normalizedText,
        model: this.model,
        voice: this.voice,
        response_format: "mp3",
      },
      { signal: options?.signal },
    );

    return {
      data: new Uint8Array(await response.arrayBuffer()),
      mimeType: "audio/mpeg",
    };
  }
}

export class OpenAIRealtimeSessionProvider implements RealtimeSessionProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIRealtimeSessionOptions) {
    this.client = createClient(options.apiKey, options.client);
    this.model = options.model || DEFAULT_REALTIME_TRANSCRIPTION_MODEL;
  }

  async createSession(
    _request: RealtimeSessionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<RealtimeSessionToken> {
    const response = await this.client.realtime.clientSecrets.create(
      {
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "transcription",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: {
                model: this.model,
                delay: "low",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          },
        },
      },
      { signal: options?.signal },
    );

    return {
      value: response.value,
      expiresAt: response.expires_at,
      model: this.model,
    };
  }
}
