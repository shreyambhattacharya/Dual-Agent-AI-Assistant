const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeAudioInputDevices, selectAudioInputDevice } = require("../dist/index.js");

test("normalizes, de-duplicates, and prioritizes the default microphone", () => {
  const devices = normalizeAudioInputDevices([
    { deviceId: "usb", label: "USB Mic", kind: "audioinput" },
    { deviceId: "default", label: "Default - Built-in Mic", kind: "audioinput" },
    { deviceId: "usb", label: "Duplicate", kind: "audioinput" },
    { deviceId: "speaker", label: "Speakers", kind: "audiooutput" },
  ]);

  assert.deepEqual(devices.map((device) => device.deviceId), ["default", "usb"]);
  assert.equal(selectAudioInputDevice(devices, "missing").deviceId, "default");
});

test("falls back to the first available input when no default exists", () => {
  const devices = normalizeAudioInputDevices([
    { deviceId: "b", label: "Second", kind: "audioinput" },
    { deviceId: "a", label: "First", kind: "audioinput" },
  ]);

  assert.equal(selectAudioInputDevice(devices).deviceId, "a");
});
