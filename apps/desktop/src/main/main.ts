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
import { OpenAIChatAgent, UnavailableAgent } from "@jarvis/agents";

const activeRequests = new Map<string, AbortController>();

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
  coding: process.env.JARVIS_MODEL_CODING || "AUTO",
  coding_deep: process.env.JARVIS_MODEL_CODING_DEEP || "AUTO",
};

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
    new AutoModelSelector(modelConfig),
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
