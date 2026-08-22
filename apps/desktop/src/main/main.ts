import { app, BrowserWindow, ipcMain, WebContents } from "electron";
import os from "node:os";
import path from "node:path";
import {
  AgentRouter,
  AutoModelSelector,
  ModelConfig,
  Orchestrator,
  OrchestratorEvent,
  RuleBasedIntentClassifier,
} from "@jarvis/core";
import {
  OpenAIChatAgent,
  OpenAISpeechSynthesisProvider,
  OpenAITranscriptionProvider,
  UnavailableAgent,
} from "@jarvis/agents";
import type {
  VoiceOperationResult,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceTranscriptionRequest,
  VoiceTranscriptionResponse,
} from "@jarvis/voice";
import { normalizeVoiceError } from "@jarvis/voice";

const activeRequests = new Map<string, AbortController>();
const activeVoiceRequests = new Map<string, AbortController>();
const MAX_VOICE_INPUT_BYTES = 10_000_000;
const MAX_VOICE_OUTPUT_BYTES = 10_000_000;
const MAX_VOICE_TEXT_LENGTH = 4_096;

function applyWindows26200CompatibilityWorkaround(): void {
  if (process.platform !== "win32" || process.env.JARVIS_DISABLE_WINDOWS_26200_WORKAROUND === "1") {
    return;
  }

  const windowsBuild = os.release().split(".")[2];
  if (windowsBuild !== "26200") {
    return;
  }

  // Windows 11 25H2 build 26200 has a Chromium child-process sandbox
  // regression that can terminate Electron before the renderer appears.
  // Keep the renderer sandbox enabled; only move GPU work out of the
  // affected sandbox path until the host OS/Electron combination is fixed.
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  app.commandLine.appendSwitch("in-process-gpu");
}

applyWindows26200CompatibilityWorkaround();

const modelConfig: ModelConfig = {
  conversation_fast: process.env.JARVIS_MODEL_CONVERSATION_FAST || "AUTO",
  reasoning: process.env.JARVIS_MODEL_REASONING || "AUTO",
  realtime_voice: process.env.JARVIS_MODEL_REALTIME_VOICE || "AUTO",
  speech_to_text: process.env.JARVIS_MODEL_SPEECH_TO_TEXT || "AUTO",
  text_to_speech: process.env.JARVIS_MODEL_TEXT_TO_SPEECH || "AUTO",
  coding: process.env.JARVIS_MODEL_CODING || "AUTO",
  coding_deep: process.env.JARVIS_MODEL_CODING_DEEP || "AUTO",
};

const modelSelector = new AutoModelSelector(modelConfig);
const openAiApiKey = process.env.OPENAI_API_KEY;
const transcriptionProvider = openAiApiKey
  ? new OpenAITranscriptionProvider({
      apiKey: openAiApiKey,
      model: modelSelector.selectSpeechToText().model,
    })
  : undefined;
const speechSynthesisProvider = openAiApiKey
  ? new OpenAISpeechSynthesisProvider({
      apiKey: openAiApiKey,
      model: modelSelector.selectTextToSpeech().model,
      voice: process.env.JARVIS_TTS_VOICE || "marin",
    })
  : undefined;

function createOrchestrator(): Orchestrator {
  const chatAgent = process.env.OPENAI_API_KEY
    ? new OpenAIChatAgent({ apiKey: process.env.OPENAI_API_KEY })
    : new UnavailableAgent(
        "CHATGPT",
        "ChatGPT is offline because OPENAI_API_KEY is not configured in the trusted desktop process.",
      );

  const codexAgent = new UnavailableAgent(
    "CODEX",
    "Codex routing is active, but the Codex SDK adapter is scheduled for the Codex integration milestone.",
  );

  return new Orchestrator(
    new AgentRouter(new RuleBasedIntentClassifier()),
    modelSelector,
    [chatAgent, codexAgent],
  );
}

const orchestrator = createOrchestrator();

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#03070d",
    title: "Jarvis",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  let hasShown = false;
  const showWindow = () => {
    if (hasShown || window.isDestroyed()) return;
    hasShown = true;
    window.show();
  };

  // `ready-to-show` is not emitted reliably on Windows 11 build 26200.
  // `did-finish-load` is a safe fallback because the renderer document is
  // ready at that point and the window remains hidden until then.
  window.once("ready-to-show", showWindow);
  window.webContents.once("did-finish-load", showWindow);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }

  return window;
}

function sendEvent(target: WebContents, requestId: string, event: OrchestratorEvent): void {
  if (!target.isDestroyed()) {
    target.send("jarvis:event", { requestId, event });
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("jarvis:chat:start", async (ipcEvent, payload: unknown) => {
    if (!isStartPayload(payload)) {
      throw new Error("Invalid chat request payload.");
    }

    if (activeRequests.has(payload.requestId)) {
      throw new Error("Duplicate request identifier.");
    }

    const controller = new AbortController();
    const target = ipcEvent.sender;
    activeRequests.set(payload.requestId, controller);

    void (async () => {
      try {
        for await (const event of orchestrator.handle({
          requestId: payload.requestId,
          text: payload.text,
          signal: controller.signal,
        })) {
          sendEvent(target, payload.requestId, event);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          sendEvent(target, payload.requestId, {
            type: "agent",
            event: {
              type: "error",
              code: "MAIN_PROCESS_FAILURE",
              message: error instanceof Error ? error.message : "The request failed in the main process.",
            },
          });
          sendEvent(target, payload.requestId, { type: "state", state: "ERROR" });
        }
      } finally {
        activeRequests.delete(payload.requestId);
      }
    })();
  });

  ipcMain.handle("jarvis:chat:cancel", async (_event, requestId: unknown) => {
    if (typeof requestId !== "string") return false;
    const controller = activeRequests.get(requestId);
    if (!controller) return false;
    controller.abort();
    return true;
  });

  ipcMain.handle(
    "jarvis:voice:transcribe",
    async (_event, payload: unknown): Promise<VoiceOperationResult<VoiceTranscriptionResponse>> => {
      if (!isVoiceTranscriptionRequest(payload)) {
        return voiceFailure("INVALID_VOICE_REQUEST", "Invalid transcription request.", false);
      }
      if (activeVoiceRequests.has(payload.sessionId)) {
        return voiceFailure("INVALID_VOICE_REQUEST", "Duplicate voice session identifier.", false);
      }
      if (!transcriptionProvider) {
        return voiceFailure(
          "TRANSCRIPTION_UNAVAILABLE",
          "Transcription is offline because OPENAI_API_KEY is not configured in the trusted desktop process.",
          false,
        );
      }

      const controller = new AbortController();
      activeVoiceRequests.set(payload.sessionId, controller);
      try {
        const result = await transcriptionProvider.transcribe(
          {
            data: payload.data,
            mimeType: payload.mimeType,
            fileName: payload.fileName,
            durationMs: payload.durationMs,
          },
          { signal: controller.signal },
        );
        const text = result.text.trim();
        if (!text) return voiceFailure("EMPTY_TRANSCRIPT", "No speech was detected.", true);
        return { ok: true, value: { text, durationMs: result.durationMs } };
      } catch (error) {
        return { ok: false, error: normalizeVoiceError(error, "TRANSCRIPTION_FAILED") };
      } finally {
        activeVoiceRequests.delete(payload.sessionId);
      }
    },
  );

  ipcMain.handle(
    "jarvis:voice:synthesize",
    async (_event, payload: unknown): Promise<VoiceOperationResult<VoiceSynthesisResponse>> => {
      if (!isVoiceSynthesisRequest(payload)) {
        return voiceFailure("INVALID_VOICE_REQUEST", "Invalid speech synthesis request.", false);
      }
      if (activeVoiceRequests.has(payload.sessionId)) {
        return voiceFailure("INVALID_VOICE_REQUEST", "Duplicate voice session identifier.", false);
      }
      if (!speechSynthesisProvider) {
        return voiceFailure(
          "SYNTHESIS_UNAVAILABLE",
          "Speech synthesis is offline because OPENAI_API_KEY is not configured in the trusted desktop process.",
          false,
        );
      }

      const controller = new AbortController();
      activeVoiceRequests.set(payload.sessionId, controller);
      try {
        const result = await speechSynthesisProvider.synthesize(payload.text, {
          signal: controller.signal,
        });
        if (result.data.byteLength > MAX_VOICE_OUTPUT_BYTES) {
          return voiceFailure("AUDIO_TOO_LARGE", "Generated speech exceeded the playback size limit.", false);
        }
        return { ok: true, value: result };
      } catch (error) {
        return { ok: false, error: normalizeVoiceError(error, "SYNTHESIS_FAILED") };
      } finally {
        activeVoiceRequests.delete(payload.sessionId);
      }
    },
  );

  ipcMain.handle("jarvis:voice:cancel", async (_event, sessionId: unknown) => {
    if (typeof sessionId !== "string") return false;
    const controller = activeVoiceRequests.get(sessionId);
    if (!controller) return false;
    controller.abort();
    return true;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

interface StartPayload {
  requestId: string;
  text: string;
}

function isStartPayload(payload: unknown): payload is StartPayload {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Record<string, unknown>;
  return (
    typeof value.requestId === "string" &&
    value.requestId.length >= 8 &&
    value.requestId.length <= 128 &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    value.text.length <= 100_000
  );
}

function voiceFailure<T>(
  code: Parameters<typeof normalizeVoiceError>[1],
  message: string,
  retryable: boolean,
): VoiceOperationResult<T> {
  return { ok: false, error: { code, message, retryable } };
}

function isVoiceSessionId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function isAudioMimeType(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^audio\/(?:webm|ogg|wav|mpeg|mp4|x-m4a|aac|flac)(?:;|$)/i.test(value)
  );
}

function readVoiceBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value;
  return undefined;
}

function isVoiceTranscriptionRequest(value: unknown): value is VoiceTranscriptionRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  const data = readVoiceBytes(payload.data);
  return (
    isVoiceSessionId(payload.sessionId) &&
    data !== undefined &&
    data.byteLength > 0 &&
    data.byteLength <= MAX_VOICE_INPUT_BYTES &&
    isAudioMimeType(payload.mimeType) &&
    typeof payload.fileName === "string" &&
    /^[a-zA-Z0-9._-]{1,128}$/.test(payload.fileName) &&
    (payload.durationMs === undefined ||
      (typeof payload.durationMs === "number" && Number.isFinite(payload.durationMs) && payload.durationMs >= 0))
  );
}

function isVoiceSynthesisRequest(value: unknown): value is VoiceSynthesisRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    isVoiceSessionId(payload.sessionId) &&
    typeof payload.text === "string" &&
    payload.text.trim().length > 0 &&
    payload.text.length <= MAX_VOICE_TEXT_LENGTH
  );
}
