import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AgentId, AppState, OrchestratorEvent } from "@jarvis/core";
import { HoloCore } from "./components/HoloCore";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export function App() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<AppState>("IDLE");
  const [agent, setAgent] = useState<AgentId>("CHATGPT");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      text: "Foundation online. Typed ChatGPT streaming is the first active vertical slice; Codex is routed but not connected yet.",
    },
  ]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const responseIdRef = useRef<string | null>(null);

  useEffect(() => {
    return window.jarvis.onEvent(({ requestId, event }) => {
      if (activeRequestId && requestId !== activeRequestId) return;
      applyEvent(event);
    });
  }, [activeRequestId]);

  function applyEvent(event: OrchestratorEvent) {
    if (event.type === "state") {
      setState(event.state);
      if (event.state === "IDLE" || event.state === "ERROR") {
        setActiveRequestId(null);
        responseIdRef.current = null;
      }
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

    if (agentEvent.type === "error") {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "system", text: agentEvent.message },
      ]);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || activeRequestId) return;

    const requestId = crypto.randomUUID();
    responseIdRef.current = null;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setActiveRequestId(requestId);
    setState("ROUTING");

    try {
      await window.jarvis.startChat(requestId, text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start the request.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "system", text: message }]);
      setState("ERROR");
      setActiveRequestId(null);
    }
  }

  async function stop() {
    if (!activeRequestId) return;
    await window.jarvis.cancelChat(activeRequestId);
  }

  const statusText = useMemo(() => state.replaceAll("_", " "), [state]);

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
      </section>

      <footer className="composer-wrap">
        <div className="activity-strip">
          <span className={`activity-dot activity-dot--${state.toLowerCase()}`} />
          <span>{agent}</span>
          <span className="activity-separator">/</span>
          <span>{statusText}</span>
          <span className="activity-fill" />
          {activeRequestId ? (
            <button className="stop-button" type="button" onClick={stop}>
              STOP
            </button>
          ) : null}
        </div>
        <form className="composer" onSubmit={submit}>
          <button className="mic-button" type="button" aria-label="Voice input planned for phase 2" disabled>
            MIC
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a request, or explicitly address ChatGPT / Codex..."
            disabled={Boolean(activeRequestId)}
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || Boolean(activeRequestId)}>
            SEND
          </button>
        </form>
      </footer>
    </main>
  );
}
