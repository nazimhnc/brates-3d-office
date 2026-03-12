// ══════════════════════════════════════════════════════════════════════════════
// HumanAvatar — Procedural 3D avatar with distinct per-agent geometry.
//
// Uses basic Three.js geometry (spheres, capsules, boxes) to create visually
// distinct characters. Each agent differs in: body proportions, hair style
// geometry, facial hair, glasses, colors, and height.
//
// Replaces the previous GLB-based system which suffered from:
//   - Broken skeleton cloning (females invisible)
//   - Identical faces/hats on all males (same GLB)
//   - No geometric diversity (only material color swaps)
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { AvatarAnimation } from "./AvatarAnimations";

export type { AvatarAnimation } from "./AvatarAnimations";

// ── Appearance interface ─────────────────────────────────────────────────────

export interface HumanAvatarAppearance {
  skinTone: string;
  hairColor: string;
  hairStyle: "short" | "medium" | "long" | "bun" | "buzz" | "ponytail" | "curly";
  eyeColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  height: number;
  bodyType: "male" | "female";
  glasses: boolean;
  beardStyle: "none" | "stubble" | "short" | "full";
}

export const DEFAULT_HUMAN_APPEARANCE: HumanAvatarAppearance = {
  skinTone: "#e8b89a",
  hairColor: "#3a2520",
  hairStyle: "short",
  eyeColor: "#4a6741",
  shirtColor: "#2c3e6b",
  pantsColor: "#34404f",
  shoeColor: "#1a1a2e",
  height: 1.0,
  bodyType: "male",
  glasses: false,
  beardStyle: "none",
};

// ── Props ────────────────────────────────────────────────────────────────────

export interface HumanAvatarProps {
  appearance: HumanAvatarAppearance;
  position: [number, number, number];
  rotation?: number;
  animation: AvatarAnimation;
  selected?: boolean;
  onClick?: () => void;
  name?: string;
  role?: string;
}

// ── Shared geometries (created once, reused across all avatar instances) ─────

const HEAD_GEO = new THREE.SphereGeometry(0.12, 20, 16);
const EYE_GEO = new THREE.SphereGeometry(0.017, 8, 8);
const PUPIL_GEO = new THREE.SphereGeometry(0.01, 6, 6);
const NOSE_GEO = new THREE.SphereGeometry(0.018, 8, 6);
const NECK_GEO = new THREE.CylinderGeometry(0.045, 0.055, 0.06, 10);
const SHOE_GEO = new THREE.BoxGeometry(0.09, 0.05, 0.14);
const RING_GEO = new THREE.RingGeometry(0.32, 0.38, 28);
const SELECT_RING_GEO = new THREE.RingGeometry(0.42, 0.52, 28);
const LENS_GEO = new THREE.TorusGeometry(0.024, 0.003, 8, 16);
const BRIDGE_GEO = new THREE.BoxGeometry(0.022, 0.003, 0.003);
const TEMPLE_GEO = new THREE.BoxGeometry(0.003, 0.003, 0.08);

// Glasses material (shared, dark metal)
const GLASSES_MAT = new THREE.MeshStandardMaterial({
  color: "#2a2a2a",
  roughness: 0.3,
  metalness: 0.6,
});

// ── Hair geometry per style ──────────────────────────────────────────────────

function HairMesh({ style, color, headY }: { style: string; color: string; headY: number }) {
  switch (style) {
    case "buzz":
      return (
        <mesh position={[0, headY + 0.005, 0]} castShadow>
          <sphereGeometry args={[0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      );

    case "short":
      return (
        <group>
          <mesh position={[0, headY + 0.03, -0.01]} castShadow>
            <sphereGeometry args={[0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.50]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case "medium":
      return (
        <group>
          {/* Top volume */}
          <mesh position={[0, headY + 0.025, -0.015]} castShadow>
            <sphereGeometry args={[0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Side volume — left */}
          <mesh position={[-0.11, headY - 0.04, -0.01]} castShadow>
            <capsuleGeometry args={[0.028, 0.07, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Side volume — right */}
          <mesh position={[0.11, headY - 0.04, -0.01]} castShadow>
            <capsuleGeometry args={[0.028, 0.07, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case "long":
      return (
        <group>
          {/* Top cap */}
          <mesh position={[0, headY + 0.025, -0.02]} castShadow>
            <sphereGeometry args={[0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
          {/* Back flow */}
          <mesh position={[0, headY - 0.20, -0.09]} castShadow>
            <boxGeometry args={[0.20, 0.30, 0.05]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Side curtain — left */}
          <mesh position={[-0.10, headY - 0.10, 0.02]} castShadow>
            <boxGeometry args={[0.035, 0.20, 0.05]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Side curtain — right */}
          <mesh position={[0.10, headY - 0.10, 0.02]} castShadow>
            <boxGeometry args={[0.035, 0.20, 0.05]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case "bun":
      return (
        <group>
          {/* Base cap */}
          <mesh position={[0, headY + 0.015, 0]} castShadow>
            <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
          {/* Bun sphere */}
          <mesh position={[0, headY + 0.10, -0.08]} castShadow>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        </group>
      );

    case "ponytail":
      return (
        <group>
          {/* Base cap */}
          <mesh position={[0, headY + 0.015, 0]} castShadow>
            <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.50]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
          {/* Ponytail */}
          <mesh position={[0, headY - 0.06, -0.13]} rotation={[0.5, 0, 0]} castShadow>
            <capsuleGeometry args={[0.028, 0.18, 6, 8]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        </group>
      );

    case "curly":
      return (
        <group>
          {/* Main volume — big and full */}
          <mesh position={[0, headY + 0.045, -0.01]} castShadow>
            <sphereGeometry args={[0.155, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Texture bumps for curly look */}
          <mesh position={[-0.10, headY + 0.06, 0.04]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh position={[0.10, headY + 0.06, 0.04]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh position={[0, headY + 0.12, -0.01]} castShadow>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh position={[-0.07, headY + 0.02, -0.06]} castShadow>
            <sphereGeometry args={[0.032, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh position={[0.07, headY + 0.02, -0.06]} castShadow>
            <sphereGeometry args={[0.032, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

// ── Beard geometry per style ─────────────────────────────────────────────────

function BeardMesh({ style, color, headY }: { style: string; color: string; headY: number }) {
  if (style === "none") return null;

  const chinY = headY - 0.08;

  switch (style) {
    case "stubble":
      return (
        <mesh position={[0, chinY, 0.08]} castShadow>
          <boxGeometry args={[0.09, 0.04, 0.03]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      );

    case "short":
      return (
        <group>
          {/* Chin beard */}
          <mesh position={[0, chinY - 0.01, 0.07]} castShadow>
            <boxGeometry args={[0.10, 0.06, 0.035]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Mustache */}
          <mesh position={[0, headY - 0.04, 0.115]} castShadow>
            <boxGeometry args={[0.06, 0.015, 0.01]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      );

    case "full":
      return (
        <group>
          {/* Full chin coverage */}
          <mesh position={[0, chinY - 0.025, 0.06]} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.045]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          {/* Mustache */}
          <mesh position={[0, headY - 0.04, 0.115]} castShadow>
            <boxGeometry args={[0.07, 0.018, 0.012]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          {/* Sideburns — left */}
          <mesh position={[-0.095, headY - 0.04, 0.04]} castShadow>
            <boxGeometry args={[0.022, 0.07, 0.03]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          {/* Sideburns — right */}
          <mesh position={[0.095, headY - 0.04, 0.04]} castShadow>
            <boxGeometry args={[0.022, 0.07, 0.03]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

// ── Glasses overlay ──────────────────────────────────────────────────────────

function GlassesMesh({ headY }: { headY: number }) {
  return (
    <group position={[0, headY + 0.015, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[-0.038, 0, 0]} geometry={LENS_GEO} material={GLASSES_MAT} />
      <mesh position={[0.038, 0, 0]} geometry={LENS_GEO} material={GLASSES_MAT} />
      <mesh geometry={BRIDGE_GEO} material={GLASSES_MAT} />
      {/* Temples (arms extending back) */}
      <mesh position={[-0.06, 0, -0.04]} geometry={TEMPLE_GEO} material={GLASSES_MAT} />
      <mesh position={[0.06, 0, -0.04]} geometry={TEMPLE_GEO} material={GLASSES_MAT} />
    </group>
  );
}

// ── ProceduralBody — the actual character mesh ───────────────────────────────

function ProceduralBody({ appearance }: { appearance: HumanAvatarAppearance }) {
  const isFemale = appearance.bodyType === "female";

  // Body proportion constants
  const headY = 1.50;
  const torsoY = 1.05;
  const torsoRadius = isFemale ? 0.13 : 0.155;
  const torsoLength = 0.30;
  const shoulderSX = isFemale ? 0.95 : 1.12;
  const hipSX = isFemale ? 1.15 : 0.95;
  const armOffsetX = torsoRadius * shoulderSX + 0.042;
  const legSpacing = isFemale ? 0.06 : 0.07;
  const legRadius = isFemale ? 0.05 : 0.055;

  return (
    <group>
      {/* ── Head ── */}
      <mesh
        position={[0, headY, 0]}
        geometry={HEAD_GEO}
        castShadow
        scale={[1, 1.08, 0.95]}
      >
        <meshStandardMaterial color={appearance.skinTone} roughness={0.7} metalness={0.02} />
      </mesh>

      {/* ── Eyes ── */}
      <mesh position={[-0.04, headY + 0.015, 0.10]} geometry={EYE_GEO}>
        <meshStandardMaterial color="#f8f8f8" roughness={0.3} />
      </mesh>
      <mesh position={[0.04, headY + 0.015, 0.10]} geometry={EYE_GEO}>
        <meshStandardMaterial color="#f8f8f8" roughness={0.3} />
      </mesh>
      <mesh position={[-0.04, headY + 0.015, 0.114]} geometry={PUPIL_GEO}>
        <meshStandardMaterial color={appearance.eyeColor} roughness={0.3} />
      </mesh>
      <mesh position={[0.04, headY + 0.015, 0.114]} geometry={PUPIL_GEO}>
        <meshStandardMaterial color={appearance.eyeColor} roughness={0.3} />
      </mesh>

      {/* ── Nose ── */}
      <mesh position={[0, headY - 0.015, 0.115]} geometry={NOSE_GEO} castShadow>
        <meshStandardMaterial color={appearance.skinTone} roughness={0.7} metalness={0.02} />
      </mesh>

      {/* ── Neck ── */}
      <mesh position={[0, 1.37, 0]} geometry={NECK_GEO} castShadow>
        <meshStandardMaterial color={appearance.skinTone} roughness={0.7} metalness={0.02} />
      </mesh>

      {/* ── Torso ── */}
      <mesh position={[0, torsoY, 0]} castShadow scale={[shoulderSX, 1, 1]}>
        <capsuleGeometry args={[torsoRadius, torsoLength, 8, 12]} />
        <meshStandardMaterial color={appearance.shirtColor} roughness={0.85} />
      </mesh>

      {/* ── Hip area ── */}
      <mesh position={[0, 0.74, 0]} castShadow scale={[hipSX, 1, 1]}>
        <capsuleGeometry args={[torsoRadius * 0.85, 0.05, 6, 10]} />
        <meshStandardMaterial color={appearance.pantsColor} roughness={0.85} />
      </mesh>

      {/* ── Left arm ── */}
      <group position={[-armOffsetX, 1.18, 0]} rotation={[0, 0, 0.12]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.035, 0.20, 6, 8]} />
          <meshStandardMaterial color={appearance.shirtColor} roughness={0.85} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={appearance.skinTone} roughness={0.7} />
        </mesh>
      </group>

      {/* ── Right arm ── */}
      <group position={[armOffsetX, 1.18, 0]} rotation={[0, 0, -0.12]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.035, 0.20, 6, 8]} />
          <meshStandardMaterial color={appearance.shirtColor} roughness={0.85} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={appearance.skinTone} roughness={0.7} />
        </mesh>
      </group>

      {/* ── Left leg ── */}
      <mesh position={[-legSpacing, 0.42, 0]} castShadow>
        <capsuleGeometry args={[legRadius, 0.30, 6, 8]} />
        <meshStandardMaterial color={appearance.pantsColor} roughness={0.85} />
      </mesh>

      {/* ── Right leg ── */}
      <mesh position={[legSpacing, 0.42, 0]} castShadow>
        <capsuleGeometry args={[legRadius, 0.30, 6, 8]} />
        <meshStandardMaterial color={appearance.pantsColor} roughness={0.85} />
      </mesh>

      {/* ── Left shoe ── */}
      <mesh position={[-legSpacing, 0.04, 0.015]} geometry={SHOE_GEO} castShadow>
        <meshStandardMaterial color={appearance.shoeColor} roughness={0.5} metalness={0.08} />
      </mesh>

      {/* ── Right shoe ── */}
      <mesh position={[legSpacing, 0.04, 0.015]} geometry={SHOE_GEO} castShadow>
        <meshStandardMaterial color={appearance.shoeColor} roughness={0.5} metalness={0.08} />
      </mesh>

      {/* ── Hair ── */}
      <HairMesh style={appearance.hairStyle} color={appearance.hairColor} headY={headY} />

      {/* ── Beard ── */}
      <BeardMesh style={appearance.beardStyle} color={appearance.hairColor} headY={headY} />

      {/* ── Glasses ── */}
      {appearance.glasses && <GlassesMesh headY={headY} />}
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function HumanAvatar({
  appearance,
  position,
  rotation = 0,
  animation,
  selected = false,
  onClick,
  name,
  role,
}: HumanAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const time = useRef(0);

  const heightScale = appearance.height;
  const totalHeight = 1.68;

  // Hover scale animation
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const ts = hovered ? 1.02 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(ts * heightScale, ts * heightScale, ts * heightScale),
      dt * 8,
    );
  });

  // Body idle / walk / sit animation
  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const body = bodyRef.current;
    if (!body) return;

    const isSeated = animation === "sit" || animation === "type";
    const SEATED_DROP = -0.225;

    if (animation === "idle") {
      const breath = 1 + Math.sin(t * 1.6) * 0.005;
      body.scale.set(breath, breath, breath);
      body.position.y = Math.sin(t * 1.6) * 0.004;
      body.position.x = Math.sin(t * 0.35) * 0.006;
      body.rotation.y = Math.sin(t * 0.4) * 0.02;
    } else if (animation === "walk") {
      body.scale.set(1, 1, 1);
      body.position.y = Math.abs(Math.sin(t * 4.5)) * 0.02;
      body.position.x = Math.sin(t * 2.25) * 0.01;
      body.rotation.y = Math.sin(t * 4.5) * 0.04;
    } else if (isSeated) {
      const breath = 1 + Math.sin(t * 1.4) * 0.003;
      body.scale.set(breath, breath, breath);
      body.position.y = SEATED_DROP;
      if (animation === "type") {
        body.position.y += Math.sin(t * 1.8) * 0.002;
        body.position.x = Math.sin(t * 0.5) * 0.002;
      }
      body.rotation.x = -0.05;
      body.rotation.y = 0;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      scale={[heightScale, heightScale, heightScale]}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerOver={
        onClick
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        onClick
          ? () => {
              setHovered(false);
              document.body.style.cursor = "auto";
            }
          : undefined
      }
    >
      {/* Ground ring */}
      <mesh geometry={RING_GEO} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshStandardMaterial
          color="#7c5cbf"
          emissive="#7c5cbf"
          emissiveIntensity={1.2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh geometry={SELECT_RING_GEO} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <meshStandardMaterial
            color="#c8b0ff"
            emissive="#c8b0ff"
            emissiveIntensity={2.5}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Character body */}
      <group ref={bodyRef}>
        <ProceduralBody appearance={appearance} />
      </group>

      {/* Name tag */}
      {name && (
        <Billboard position={[0, totalHeight * heightScale + 0.18, 0]}>
          <mesh>
            <planeGeometry args={[0.92, 0.24]} />
            <meshBasicMaterial color="white" transparent opacity={0.88} />
          </mesh>
          <Text
            position={[0, 0.025, 0.01]}
            fontSize={0.085}
            color="#2a2040"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            {name}
          </Text>
          {role && (
            <Text
              position={[0, -0.055, 0.01]}
              fontSize={0.052}
              color="#7068a0"
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {role}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  );
}

export default HumanAvatar;
