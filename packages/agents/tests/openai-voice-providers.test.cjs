const assert = require("node:assert/strict");
const test = require("node:test");
const {
  OpenAISpeechSynthesisProvider,
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
