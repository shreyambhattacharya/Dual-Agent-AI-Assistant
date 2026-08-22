import { normalizeAudioInputDevices } from "@jarvis/voice";
import type { AudioInputDevice, AudioRecording, VoiceErrorCode } from "@jarvis/voice";

export class VoiceClientError extends Error {
  constructor(
    readonly code: VoiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VoiceClientError";
  }
}

export async function enumerateAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new VoiceClientError("MICROPHONE_UNAVAILABLE", "This environment does not expose microphone capture.");
  }

  let permissionStream: MediaStream | undefined;
  try {
    permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return normalizeAudioInputDevices(
      devices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind,
      })),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new VoiceClientError("MICROPHONE_PERMISSION_DENIED", "Microphone permission was denied.");
    }
    throw new VoiceClientError(
      "MICROPHONE_UNAVAILABLE",
      error instanceof Error ? error.message : "Unable to enumerate microphones.",
    );
  } finally {
    permissionStream?.getTracks().forEach((track) => track.stop());
  }
}

function supportedMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function fileNameForMimeType(mimeType: string): string {
  if (mimeType.includes("ogg")) return "jarvis-recording.ogg";
  if (mimeType.includes("wav")) return "jarvis-recording.wav";
  return "jarvis-recording.webm";
}

export class BrowserVoiceCapture {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private pendingStop: {
    resolve: (recording: AudioRecording) => void;
    reject: (error: unknown) => void;
  } | null = null;

  async start(deviceId?: string): Promise<void> {
    if (this.recorder) throw new VoiceClientError("AUDIO_CAPTURE_FAILED", "A microphone recording is already active.");
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new VoiceClientError("MICROPHONE_UNAVAILABLE", "This environment does not expose microphone capture.");
    }

    const audio = deviceId ? { deviceId: { exact: deviceId } } : true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio });
      const mimeType = supportedMimeType();
      this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
      this.chunks = [];
      this.startedAt = performance.now();
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };
      this.recorder.onerror = () => {
        this.pendingStop?.reject(new VoiceClientError("AUDIO_CAPTURE_FAILED", "Microphone recording failed."));
        this.pendingStop = null;
        this.cleanup();
      };
      this.recorder.onstop = () => {
        void this.finishStop();
      };
      this.recorder.start();
    } catch (error) {
      this.cleanup();
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw new VoiceClientError("MICROPHONE_PERMISSION_DENIED", "Microphone permission was denied.");
      }
      throw new VoiceClientError(
        "AUDIO_CAPTURE_FAILED",
        error instanceof Error ? error.message : "Unable to start microphone recording.",
      );
    }
  }

  stop(): Promise<AudioRecording> {
    if (!this.recorder || this.recorder.state === "inactive") {
      return Promise.reject(new VoiceClientError("AUDIO_CAPTURE_FAILED", "No microphone recording is active."));
    }

    return new Promise<AudioRecording>((resolve, reject) => {
      this.pendingStop = { resolve, reject };
      this.recorder?.stop();
    });
  }

  cancel(): void {
    const recorder = this.recorder;
    this.pendingStop?.reject(new VoiceClientError("VOICE_CANCELLED", "Microphone recording cancelled."));
    this.pendingStop = null;
    this.recorder = null;
    this.cleanupStream();
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  private async finishStop(): Promise<void> {
    const recorder = this.recorder;
    const pendingStop = this.pendingStop;
    this.pendingStop = null;
    if (!recorder || !pendingStop) {
      this.cleanup();
      return;
    }

    try {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(this.chunks, { type: mimeType });
      const buffer = await blob.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new VoiceClientError("AUDIO_CAPTURE_FAILED", "The microphone returned an empty recording.");
      }
      pendingStop.resolve({
        data: new Uint8Array(buffer),
        mimeType,
        fileName: fileNameForMimeType(mimeType),
        durationMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
      });
    } catch (error) {
      pendingStop.reject(error);
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.recorder = null;
    this.chunks = [];
    this.cleanupStream();
  }

  private cleanupStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
