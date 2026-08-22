const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rendererPath = path.resolve(__dirname, "../../../apps/desktop/src/renderer/App.tsx");
const preloadPath = path.resolve(__dirname, "../../../apps/desktop/src/main/preload.ts");
const mainPath = path.resolve(__dirname, "../../../apps/desktop/src/main/main.ts");

test("renderer and preload do not contain or read the OpenAI secret", () => {
  const renderer = fs.readFileSync(rendererPath, "utf8");
  const preload = fs.readFileSync(preloadPath, "utf8");
  assert.equal(renderer.includes("OPENAI_API_KEY"), false);
  assert.equal(preload.includes("OPENAI_API_KEY"), false);
});

test("the OpenAI secret is read only by the trusted main process", () => {
  const main = fs.readFileSync(mainPath, "utf8");
  assert.equal(main.includes("process.env.OPENAI_API_KEY"), true);
});
