import type { RealtimeVoiceEvent } from "./types";

export interface RealtimeTranscriptState {
  sessionId: string | null;
  partialByItem: Record<string, string>;
  finalByItem: Record<string, string>;
  finalizedItemIds: string[];
}

export interface RealtimeTranscriptUpdate {
  state: RealtimeTranscriptState;
  partialText?: string;
  finalText?: string;
}

export function createRealtimeTranscriptState(sessionId?: string): RealtimeTranscriptState {
  return {
    sessionId: sessionId ?? null,
    partialByItem: {},
    finalByItem: {},
    finalizedItemIds: [],
  };
}

export function applyRealtimeTranscriptEvent(
  state: RealtimeTranscriptState,
  event: Extract<RealtimeVoiceEvent, { type: "transcript_partial" | "transcript_final" }>,
): RealtimeTranscriptUpdate {
  if (state.sessionId && state.sessionId !== event.sessionId) return { state };
  const sessionId = state.sessionId ?? event.sessionId;
  if (event.type === "transcript_partial") {
    if (state.finalizedItemIds.includes(event.itemId)) return { state };
    const partialByItem = {
      ...state.partialByItem,
      [event.itemId]: `${state.partialByItem[event.itemId] ?? ""}${event.text}`,
    };
    return { state: { ...state, sessionId, partialByItem }, partialText: partialByItem[event.itemId] };
  }

  if (state.finalizedItemIds.includes(event.itemId)) return { state };
  const finalByItem = { ...state.finalByItem, [event.itemId]: event.text.trim() };
  const partialByItem = { ...state.partialByItem };
  delete partialByItem[event.itemId];
  return {
    state: {
      partialByItem,
      sessionId,
      finalByItem,
      finalizedItemIds: [...state.finalizedItemIds, event.itemId],
    },
    finalText: finalByItem[event.itemId],
  };
}
