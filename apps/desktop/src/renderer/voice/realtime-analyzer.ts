import { frequencyBinsToAudioFeatures, smoothAudioFeatures } from "@jarvis/voice";
import type { AudioFeatures } from "@jarvis/voice";

export class BrowserAudioAnalyzer {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private timer: number | null = null;
  private previous: AudioFeatures = { rms: 0, low: 0, mid: 0, high: 0 };

  constructor(private readonly onFeatures: (features: AudioFeatures) => void) {}

  start(stream: MediaStream): void {
    if (this.analyser || typeof AudioContext === "undefined") return;
    try {
      this.context = new AudioContext();
      this.source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.source.connect(this.analyser);
      this.timer = window.setInterval(() => {
        if (!this.analyser || !this.data) return;
        this.analyser.getByteFrequencyData(this.data);
        this.previous = smoothAudioFeatures(
          this.previous,
          frequencyBinsToAudioFeatures(Array.from(this.data)),
          0.25,
        );
        this.onFeatures(this.previous);
      }, 50);
    } catch {
      this.stop();
    }
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.source?.disconnect();
    this.source = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.data = null;
    void this.context?.close();
    this.context = null;
    this.previous = { rms: 0, low: 0, mid: 0, high: 0 };
  }
}
