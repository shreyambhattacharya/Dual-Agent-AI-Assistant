const assert = require("node:assert/strict");
const test = require("node:test");
const {
  OpenAISpeechSynthesisProvider,
  OpenAIRealtimeSessionProvider,
  OpenAITranscriptionProvider,
} = require("../dist/index.js");

const recording = {
  data: new Uint8Array([1, 2, 3]),
  mimeType: "audio/webm",
  fileName: "jarvis-recording.webm",
  durationMs: 420,
};

test("transcription provider sends a file to the configured model and trims text", async () => {
  let request;
  const client = {
    audio: {
      transcriptions: {
        create: async (body, options) => {
          request = { body, options };
          return { text: "  hello Jarvis  " };
        },
      },
    },
  };

  const provider = new OpenAITranscriptionProvider({ client, model: "gpt-transcribe" });
  const result = await provider.transcribe(recording);

  assert.equal(result.text, "hello Jarvis");
  assert.equal(request.body.model, "gpt-transcribe");
  assert.equal(request.body.response_format, "json");
  assert.equal(request.body.file.name, "jarvis-recording.webm");
});

test("transcription provider propagates cancellation to the SDK request", async () => {
  const client = {
    audio: {
      transcriptions: {
        create: (_body, options) =>
          new Promise((_resolve, reject) => {
            if (options.signal.aborted) {
              reject(new Error("request aborted"));
              return;
            }
            options.signal.addEventListener("abort", () => reject(new Error("request aborted")), {
              once: true,
            });
          }),
      },
    },
  };
  const provider = new OpenAITranscriptionProvider({ client });
  const controller = new AbortController();
  const pending = provider.transcribe(recording, { signal: controller.signal });
  controller.abort();

  await assert.rejects(pending, /request aborted/);
});

test("speech provider uses the configured TTS model and returns playable bytes", async () => {
  let request;
  const client = {
    audio: {
      speech: {
        create: async (body, options) => {
          request = { body, options };
          return { arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer };
        },
      },
    },
  };

  const provider = new OpenAISpeechSynthesisProvider({
    client,
    model: "gpt-4o-mini-tts",
    voice: "marin",
  });
  const result = await provider.synthesize("Hello from Jarvis.");

  assert.equal(request.body.model, "gpt-4o-mini-tts");
  assert.equal(request.body.voice, "marin");
  assert.equal(request.body.response_format, "mp3");
  assert.equal(result.mimeType, "audio/mpeg");
  assert.deepEqual([...result.data], [4, 5, 6]);
});

test("realtime session provider creates a short-lived transcription secret with server VAD", async () => {
  let request;
  const client = {
    realtime: {
      clientSecrets: {
        create: async (body, options) => {
          request = { body, options };
          return { value: "ek_test", expires_at: 12345, session: { type: "transcription" } };
        },
      },
    },
  };

  const provider = new OpenAIRealtimeSessionProvider({ client, model: "gpt-live-transcribe" });
  const result = await provider.createSession({ sessionId: "session-1" });

  assert.deepEqual(result, { value: "ek_test", expiresAt: 12345, model: "gpt-live-transcribe" });
  assert.equal(request.body.expires_after.seconds, 600);
  assert.equal(request.body.session.type, "transcription");
  assert.equal(request.body.session.audio.input.format.rate, 24000);
  assert.equal(request.body.session.audio.input.transcription.model, "gpt-live-transcribe");
  assert.equal(request.body.session.audio.input.turn_detection.type, "server_vad");
  assert.equal(request.body.session.audio.input.turn_detection.silence_duration_ms, 500);
});

test("realtime session provider forwards cancellation", async () => {
  const client = {
    realtime: {
      clientSecrets: {
        create: (_body, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(new Error("request aborted")), {
              once: true,
            });
          }),
      },
    },
  };
  const provider = new OpenAIRealtimeSessionProvider({ client });
  const controller = new AbortController();
  const pending = provider.createSession({ sessionId: "session-2" }, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /request aborted/);
});
