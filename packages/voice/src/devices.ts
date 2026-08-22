import type { AudioInputDevice, RawAudioInputDevice } from "./types";

export function normalizeAudioInputDevices(
  devices: readonly RawAudioInputDevice[],
): AudioInputDevice[] {
  const seen = new Set<string>();
  const normalized: AudioInputDevice[] = [];

  for (const device of devices) {
    const deviceId = device.deviceId.trim();
    if (device.kind !== "audioinput" || !deviceId || seen.has(deviceId)) continue;
    seen.add(deviceId);
    const label = device.label.trim() || `Microphone ${normalized.length + 1}`;
    normalized.push({
      deviceId,
      label,
      isDefault: deviceId === "default" || /\bdefault\b/i.test(label),
    });
  }

  return normalized.sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
}

export function selectAudioInputDevice(
  devices: readonly AudioInputDevice[],
  preferredDeviceId?: string,
): AudioInputDevice | undefined {
  if (preferredDeviceId) {
    const preferred = devices.find((device) => device.deviceId === preferredDeviceId);
    if (preferred) return preferred;
  }
  return devices.find((device) => device.isDefault) ?? devices[0];
}
