import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AgentId, AppState, OrchestratorEvent } from "@jarvis/core";
import {
  applyRealtimeTranscriptEvent,
  createRealtimeTranscriptState,
  selectAudioInputDevice,
} from "@jarvis/voice";
import type {
  AudioFeatures,
  AudioInputDevice,
  RealtimeVoiceEvent,
  RealtimeVoiceMode,
} from "@jarvis/voice";
import { HoloCore } from "./components/HoloCore";
import { BrowserVoiceCapture, enumerateAudioInputDevices, VoiceClientError } from "./voice/capture";
import { BrowserAudioPlayback } from "./voice/playback";
import { BrowserRealtimeVoiceSession } from "./voice/realtime-session";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Voice operation failed.";
}

export function App() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<AppState>("IDLE");
  const [agent, setAgent] = useState<AgentId>("CHATGPT");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      text: "Foundation online. ChatGPT streaming and the M2 microphone vertical slice are available; Codex is routed but not connected yet.",
    },
  ]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [voiceDevices, setVoiceDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<RealtimeVoiceMode>("PUSH_TO_TALK");
  const [realtimeState, setRealtimeState] = useState("DISCONNECTED");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({ rms: 0, low: 0, mid: 0, high: 0 });
  const [, setVoiceSessionId] = useState<string | null>(null);
  const responseIdRef = useRef<string | null>(null);
  const responseTextRef = useRef("");
  const activeRequestIdRef = useRef<string | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const voicePlaybackActiveRef = useRef(false);
  const captureRef = useRef<BrowserVoiceCapture | null>(null);
  const playbackRef = useRef<BrowserAudioPlayback | null>(null);
  const realtimeRef = useRef<BrowserRealtimeVoiceSession | null>(null);
  const realtimeTranscriptRef = useRef(createRealtimeTranscriptState());
  const voiceModeRef = useRef<RealtimeVoiceMode>("PUSH_TO_TALK");

  if (!captureRef.current) captureRef.current = new BrowserVoiceCapture();
  if (!playbackRef.current) playbackRef.current = new BrowserAudioPlayback();
  if (!realtimeRef.current) realtimeRef.current = new BrowserRealtimeVoiceSession();

  function setActiveRequest(requestId: string | null) {
    activeRequestIdRef.current = requestId;
    setActiveRequestId(requestId);
  }

  function setVoiceSession(sessionId: string | null) {
    voiceSessionIdRef.current = sessionId;
    setVoiceSessionId(sessionId);
  }

  function addSystemMessage(text: string) {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "system", text }]);
  }

  useEffect(() => {
    const removeListener = window.jarvis.onEvent(({ requestId, event }) => {
      const activeRequest = activeRequestIdRef.current;
      if (!activeRequest || requestId !== activeRequest) return;
      applyEvent(event);
    });
    const removeRealtimeListener = realtimeRef.current?.onEvent(handleRealtimeEvent);

    return () => {
      removeListener();
      removeRealtimeListener?.();
      captureRef.current?.cancel();
      playbackRef.current?.stop();
      void realtimeRef.current?.cancel();
    };
  }, []);

  function applyEvent(event: OrchestratorEvent) {
    if (event.type === "state") {
      if (event.state === "IDLE") {
        if (voicePlaybackActiveRef.current) return;
        setActiveRequest(null);
        responseIdRef.current = null;
        responseTextRef.current = "";
      }
      if (event.state === "ERROR") {
        setActiveRequest(null);
        responseIdRef.current = null;
        responseTextRef.current = "";
        setVoiceSession(null);
        voicePlaybackActiveRef.current = false;
      }
      setState(event.state);
      return;
    }

    if (event.type === "route") {
      setAgent(event.decision.agent);
      return;
    }

    const agentEvent = event.event;
    if (agentEvent.type === "started") {
      setAgent(agentEvent.agent);
      return;
    }

    if (agentEvent.type === "text_delta") {
      responseTextRef.current += agentEvent.delta;
      const id = responseIdRef.current ?? crypto.randomUUID();
      responseIdRef.current = id;
      setMessages((current) => {
        const existing = current.find((message) => message.id === id);
        if (!existing) return [...current, { id, role: "assistant", text: agentEvent.delta }];
        return current.map((message) =>
          message.id === id ? { ...message, text: message.text + agentEvent.delta } : message,
        );
      });
      return;
    }

    if (agentEvent.type === "completed") {
      const sessionId = voiceSessionIdRef.current;
      if (sessionId && responseTextRef.current.trim()) {
        void synthesizeAndPlay(sessionId, responseTextRef.current);
      }
      return;
    }

    if (agentEvent.type === "error") {
      addSystemMessage(agentEvent.message);
    }
  }

  function interruptAssistantForBargeIn() {
    playbackRef.current?.stop();
    voicePlaybackActiveRef.current = false;
    const voiceSessionId = voiceSessionIdRef.current;
    const requestId = activeRequestIdRef.current;
    setVoiceSession(null);
    setActiveRequest(null);
    responseIdRef.current = null;
    responseTextRef.current = "";
    if (voiceSessionId) void window.jarvis.voice.cancel(voiceSessionId);
    if (requestId) void window.jarvis.cancelChat(requestId);
  }

  function handleRealtimeEvent(event: RealtimeVoiceEvent) {
    if (event.type === "connected") {
      realtimeTranscriptRef.current = createRealtimeTranscriptState(event.sessionId);
      setLiveTranscript("");
      setRealtimeState("LISTENING");
      if (!activeRequestIdRef.current && !voicePlaybackActiveRef.current) setState("LISTENING");
      return;
    }

    if (event.type === "speech_started") {
      setRealtimeState("LISTENING");
      if (activeRequestIdRef.current || voicePlaybackActiveRef.current) interruptAssistantForBargeIn();
      setState("LISTENING");
      return;
    }

    if (event.type === "speech_stopped") {
      setRealtimeState("FINALIZING");
      if (!activeRequestIdRef.current) setState("TRANSCRIBING");
      return;
    }

    if (event.type === "audio_level") {
      setAudioFeatures(event.features);
      return;
    }

    if (event.type === "transcript_partial" || event.type === "transcript_final") {
      const update = applyRealtimeTranscriptEvent(realtimeTranscriptRef.current, event);
      realtimeTranscriptRef.current = update.state;
      if (update.partialText !== undefined) setLiveTranscript(update.partialText);
      if (update.finalText !== undefined) {
        setLiveTranscript("");
        setRealtimeState("LISTENING");
        if (update.finalText) void submitText(update.finalText, event.sessionId);
      }
      return;
    }

    if (event.type === "error") {
      setVoiceError(event.message);
      addSystemMessage(event.message);
      setRealtimeState("ERROR");
      return;
    }

    if (event.type === "disconnected") {
      setRealtimeState("DISCONNECTED");
      setLiveTranscript("");
      if (voiceModeRef.current === "REALTIME") {
        voiceModeRef.current = "PUSH_TO_TALK";
        setVoiceMode("PUSH_TO_TALK");
        setState("IDLE");
        setVoiceError(event.reason === "cancelled" ? null : "Realtime voice disconnected; push-to-talk is available.");
      }
    }
  }

  async function submitText(text: string, sourceVoiceSessionId?: string): Promise<boolean> {
    const normalizedText = text.trim();
    if (!normalizedText || activeRequestIdRef.current) return false;

    const requestId = crypto.randomUUID();
    responseIdRef.current = null;
    responseTextRef.current = "";
    if (sourceVoiceSessionId) setVoiceSession(sourceVoiceSessionId);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: normalizedText },
    ]);
    setInput("");
    setActiveRequest(requestId);
    setState("ROUTING");

    try {
      await window.jarvis.startChat(requestId, normalizedText);
      return true;
    } catch (error) {
      addSystemMessage(errorText(error));
      setState("ERROR");
      setActiveRequest(null);
      setVoiceSession(null);
      return false;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitText(input);
  }

  async function refreshMicrophones(): Promise<AudioInputDevice[]> {
    try {
      const devices = await enumerateAudioInputDevices();
      setVoiceDevices(devices);
      const selected = selectAudioInputDevice(devices, selectedDeviceId);
      setSelectedDeviceId(selected?.deviceId ?? "");
      setVoiceError(devices.length ? null : "No microphone input was found.");
      return devices;
    } catch (error) {
      setVoiceError(errorText(error));
      return [];
    }
  }

  async function beginVoiceCapture() {
    if (voiceModeRef.current === "REALTIME") return;
    if (activeRequestIdRef.current && !voicePlaybackActiveRef.current) return;
    setVoiceError(null);
    playbackRef.current?.stop();
    voicePlaybackActiveRef.current = false;
    setActiveRequest(null);
    setVoiceSession(null);

    const devices = voiceDevices.length ? voiceDevices : await refreshMicrophones();
    const selected = selectAudioInputDevice(devices, selectedDeviceId);
    if (!selected) {
      setState("ERROR");
      setVoiceError("No microphone input was found.");
      return;
    }

    const sessionId = crypto.randomUUID();
    setVoiceSession(sessionId);
    setState("LISTENING");
    try {
      await captureRef.current?.start(selected.deviceId);
    } catch (error) {
      setVoiceSession(null);
      setState("ERROR");
      setVoiceError(errorText(error));
    }
  }

  async function finishVoiceRecording() {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId) return;

    let recording;
    try {
      recording = await captureRef.current?.stop();
    } catch (error) {
      if (error instanceof VoiceClientError && error.code === "VOICE_CANCELLED") return;
      setVoiceSession(null);
      setState("ERROR");
      setVoiceError(errorText(error));
      return;
    }
    if (!recording) return;

    setState("TRANSCRIBING");
    try {
      const result = await window.jarvis.voice.transcribe({
        sessionId,
        data: recording.data,
        mimeType: recording.mimeType,
        fileName: recording.fileName,
        durationMs: recording.durationMs,
      });
      if (voiceSessionIdRef.current !== sessionId) return;
      if (!result.ok) {
        setVoiceError(result.error.message);
        addSystemMessage(result.error.message);
        setVoiceSession(null);
        setState("IDLE");
        return;
      }
      await submitText(result.value.text, sessionId);
    } catch (error) {
      if (voiceSessionIdRef.current !== sessionId) return;
      setVoiceError(errorText(error));
      addSystemMessage(errorText(error));
      setVoiceSession(null);
      setState("ERROR");
    }
  }

  async function synthesizeAndPlay(sessionId: string, text: string) {
    voicePlaybackActiveRef.current = true;
    setState("SPEAKING");
    try {
      const result = await window.jarvis.voice.synthesize({ sessionId, text });
      if (voiceSessionIdRef.current !== sessionId) return;
      if (!result.ok) {
        setVoiceError(result.error.message);
        addSystemMessage(result.error.message);
        setVoiceSession(null);
        voicePlaybackActiveRef.current = false;
        setActiveRequest(null);
        setState("ERROR");
        return;
      }
      await playbackRef.current?.play(result.value);
      if (voiceSessionIdRef.current !== sessionId) return;
      voicePlaybackActiveRef.current = false;
      setVoiceSession(null);
      setActiveRequest(null);
      responseTextRef.current = "";
      setState(voiceModeRef.current === "REALTIME" && realtimeRef.current?.active ? "LISTENING" : "IDLE");
    } catch (error) {
      if (voiceSessionIdRef.current !== sessionId) return;
      setVoiceError(errorText(error));
      addSystemMessage(errorText(error));
      voicePlaybackActiveRef.current = false;
      setVoiceSession(null);
      setActiveRequest(null);
      setState("ERROR");
    }
  }

  async function stop() {
    captureRef.current?.cancel();
    playbackRef.current?.stop();
    voicePlaybackActiveRef.current = false;
    const sessionId = voiceSessionIdRef.current;
    const requestId = activeRequestIdRef.current;
    setVoiceSession(null);
    if (sessionId) await window.jarvis.voice.cancel(sessionId);
    if (requestId) await window.jarvis.cancelChat(requestId);
    if (voiceModeRef.current === "REALTIME") {
      await realtimeRef.current?.cancel();
      voiceModeRef.current = "PUSH_TO_TALK";
      setVoiceMode("PUSH_TO_TALK");
      setRealtimeState("DISCONNECTED");
    }
    setLiveTranscript("");
    setActiveRequest(null);
    responseIdRef.current = null;
    responseTextRef.current = "";
    setState("IDLE");
  }

  async function changeVoiceMode(nextMode: RealtimeVoiceMode) {
    if (nextMode === voiceModeRef.current) return;
    setVoiceError(null);
    if (nextMode === "PUSH_TO_TALK") {
      await realtimeRef.current?.stop();
      voiceModeRef.current = nextMode;
      setVoiceMode(nextMode);
      setRealtimeState("DISCONNECTED");
      setLiveTranscript("");
      if (!activeRequestIdRef.current && !voicePlaybackActiveRef.current) setState("IDLE");
      return;
    }

    if (activeRequestIdRef.current || voicePlaybackActiveRef.current) await stop();
    const devices = voiceDevices.length ? voiceDevices : await refreshMicrophones();
    const selected = selectAudioInputDevice(devices, selectedDeviceId);
    if (!selected) {
      setVoiceError("No microphone input was found.");
      return;
    }

    voiceModeRef.current = nextMode;
    setVoiceMode(nextMode);
    setRealtimeState("CONNECTING");
    try {
      await realtimeRef.current?.connect(selected.deviceId);
      if (voiceModeRef.current === nextMode) {
        setRealtimeState("LISTENING");
        setState("LISTENING");
      }
    } catch (error) {
      voiceModeRef.current = "PUSH_TO_TALK";
      setVoiceMode("PUSH_TO_TALK");
      setRealtimeState("DISCONNECTED");
      setVoiceError(errorText(error));
      addSystemMessage(errorText(error));
    }
  }

  function toggleVoice() {
    if (voiceModeRef.current === "REALTIME") return;
    if (state === "LISTENING") {
      void finishVoiceRecording();
      return;
    }
    if (state === "TRANSCRIBING") {
      void stop();
      return;
    }
    if (state === "SPEAKING") {
      void beginVoiceCapture();
      return;
    }
    void beginVoiceCapture();
  }

  const statusText = useMemo(() => state.replaceAll("_", " "), [state]);
  const voiceActive = state === "LISTENING" || state === "TRANSCRIBING" || state === "SPEAKING";

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">JARVIS</div>
          <div className="subtitle">Dual-agent desktop intelligence</div>
        </div>
        <div className="topbar__status">
          <span className="presence-dot" /> ONLINE
        </div>
      </header>

      <section className="hero">
        <div className="telemetry telemetry--left">
          <span>STATE</span>
          <strong>{statusText}</strong>
        </div>
        <HoloCore state={state} />
        <div className="telemetry telemetry--right">
          <span>AGENT</span>
          <strong>{agent}</strong>
        </div>
      </section>

      <section className="conversation" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`message message--${message.role}`}>
            <span className="message__role">
              {message.role === "user" ? "YOU" : message.role === "assistant" ? "JARVIS" : "SYSTEM"}
            </span>
            <p>{message.text}</p>
          </article>
        ))}
        {liveTranscript ? (
          <article className="message message--user message--draft">
            <span className="message__role">YOU</span>
            <p>{liveTranscript}</p>
          </article>
        ) : null}
      </section>

      <footer className="composer-wrap">
        <div className="activity-strip">
          <span className={`activity-dot activity-dot--${state.toLowerCase()}`} />
          <span>{agent}</span>
          <span className="activity-separator">/</span>
          <span>{voiceMode === "REALTIME" ? `LIVE ${realtimeState}` : statusText}</span>
          <span className="activity-fill" />
          <span className="voice-level" aria-label="Microphone level">
            LVL {Math.round(audioFeatures.rms * 100)}
          </span>
          <select
            className="voice-mode-select"
            aria-label="Voice mode"
            value={voiceMode}
            onChange={(event) => void changeVoiceMode(event.target.value as RealtimeVoiceMode)}
          >
            <option value="PUSH_TO_TALK">PUSH TO TALK</option>
            <option value="REALTIME">REALTIME</option>
          </select>
          <select
            className="voice-device-select"
            aria-label="Microphone input"
            value={selectedDeviceId}
            onFocus={() => void refreshMicrophones()}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
          >
            <option value="">MIC SOURCE</option>
            {voiceDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          {voiceError ? <span className="voice-error">{voiceError}</span> : null}
          {activeRequestId || voiceActive ? (
            <button className="stop-button" type="button" onClick={() => void stop()}>
              STOP
            </button>
          ) : null}
        </div>
        <form className="composer" onSubmit={submit}>
          <button
            className={`mic-button${state === "LISTENING" ? " mic-button--active" : ""}`}
            type="button"
            aria-label={state === "LISTENING" ? "Finish voice recording" : "Start voice recording"}
            aria-pressed={state === "LISTENING"}
            onClick={toggleVoice}
            disabled={voiceMode === "REALTIME" || (Boolean(activeRequestId) && !voicePlaybackActiveRef.current)}
          >
            {voiceMode === "REALTIME" ? "LIVE" : state === "LISTENING" ? "DONE" : "MIC"}
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a request, or use MIC for push-to-talk..."
            disabled={Boolean(activeRequestId) || voiceActive}
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || Boolean(activeRequestId) || voiceActive}>
            SEND
          </button>
        </form>
      </footer>
    </main>
  );
}
