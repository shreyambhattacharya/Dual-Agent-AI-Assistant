import type { SpeechAudio } from "@jarvis/voice";
import type { AudioFeatures } from "@jarvis/voice";
import { BrowserAudioAnalyzer } from "./realtime-analyzer";

export class BrowserAudioPlayback {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private completion: { resolve: () => void; reject: (error: unknown) => void } | null = null;
  private readonly analyzer: BrowserAudioAnalyzer;

  constructor(onFeatures: (features: AudioFeatures) => void = () => {}) {
    this.analyzer = new BrowserAudioAnalyzer(onFeatures);
  }

  play(payload: SpeechAudio): Promise<void> {
    this.stop();
    const bytes = new Uint8Array(payload.data);
    const blob = new Blob([bytes], { type: payload.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    this.objectUrl = objectUrl;
    this.audio = audio;
    this.analyzer.startAudioElement(audio);

    return new Promise<void>((resolve, reject) => {
      this.completion = { resolve, reject };
      const finish = (error?: unknown) => {
        if (error) reject(error);
        else resolve();
        this.cleanup(audio, objectUrl);
      };
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error("Speech playback failed."));
      void audio.play().catch((error: unknown) => finish(error));
    });
  }

  stop(): void {
    this.analyzer.stop();
    const audio = this.audio;
    const objectUrl = this.objectUrl;
    const completion = this.completion;
    this.audio = null;
    this.objectUrl = null;
    this.completion = null;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    completion?.resolve();
  }

  private cleanup(audio: HTMLAudioElement, objectUrl: string): void {
    if (this.audio !== audio) return;
    this.analyzer.stop();
    this.audio = null;
    this.objectUrl = null;
    this.completion = null;
    URL.revokeObjectURL(objectUrl);
  }
}
