import { contextBridge, ipcRenderer } from "electron";
import type { OrchestratorEvent } from "@jarvis/core";

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
  onEvent(callback: (payload: JarvisEventPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: JarvisEventPayload) => callback(payload);
    ipcRenderer.on("jarvis:event", listener);
    return () => ipcRenderer.removeListener("jarvis:event", listener);
  },
};

contextBridge.exposeInMainWorld("jarvis", api);
