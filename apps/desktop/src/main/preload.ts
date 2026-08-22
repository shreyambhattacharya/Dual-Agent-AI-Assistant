import { contextBridge, ipcRenderer } from "electron";
import type { OrchestratorEvent } from "@jarvis/core";
import type {
  VoiceOperationResult,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceTranscriptionRequest,
  VoiceTranscriptionResponse,
  RealtimeSessionRequest,
  RealtimeSessionToken,
} from "@jarvis/voice";

export interface JarvisEventPayload {
  requestId: string;
  event: OrchestratorEvent;
}

const api = {
  startChat(requestId: string, text: string): Promise<void> {
    return ipcRenderer.invoke("jarvis:chat:start", { requestId, text });
  },
  cancelChat(requestId: string): Promise<boolean> {
    return ipcRenderer.invoke("jarvis:chat:cancel", requestId);
  },
  voice: {
    transcribe(
      request: VoiceTranscriptionRequest,
    ): Promise<VoiceOperationResult<VoiceTranscriptionResponse>> {
      return ipcRenderer.invoke("jarvis:voice:transcribe", request);
    },
    synthesize(
      request: VoiceSynthesisRequest,
    ): Promise<VoiceOperationResult<VoiceSynthesisResponse>> {
      return ipcRenderer.invoke("jarvis:voice:synthesize", request);
    },
    cancel(sessionId: string): Promise<boolean> {
      return ipcRenderer.invoke("jarvis:voice:cancel", sessionId);
    },
    realtime: {
      createSession(
        request: RealtimeSessionRequest,
      ): Promise<VoiceOperationResult<RealtimeSessionToken>> {
        return ipcRenderer.invoke("jarvis:voice:realtime:create-session", request);
      },
      cancel(sessionId: string): Promise<boolean> {
        return ipcRenderer.invoke("jarvis:voice:realtime:cancel", sessionId);
      },
    },
  },
  onEvent(callback: (payload: JarvisEventPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: JarvisEventPayload) => callback(payload);
    ipcRenderer.on("jarvis:event", listener);
    return () => ipcRenderer.removeListener("jarvis:event", listener);
  },
};

contextBridge.exposeInMainWorld("jarvis", api);
