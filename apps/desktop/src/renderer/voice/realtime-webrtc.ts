import type {
  RealtimeTransportState,
  RealtimeVoiceConfig,
  RealtimeVoiceEvent,
  RealtimeVoiceTransport,
  VoiceErrorCode,
} from "@jarvis/voice";
import { BrowserAudioAnalyzer } from "./realtime-analyzer";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const DATA_CHANNEL_TIMEOUT_MS = 10_000;

type RealtimeServerPayload = {
  type?: unknown;
  item_id?: unknown;
  delta?: unknown;
  transcript?: unknown;
  error?: { code?: unknown; message?: unknown };
};

function textValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function realtimeErrorCode(payload: RealtimeServerPayload): VoiceErrorCode {
  const providerCode = textValue(payload.error?.code)?.toLowerCase() ?? "";
  if (providerCode.includes("transcription")) return "REALTIME_TRANSCRIPTION_FAILED";
  if (providerCode.includes("auth") || providerCode.includes("credential")) {
    return "REALTIME_AUTH_FAILED";
  }
  return "REALTIME_PROTOCOL_ERROR";
}

function parsePayload(data: unknown): RealtimeServerPayload | undefined {
  if (typeof data !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as RealtimeServerPayload;
  } catch {
    return undefined;
  }
}

export function mapRealtimeServerEvent(
  payload: RealtimeServerPayload,
  sessionId: string,
): RealtimeVoiceEvent | undefined {
  const type = textValue(payload.type);
  if (!type) return undefined;

  if (type === "session.created" || type === "session.updated") return undefined;
  if (type === "input_audio_buffer.speech_started") {
    return {
      type: "speech_started",
      sessionId,
      itemId: textValue(payload.item_id),
    };
  }
  if (type === "input_audio_buffer.speech_stopped") {
    return {
      type: "speech_stopped",
      sessionId,
      itemId: textValue(payload.item_id),
    };
  }
  if (type === "conversation.item.input_audio_transcription.delta") {
    const itemId = textValue(payload.item_id);
    const delta = textValue(payload.delta);
    return itemId && delta
      ? { type: "transcript_partial", sessionId, itemId, text: delta }
      : {
          type: "error",
          sessionId,
          code: "REALTIME_PROTOCOL_ERROR",
          message: "Realtime transcription delta was missing an item identifier or text delta.",
        };
  }
  if (type === "conversation.item.input_audio_transcription.completed") {
    const itemId = textValue(payload.item_id);
    const transcript = textValue(payload.transcript);
    return itemId && transcript !== undefined
      ? { type: "transcript_final", sessionId, itemId, text: transcript }
      : {
          type: "error",
          sessionId,
          code: "REALTIME_PROTOCOL_ERROR",
          message: "Realtime transcription final was missing an item identifier or transcript.",
        };
  }
  if (type === "conversation.item.input_audio_transcription.failed") {
    return {
      type: "error",
      sessionId,
      code: "REALTIME_TRANSCRIPTION_FAILED",
      message: textValue(payload.error?.message) ?? "Realtime transcription failed.",
    };
  }
  if (type === "error") {
    return {
      type: "error",
      sessionId,
      code: realtimeErrorCode(payload),
      message: textValue(payload.error?.message) ?? "Realtime voice reported an error.",
    };
  }
  return undefined;
}

export class RealtimeTransportError extends Error {
  constructor(readonly code: VoiceErrorCode, message: string) {
    super(message);
    this.name = "RealtimeTransportError";
  }
}

function normalizeTransportError(error: unknown): RealtimeTransportError {
  if (error instanceof RealtimeTransportError) return error;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return new RealtimeTransportError("MICROPHONE_PERMISSION_DENIED", "Microphone permission was denied.");
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return new RealtimeTransportError("MICROPHONE_NOT_FOUND", "The selected microphone was not found.");
  }
  return new RealtimeTransportError(
    "REALTIME_CONNECTION_FAILED",
    error instanceof Error ? error.message : "Realtime voice connection failed.",
  );
}

export class RealtimeWebRtcTransport implements RealtimeVoiceTransport {
  private state: RealtimeTransportState = "DISCONNECTED";
  private sessionId: string | null = null;
  private peer: RTCPeerConnection | null = null;
  private stream: MediaStream | null = null;
  private channel: RTCDataChannel | null = null;
  private analyzer: BrowserAudioAnalyzer | null = null;
  private readonly listeners = new Set<(event: RealtimeVoiceEvent) => void>();
  private disconnectedEmitted = false;

  getState(): RealtimeTransportState {
    return this.state;
  }

  onEvent(listener: (event: RealtimeVoiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(config: RealtimeVoiceConfig): Promise<void> {
    if (this.state !== "DISCONNECTED") {
      throw new Error("Realtime voice transport is already connected.");
    }

    this.state = "CONNECTING";
    this.sessionId = config.sessionId;
    this.disconnectedEmitted = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This environment does not expose microphone capture.");
      }

      const audio: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (config.deviceId) audio.deviceId = { exact: config.deviceId };
      this.stream = await navigator.mediaDevices.getUserMedia({ audio });
      this.peer = new RTCPeerConnection();
      this.peer.onconnectionstatechange = () => this.handleConnectionState();
      this.stream.getAudioTracks().forEach((track) => this.peer?.addTrack(track, this.stream!));
      this.analyzer = new BrowserAudioAnalyzer((features) => {
        if (this.sessionId) this.emit({ type: "audio_level", sessionId: this.sessionId, features });
      });
      this.analyzer.start(this.stream);

      this.channel = this.peer.createDataChannel("oai-events");
      this.channel.onmessage = (message) => {
        const payload = parsePayload(message.data);
        if (!payload || !this.sessionId) {
          if (this.sessionId) {
            this.emit({
              type: "error",
              sessionId: this.sessionId,
              code: "REALTIME_PROTOCOL_ERROR",
              message: "Realtime voice returned an unreadable event.",
            });
          }
          return;
        }
        const event = mapRealtimeServerEvent(payload, this.sessionId);
        if (event) {
          if (event.type === "error") this.state = "CONNECTED";
          this.emit(event);
        }
      };
      this.channel.onerror = () => this.emitError("REALTIME_CONNECTION_LOST", "Realtime data channel failed.");

      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);
      const localSdp = this.peer.localDescription?.sdp;
      if (!localSdp) throw new Error("Realtime voice did not produce a local SDP offer.");

      const response = await fetch(REALTIME_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: localSdp,
        signal: config.signal,
      });
      if (!response.ok) {
        const code = response.status === 401 || response.status === 403
          ? "REALTIME_AUTH_FAILED"
          : "REALTIME_CONNECTION_FAILED";
        throw new RealtimeTransportError(code, `Realtime voice session negotiation failed (${response.status}).`);
      }
      const answer = await response.text();
      await this.peer.setRemoteDescription({ type: "answer", sdp: answer });
      await this.waitForChannelOpen();
      this.state = "CONNECTED";
      this.emit({ type: "connected", sessionId: config.sessionId });
    } catch (error) {
      const normalized = normalizeTransportError(error);
      this.emitError(normalized.code, normalized.message);
      await this.cleanup(false);
      throw normalized;
    }
  }

  async startListening(): Promise<void> {
    if (!this.stream || !this.sessionId || this.state === "DISCONNECTED" || this.state === "CLOSING") {
      throw new Error("Realtime voice is not connected.");
    }
    this.stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    this.state = "LISTENING";
  }

  async stopListening(): Promise<void> {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    if (this.state !== "DISCONNECTED" && this.state !== "CLOSING") this.state = "CONNECTED";
  }

  async cancel(): Promise<void> {
    if (!this.sessionId && this.state === "DISCONNECTED") return;
    this.state = "CLOSING";
    await this.cleanup(true, "cancelled");
  }

  async disconnect(): Promise<void> {
    if (!this.sessionId && this.state === "DISCONNECTED") return;
    this.state = "CLOSING";
    await this.cleanup(true, "disconnected");
  }

  private async waitForChannelOpen(): Promise<void> {
    const channel = this.channel;
    if (!channel) throw new Error("Realtime voice data channel was not created.");
    if (channel.readyState === "open") return;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Realtime voice data channel timed out."));
      }, DATA_CHANNEL_TIMEOUT_MS);
      const cleanup = () => {
        window.clearTimeout(timeout);
        channel.removeEventListener("open", onOpen);
        channel.removeEventListener("error", onError);
      };
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Realtime voice data channel failed to open."));
      };
      channel.addEventListener("open", onOpen);
      channel.addEventListener("error", onError);
    });
  }

  private handleConnectionState(): void {
    const state = this.peer?.connectionState;
    if (state === "failed") this.emitError("REALTIME_CONNECTION_LOST", "Realtime voice connection failed.");
    if (state === "disconnected" || state === "closed") {
      if (this.state !== "CLOSING" && this.sessionId) {
        this.state = "DISCONNECTED";
        void this.cleanup(true, "connection lost");
      }
    }
  }

  private emitError(code: VoiceErrorCode, message: string): void {
    if (this.sessionId) this.emit({ type: "error", sessionId: this.sessionId, code, message });
  }

  private emit(event: RealtimeVoiceEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private async cleanup(emitDisconnected: boolean, reason?: string): Promise<void> {
    const sessionId = this.sessionId;
    this.analyzer?.stop();
    this.analyzer = null;
    this.channel?.close();
    this.channel = null;
    this.peer?.close();
    this.peer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.sessionId = null;
    this.state = "DISCONNECTED";
    if (emitDisconnected && sessionId && !this.disconnectedEmitted) {
      this.disconnectedEmitted = true;
      this.emit({ type: "disconnected", sessionId, reason });
    }
  }
}
