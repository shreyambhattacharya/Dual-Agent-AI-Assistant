import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AgentId } from "@jarvis/core";
import type { HologramQualityProfile } from "./quality";
import type { HologramVisualState } from "./model";

interface ParticleData {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  radius: Float32Array;
  angle: Float32Array;
  speed: Float32Array;
  phase: Float32Array;
  height: Float32Array;
}

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function createParticleData(count: number): ParticleData {
  const positions = new Float32Array(count * 3);
  const radius = new Float32Array(count);
  const angle = new Float32Array(count);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);
  const height = new Float32Array(count);
  let seed = 0x1a2b3c4d;
  for (let index = 0; index < count; index += 1) {
    seed = nextSeed(seed);
    const radial = 1.4 + (seed / 0xffffffff) * 1.25;
    seed = nextSeed(seed);
    const theta = (seed / 0xffffffff) * Math.PI * 2;
    seed = nextSeed(seed);
    radius[index] = radial;
    angle[index] = theta;
    speed[index] = 0.12 + (seed / 0xffffffff) * 0.32;
    seed = nextSeed(seed);
    phase[index] = (seed / 0xffffffff) * Math.PI * 2;
    seed = nextSeed(seed);
    height[index] = ((seed / 0xffffffff) - 0.5) * 1.45;
    positions[index * 3] = Math.cos(theta) * radial;
    positions[index * 3 + 1] = height[index];
    positions[index * 3 + 2] = Math.sin(theta) * radial;
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  return { geometry, positions, radius, angle, speed, phase, height };
}

export function ParticleField({
  visual,
  quality,
  agent,
}: {
  visual: HologramVisualState;
  quality: HologramQualityProfile;
  agent: AgentId;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const data = useMemo(() => createParticleData(quality.particleCount), [quality.particleCount]);

  useEffect(() => () => data.geometry.dispose(), [data]);

  useFrame(({ clock }, delta) => {
    const positions = data.positions;
    const time = clock.elapsedTime;
    const convergence = visual.particleConvergence;
    const expansion = 1 - convergence * 0.58;
    const activity = 0.18 + visual.particleActivity * 0.92;
    const instability = 1 - visual.stability;
    for (let index = 0; index < data.radius.length; index += 1) {
      const angle = data.angle[index] + time * data.speed[index] * activity * quality.motionScale;
      const radius = data.radius[index] * visual.particleRadius * 0.52 * expansion;
      const wave = Math.sin(time * (0.7 + data.speed[index]) + data.phase[index]) * 0.06;
      const jitter = instability * Math.sin(time * 3.5 + data.phase[index]) * 0.12;
      const y = data.height[index] * (0.65 + visual.particleActivity * 0.3) + wave + jitter;
      const codexAxis = agent === "CODEX" ? 0.78 : 1;
      positions[index * 3] = Math.cos(angle) * (radius + jitter) * codexAxis;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(angle) * (radius + jitter);
    }
    const positionAttribute = data.geometry.attributes.position;
    positionAttribute.needsUpdate = true;
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.025 * quality.motionScale;
    if (materialRef.current) {
      materialRef.current.opacity = 0.08 + visual.particleActivity * 0.42;
      materialRef.current.size = 0.012 + visual.particleActivity * 0.012;
    }
  });

  return (
    <points ref={pointsRef} geometry={data.geometry} frustumCulled={false} dispose={null}>
      <pointsMaterial
        ref={materialRef}
        color={agent === "CODEX" ? "#d3efff" : "#72e5ff"}
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.24}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
