const assert = require("node:assert/strict");
const test = require("node:test");
const { ProjectRegistry } = require("../dist/projects.js");

const registry = new ProjectRegistry([
  {
    id: "cpu_system",
    name: "32-Bit Computer System",
    aliases: ["computer", "mini computer", "cpu", "fpga computer", "32-bit computer"],
    repositoryPath: "/example/cpu",
    preferredAgent: "CODEX",
  },
  {
    id: "hil_autonomy",
    name: "HIL Embedded Autonomy Platform",
    aliases: ["HIL project", "autonomy system", "rover"],
    repositoryPath: "/example/hil",
    preferredAgent: "CODEX",
  },
]);

test("resolves an exact project alias", () => {
  assert.equal(registry.resolve("computer")?.project.id, "cpu_system");
});

test("resolves an alias embedded in natural language", () => {
  assert.equal(registry.resolve("let's work on the fpga computer")?.project.id, "cpu_system");
});

test("returns null for unknown project reference", () => {
  assert.equal(registry.resolve("quantum toaster"), null);
});
