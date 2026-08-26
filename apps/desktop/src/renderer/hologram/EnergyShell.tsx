import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { HologramQualityProfile } from "./quality";
import type { HologramVisualState } from "./model";

export function EnergyShell({ visual, quality }: { visual: HologramVisualState; quality: HologramQualityProfile }) {
  const shellRef = useRef<THREE.Mesh>(null);
  const shellMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const outerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (shellRef.current) {
      shellRef.current.rotation.x -= delta * 0.14 * quality.motionScale;
      shellRef.current.rotation.z += delta * 0.11 * quality.motionScale;
      shellRef.current.scale.setScalar(visual.coreScale * (1.06 + visual.pulseStrength * 0.04));
    }
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.09 * quality.motionScale;
      outerRef.current.rotation.z -= delta * 0.06 * quality.motionScale;
      outerRef.current.scale.setScalar(visual.coreScale * (1.26 + visual.ringSpread * 0.025));
    }
    if (shellMaterialRef.current) shellMaterialRef.current.opacity = 0.08 + visual.coreBrightness * 0.1;
    if (outerMaterialRef.current) {
      outerMaterialRef.current.opacity = 0.035 + visual.warningIntensity * 0.035 + visual.coreBrightness * 0.025;
    }
  });

  return (
    <group>
      <mesh ref={shellRef}>
        <sphereGeometry args={[0.94, quality.mode === "FULL" ? 32 : 20, quality.mode === "FULL" ? 24 : 14]} />
        <meshBasicMaterial
          ref={shellMaterialRef}
          color="#3fd6ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[1.04, quality.geometryDetail]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color="#69dcff"
          wireframe
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
