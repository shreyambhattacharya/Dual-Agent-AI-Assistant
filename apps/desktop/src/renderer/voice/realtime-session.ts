import type {
  RealtimeVoiceEvent,
  RealtimeVoiceTransport,
  VoiceError,
} from "@jarvis/voice";
import { RealtimeWebRtcTransport } from "./realtime-webrtc";

export class BrowserRealtimeVoiceSession {
  private readonly transport: RealtimeVoiceTransport;
  private readonly listeners = new Set<(event: RealtimeVoiceEvent) => void>();
  private sessionId: string | null = null;
  private generation = 0;
  private connectAbort: AbortController | null = null;

  constructor(transport: RealtimeVoiceTransport = new RealtimeWebRtcTransport()) {
    this.transport = transport;
    this.transport.onEvent((event) => {
      if (event.sessionId !== this.sessionId) return;
      if (event.type === "disconnected") {
        this.sessionId = null;
        this.generation += 1;
      }
      this.listeners.forEach((listener) => listener(event));
    });
  }

  onEvent(listener: (event: RealtimeVoiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get active(): boolean {
    return this.sessionId !== null;
  }

  async connect(deviceId?: string): Promise<void> {
    if (this.sessionId) return;
    const sessionId = crypto.randomUUID();
    const generation = ++this.generation;
    this.sessionId = sessionId;
    const connectAbort = new AbortController();
    this.connectAbort = connectAbort;
    try {
      const result = await window.jarvis.voice.realtime.createSession({ sessionId });
      if (generation !== this.generation || this.sessionId !== sessionId) return;
      if (!result.ok) throw new VoiceClientRealtimeError(result.error);
      await this.transport.connect({
        sessionId,
        ephemeralKey: result.value.value,
        deviceId,
        signal: connectAbort.signal,
      });
      if (generation !== this.generation || this.sessionId !== sessionId) {
        await this.transport.disconnect();
        return;
      }
      await this.transport.startListening();
    } catch (error) {
      if (generation !== this.generation || this.sessionId !== sessionId) return;
      if (this.sessionId === sessionId) this.sessionId = null;
      throw error;
    } finally {
      if (this.connectAbort === connectAbort) this.connectAbort = null;
    }
  }

  async stop(): Promise<void> {
    const sessionId = this.sessionId;
    this.generation += 1;
    this.sessionId = null;
    this.connectAbort?.abort();
    await this.transport.disconnect();
    if (sessionId) await window.jarvis.voice.realtime.cancel(sessionId);
  }

  async cancel(): Promise<void> {
    const sessionId = this.sessionId;
    this.generation += 1;
    this.sessionId = null;
    this.connectAbort?.abort();
    await this.transport.cancel();
    if (sessionId) await window.jarvis.voice.realtime.cancel(sessionId);
  }
}

class VoiceClientRealtimeError extends Error {
  constructor(readonly voiceError: VoiceError) {
    super(voiceError.message);
    this.name = "VoiceClientRealtimeError";
  }
}
