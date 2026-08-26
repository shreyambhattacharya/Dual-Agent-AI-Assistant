import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AgentId } from "@jarvis/core";
import type { HologramQualityProfile } from "./quality";
import type { HologramVisualState } from "./model";

interface RingConfig {
  radius: number;
  thickness: number;
  tilt: [number, number, number];
  axis: [number, number, number];
  speed: "inner" | "middle" | "outer";
  segments: Array<[number, number]>;
  nodeAngle: number;
}

const RING_CONFIGS: RingConfig[] = [
  {
    radius: 1.02,
    thickness: 0.018,
    tilt: [0.42, 0.1, 0.16],
    axis: [0.4, 1, 0.1],
    speed: "inner",
    segments: [[0.1, 1.5], [2.2, 1.1], [4.25, 1.35]],
    nodeAngle: 5.1,
  },
  {
    radius: 1.34,
    thickness: 0.012,
    tilt: [1.08, -0.28, 0.45],
    axis: [1, 0.2, 0.45],
    speed: "middle",
    segments: [[0.35, 1.05], [1.95, 1.65], [4.15, 0.9], [5.45, 0.48]],
    nodeAngle: 2.7,
  },
  {
    radius: 1.66,
    thickness: 0.009,
    tilt: [-0.22, 0.82, 0.76],
    axis: [0.25, 0.65, 1],
    speed: "outer",
    segments: [[0, 0.78], [1.35, 1.35], [3.22, 1.1], [5.02, 0.92]],
    nodeAngle: 1.25,
  },
];

function speedFor(config: RingConfig, visual: HologramVisualState): number {
  if (config.speed === "inner") return visual.innerRingSpeed;
  if (config.speed === "middle") return visual.middleRingSpeed;
  return visual.outerRingSpeed;
}

function RingLayer({
  config,
  index,
  visual,
  quality,
  agent,
}: {
  config: RingConfig;
  index: number;
  visual: HologramVisualState;
  quality: HologramQualityProfile;
  agent: AgentId;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const nodeRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (group) {
      const speed = speedFor(config, visual) * quality.motionScale;
      group.rotation.x += config.axis[0] * speed * delta;
      group.rotation.y += config.axis[1] * speed * delta;
      group.rotation.z += config.axis[2] * speed * delta;
      group.scale.setScalar(visual.ringSpread);
    }
    for (let materialIndex = 0; materialIndex < materialsRef.current.length; materialIndex += 1) {
      const material = materialsRef.current[materialIndex];
      if (material) material.opacity = visual.ringOpacity * (0.52 + index * 0.1);
    }
    if (nodeRef.current) {
      nodeRef.current.scale.setScalar(0.8 + visual.pulseStrength * 0.45);
      nodeRef.current.rotation.y += delta * (0.6 + visual.outerRingSpeed) * quality.motionScale;
    }
  });

  const color = agent === "CODEX" ? "#c8eeff" : "#63ddff";
  return (
    <group ref={groupRef} rotation={config.tilt}>
      {config.segments.map(([start, length], segmentIndex) => (
        <mesh key={`${index}-${segmentIndex}`}>
          <ringGeometry args={[config.radius - config.thickness, config.radius, 64, 1, start, length]} />
          <meshBasicMaterial
            ref={(material) => {
              materialsRef.current[segmentIndex] = material;
            }}
            color={color}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh
        ref={nodeRef}
        position={[Math.cos(config.nodeAngle) * config.radius, Math.sin(config.nodeAngle) * config.radius, 0]}
      >
        <sphereGeometry args={[0.035 + index * 0.008, 12, 8]} />
        <meshBasicMaterial
          color="#d8fbff"
          transparent
          opacity={0.86}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function OrbitalRings({
  visual,
  quality,
  agent,
}: {
  visual: HologramVisualState;
  quality: HologramQualityProfile;
  agent: AgentId;
}) {
  return (
    <group>
      {RING_CONFIGS.map((config, index) => (
        <RingLayer key={config.radius} config={config} index={index} visual={visual} quality={quality} agent={agent} />
      ))}
    </group>
  );
}
