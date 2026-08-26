import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AgentId } from "@jarvis/core";
import type { HologramQualityProfile } from "./quality";
import type { HologramVisualState } from "./model";

interface CoreGeometryProps {
  visual: HologramVisualState;
  agent: AgentId;
  quality: HologramQualityProfile;
}

interface DeformedGeometry {
  geometry: THREE.IcosahedronGeometry;
  basePositions: Float32Array;
}

export function CoreGeometry({ visual, agent, quality }: CoreGeometryProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const nucleusMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const deformed = useMemo<DeformedGeometry>(() => {
    const geometry = new THREE.IcosahedronGeometry(0.72, quality.geometryDetail);
    const basePositions = new Float32Array(geometry.attributes.position.array as Float32Array);
    return { geometry, basePositions };
  }, [quality.geometryDetail]);

  useEffect(() => () => deformed.geometry.dispose(), [deformed]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const position = deformed.geometry.attributes.position;
    const values = position.array as Float32Array;
    for (let index = 0; index < values.length; index += 3) {
      const x = deformed.basePositions[index];
      const y = deformed.basePositions[index + 1];
      const z = deformed.basePositions[index + 2];
      const wave =
        Math.sin(time * (1.1 + visual.scanSpeed * 0.35) + x * 4.7 + y * 3.1 + z * 2.3) *
        visual.meshDistortion *
        0.08;
      const radius = 1 + wave + visual.pulseStrength * 0.018 * Math.sin(time * 2 + index);
      values[index] = x * radius;
      values[index + 1] = y * radius;
      values[index + 2] = z * radius;
    }
    position.needsUpdate = true;
    deformed.geometry.computeVertexNormals();

    if (meshRef.current) {
      meshRef.current.rotation.x += delta * (0.12 + visual.meshRotation * 0.08) * quality.motionScale;
      meshRef.current.rotation.y -= delta * (0.18 + visual.meshRotation * 0.12) * quality.motionScale;
      meshRef.current.scale.setScalar(visual.coreScale);
    }
    if (wireRef.current) {
      wireRef.current.rotation.x = (meshRef.current?.rotation.x ?? 0) * -0.7;
      wireRef.current.rotation.y = (meshRef.current?.rotation.y ?? 0) * -0.8;
      wireRef.current.scale.setScalar(visual.coreScale * 1.035);
    }
    if (nucleusRef.current) {
      const pulse = 1 + visual.pulseStrength * (0.04 + 0.025 * Math.sin(time * 2.4));
      nucleusRef.current.scale.setScalar(visual.coreScale * pulse);
      nucleusRef.current.rotation.z += delta * 0.22 * quality.motionScale;
    }
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.35 + visual.coreBrightness * 1.6;
    if (nucleusMaterialRef.current) {
      nucleusMaterialRef.current.opacity = 0.62 + visual.coreBrightness * 0.34;
    }
    if (lightRef.current) lightRef.current.intensity = 0.25 + visual.coreBrightness * 1.2;
  });

  const coreColor = agent === "CODEX" ? "#c5e9ff" : "#83edff";
  return (
    <group>
      <mesh ref={meshRef} geometry={deformed.geometry} dispose={null}>
        <meshStandardMaterial
          ref={materialRef}
          color={coreColor}
          emissive="#0a9dcb"
          emissiveIntensity={0.85}
          metalness={0.4}
          roughness={0.28}
          transparent
          opacity={0.78}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={wireRef} geometry={deformed.geometry} dispose={null}>
        <meshBasicMaterial
          color="#b6f6ff"
          wireframe
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.27, 20, 20]} />
        <meshBasicMaterial
          ref={nucleusMaterialRef}
          color="#e8fdff"
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} color="#42d9ff" distance={4.2} decay={2} intensity={0.9} />
    </group>
  );
}
