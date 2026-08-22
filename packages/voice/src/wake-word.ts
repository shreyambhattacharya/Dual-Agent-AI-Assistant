export interface WakeWordDetector {
  start(): Promise<void>;
  stop(): Promise<void>;
  onDetected(listener: () => void): () => void;
}

/** Explicit no-op boundary until an on-device wake-word engine is selected. */
export class NoopWakeWordDetector implements WakeWordDetector {
  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  onDetected(_listener: () => void): () => void {
    return () => {};
  }
}
