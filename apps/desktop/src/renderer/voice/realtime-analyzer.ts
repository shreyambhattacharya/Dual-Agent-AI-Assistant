import { analyserSamplesToAudioFeatures, smoothAudioFeatures } from "@jarvis/voice";
import type { AudioFeatures } from "@jarvis/voice";

export class BrowserAudioAnalyzer {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private timer: number | null = null;
  private previous: AudioFeatures = { rms: 0, low: 0, mid: 0, high: 0 };

  constructor(private readonly onFeatures: (features: AudioFeatures) => void) {}

  start(stream: MediaStream): void {
    this.startWithSource((context) => context.createMediaStreamSource(stream), false);
  }

  startAudioElement(audio: HTMLMediaElement): void {
    this.startWithSource((context) => context.createMediaElementSource(audio), true);
  }

  private startWithSource(
    createSource: (context: AudioContext) => MediaStreamAudioSourceNode | MediaElementAudioSourceNode,
    connectDestination: boolean,
  ): void {
    if (this.analyser || typeof AudioContext === "undefined") return;
    try {
      const context = new AudioContext();
      this.context = context;
      this.source = createSource(context);
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 256;
      this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.timeDomainData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      this.source.connect(this.analyser);
      if (connectDestination) this.analyser.connect(context.destination);
      void context.resume();
      this.timer = window.setInterval(() => {
        if (!this.analyser || !this.frequencyData || !this.timeDomainData) return;
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeDomainData);
        this.previous = smoothAudioFeatures(
          this.previous,
          analyserSamplesToAudioFeatures(Array.from(this.timeDomainData), Array.from(this.frequencyData)),
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
    this.frequencyData = null;
    this.timeDomainData = null;
    void this.context?.close();
    this.context = null;
    this.previous = { rms: 0, low: 0, mid: 0, high: 0 };
  }
}
