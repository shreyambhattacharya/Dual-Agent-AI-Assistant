import { Canvas } from "@react-three/fiber";
import type { HologramInput } from "./model";
import { HologramScene } from "./HologramScene";
import type { HologramQualityProfile } from "./quality";

export function HologramCanvas({ input, quality }: { input: HologramInput; quality: HologramQualityProfile }) {
  return (
    <Canvas
      className="hologram__canvas"
      dpr={quality.dpr}
      frameloop="always"
      gl={{ alpha: true, antialias: quality.antialias, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 4.7], fov: 42, near: 0.1, far: 20 }}
    >
      <HologramScene input={input} quality={quality} />
    </Canvas>
  );
}
