import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { dampHologramVisualState } from "./animation";
import { CoreGeometry } from "./CoreGeometry";
import { EnergyShell } from "./EnergyShell";
import { OrbitalRings } from "./OrbitalRings";
import { ParticleField } from "./ParticleField";
import type { HologramInput, HologramVisualState } from "./model";
import { resolveHologramVisualState } from "./model";
import type { HologramQualityProfile } from "./quality";

export function HologramScene({ input, quality }: { input: HologramInput; quality: HologramQualityProfile }) {
  const target = useMemo(() => resolveHologramVisualState(input), [input]);
  const currentRef = useRef<HologramVisualState>({ ...target });

  useFrame((_, delta) => {
    dampHologramVisualState(currentRef.current, target, 6.5, delta);
  });

  return (
    <>
      <ambientLight intensity={0.16} color="#12374a" />
      <CoreGeometry visual={currentRef.current} agent={input.agent} quality={quality} />
      <EnergyShell visual={currentRef.current} quality={quality} />
      <OrbitalRings visual={currentRef.current} quality={quality} agent={input.agent} />
      <ParticleField visual={currentRef.current} quality={quality} agent={input.agent} />
    </>
  );
}
