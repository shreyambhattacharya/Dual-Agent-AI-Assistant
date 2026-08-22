import type { OrchestratorEvent } from "@jarvis/core";

declare global {
  interface Window {
    jarvis: {
      startChat(requestId: string, text: string): Promise<void>;
      cancelChat(requestId: string): Promise<boolean>;
      onEvent(callback: (payload: { requestId: string; event: OrchestratorEvent }) => void): () => void;
    };
  }
}

export {};
