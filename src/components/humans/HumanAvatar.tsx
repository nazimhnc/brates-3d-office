// ══════════════════════════════════════════════════════════════════════════════
// HumanAvatar — Procedural Sims-style character system.
//
// Builds each character from Three.js geometry with real facial features:
// eyes (sclera + iris + pupil), eyebrows, nose, mouth/lips, ears, styled hair,
// proper body proportions, male/female body types, and full color customization.
//
// Performance: ~2500 triangles per character, shared geometries, ~8 materials
// per agent. Zero external assets — instant load, no network dependency.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { AvatarAnimation } from "./AvatarAnimations";
import type { AgentAppearance, FaceShape } from "../../types";

export type { AvatarAnimation } from "./AvatarAnimations";

// ══════════════════════════════════════════════════════════════════════════════
// SHARED GEOMETRIES — created once at module level, reused by all characters.
// Low segment counts for performance on weak hardware.
// ══════════════════════════════════════════════════════════════════════════════

// Head
const HEAD_GEO = new THREE.SphereGeometry(0.12, 16, 12);

// Eyes
const SCLERA_GEO = new THREE.SphereGeometry(0.025, 8, 6);
const IRIS_GEO = new THREE.SphereGeometry(0.014, 8, 6);
const PUPIL_GEO = new THREE.SphereGeometry(0.006, 6, 4);

// Eyebrows
const EYEBROW_GEO = new THREE.BoxGeometry(0.038, 0.007, 0.01);

// Nose
const NOSE_GEO = new THREE.SphereGeometry(0.016, 6, 4);

// Mouth
const UPPER_LIP_GEO = new THREE.SphereGeometry(0.012, 6, 4);
const LOWER_LIP_GEO = new THREE.SphereGeometry(0.011, 6, 4);
const MOUTH_LINE_GEO = new THREE.BoxGeometry(0.032, 0.003, 0.003);

// Ears
const EAR_GEO = new THREE.SphereGeometry(0.02, 6, 4);

// Neck
const NECK_GEO = new THREE.CylinderGeometry(0.036, 0.042, 0.08, 8);

// Torso
const TORSO_GEO = new THREE.CapsuleGeometry(0.13, 0.28, 4, 12);

// Shoulders
const SHOULDER_GEO = new THREE.SphereGeometry(0.042, 8, 6);

// Arms
const UPPER_ARM_GEO = new THREE.CapsuleGeometry(0.032, 0.14, 3, 8);
const LOWER_ARM_GEO = new THREE.CapsuleGeometry(0.026, 0.13, 3, 8);
const HAND_GEO = new THREE.SphereGeometry(0.024, 6, 4);

// Legs
const UPPER_LEG_GEO = new THREE.CapsuleGeometry(0.05, 0.18, 3, 8);
const LOWER_LEG_GEO = new THREE.CapsuleGeometry(0.036, 0.20, 3, 8);
const FOOT_GEO = new THREE.BoxGeometry(0.06, 0.04, 0.10);

// Hair geometries (different per style)
const HAIR_BUZZ_GEO = new THREE.SphereGeometry(0.124, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
const HAIR_SHORT_GEO = new THREE.SphereGeometry(0.132, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
const HAIR_MEDIUM_GEO = new THREE.SphereGeometry(0.138, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
const HAIR_LONG_CAP_GEO = new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
const HAIR_LONG_SIDE_GEO = new THREE.BoxGeometry(0.05, 0.28, 0.06);
const HAIR_LONG_BACK_GEO = new THREE.BoxGeometry(0.16, 0.22, 0.05);
const HAIR_CURLY_GEO = new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
const HAIR_BUN_BALL_GEO = new THREE.SphereGeometry(0.048, 8, 6);
const HAIR_PONY_TAIL_GEO = new THREE.CapsuleGeometry(0.022, 0.14, 3, 6);

// Glasses
const GLASSES_FRAME_GEO = new THREE.TorusGeometry(0.023, 0.003, 6, 12);
const GLASSES_BRIDGE_GEO = new THREE.BoxGeometry(0.015, 0.004, 0.006);
const GLASSES_ARM_GEO = new THREE.BoxGeometry(0.003, 0.003, 0.08);

// Beard
const BEARD_GEO = new THREE.SphereGeometry(0.06, 8, 6);

// Selection rings
const RING_GEO = new THREE.RingGeometry(0.32, 0.38, 28);
const SELECT_RING_GEO = new THREE.RingGeometry(0.42, 0.52, 28);

// ══════════════════════════════════════════════════════════════════════════════
// SHARED MATERIALS — constant across all characters
// ══════════════════════════════════════════════════════════════════════════════

const SCLERA_MAT = new THREE.MeshStandardMaterial({
  color: "#f5f5f5",
  roughness: 0.3,
  metalness: 0.05,
});
const PUPIL_MAT = new THREE.MeshBasicMaterial({ color: "#080808" });
const MOUTH_LINE_MAT = new THREE.MeshBasicMaterial({ color: "#3a1a1a" });
const GLASSES_MAT = new THREE.MeshStandardMaterial({
  color: "#2a2a2a",
  roughness: 0.4,
  metalness: 0.3,
});

// ══════════════════════════════════════════════════════════════════════════════
// FACE ARCHETYPE CONFIGURATIONS
// Each archetype modifies head proportions and feature placement.
// ══════════════════════════════════════════════════════════════════════════════

interface FaceConfig {
  headScale: [number, number, number];
  eyeY: number;
  eyeSpacing: number;
  eyeScale: number;
  noseY: number;
  noseScale: number;
  mouthY: number;
  mouthWidth: number;
}

const FACE_CONFIGS: Record<FaceShape, FaceConfig> = {
  round: {
    headScale: [1.06, 0.97, 1.03],
    eyeY: 0.015,
    eyeSpacing: 0.055,
    eyeScale: 1.0,
    noseY: -0.025,
    noseScale: 1.0,
    mouthY: -0.065,
    mouthWidth: 1.0,
  },
  angular: {
    headScale: [0.94, 1.05, 0.96],
    eyeY: 0.02,
    eyeSpacing: 0.05,
    eyeScale: 0.95,
    noseY: -0.02,
    noseScale: 1.1,
    mouthY: -0.07,
    mouthWidth: 0.9,
  },
  heart: {
    headScale: [1.03, 1.0, 0.98],
    eyeY: 0.02,
    eyeSpacing: 0.053,
    eyeScale: 1.05,
    noseY: -0.022,
    noseScale: 0.92,
    mouthY: -0.068,
    mouthWidth: 0.88,
  },
  square: {
    headScale: [1.04, 0.96, 1.02],
    eyeY: 0.018,
    eyeSpacing: 0.056,
    eyeScale: 0.98,
    noseY: -0.026,
    noseScale: 1.05,
    mouthY: -0.062,
    mouthWidth: 1.05,
  },
  oval: {
    headScale: [0.98, 1.03, 0.97],
    eyeY: 0.02,
    eyeSpacing: 0.052,
    eyeScale: 1.0,
    noseY: -0.024,
    noseScale: 0.97,
    mouthY: -0.068,
    mouthWidth: 0.95,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// BODY PROPORTIONS by gender
// ══════════════════════════════════════════════════════════════════════════════

interface BodyConfig {
  torsoScaleX: number;
  torsoScaleZ: number;
  shoulderX: number;
  hipScaleX: number;
  armScale: number;
  legScale: number;
}

const BODY_CONFIGS: Record<"male" | "female", BodyConfig> = {
  male: {
    torsoScaleX: 1.1,
    torsoScaleZ: 0.9,
    shoulderX: 0.17,
    hipScaleX: 0.9,
    armScale: 1.0,
    legScale: 1.0,
  },
  female: {
    torsoScaleX: 0.92,
    torsoScaleZ: 0.85,
    shoulderX: 0.15,
    hipScaleX: 1.08,
    armScale: 0.9,
    legScale: 0.95,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// VERTICAL POSITIONS — character with feet at Y=0, ~1.65 units tall
// Slightly cartoonish proportions (bigger head) for Sims-like feel.
// ══════════════════════════════════════════════════════════════════════════════

const POS = {
  foot: 0.02,
  lowerLeg: 0.19,
  upperLeg: 0.48,
  hip: 0.64,
  torso: 0.93,
  shoulder: 1.18,
  upperArm: 1.01,
  lowerArm: 0.76,
  hand: 0.63,
  neck: 1.26,
  head: 1.40,
  legX: 0.065,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function lipColorFromSkin(skinHex: string): string {
  const skin = new THREE.Color(skinHex);
  const pink = new THREE.Color("#c06070");
  return "#" + skin.clone().lerp(pink, 0.3).getHexString();
}

// ══════════════════════════════════════════════════════════════════════════════
// HAIR STYLES — each returns geometry positioned relative to head center
// ══════════════════════════════════════════════════════════════════════════════

function HairBuzz({ mat }: { mat: THREE.Material }) {
  return <mesh geometry={HAIR_BUZZ_GEO} material={mat} position={[0, 0.04, 0]} />;
}

function HairShort({ mat }: { mat: THREE.Material }) {
  return <mesh geometry={HAIR_SHORT_GEO} material={mat} position={[0, 0.035, 0]} />;
}

function HairMedium({ mat }: { mat: THREE.Material }) {
  return <mesh geometry={HAIR_MEDIUM_GEO} material={mat} position={[0, 0.025, 0]} />;
}

function HairLong({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh geometry={HAIR_LONG_CAP_GEO} material={mat} position={[0, 0.03, 0]} />
      <mesh geometry={HAIR_LONG_SIDE_GEO} material={mat} position={[-0.11, -0.1, 0]} />
      <mesh geometry={HAIR_LONG_SIDE_GEO} material={mat} position={[0.11, -0.1, 0]} />
      <mesh geometry={HAIR_LONG_BACK_GEO} material={mat} position={[0, -0.08, 0.07]} />
    </group>
  );
}

function HairCurly({ mat }: { mat: THREE.Material }) {
  return <mesh geometry={HAIR_CURLY_GEO} material={mat} position={[0, 0.02, 0.01]} />;
}

function HairBun({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh geometry={HAIR_SHORT_GEO} material={mat} position={[0, 0.035, 0]} />
      <mesh geometry={HAIR_BUN_BALL_GEO} material={mat} position={[0, 0.06, 0.09]} />
    </group>
  );
}

function HairPonytail({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh geometry={HAIR_SHORT_GEO} material={mat} position={[0, 0.035, 0]} />
      <mesh
        geometry={HAIR_PONY_TAIL_GEO}
        material={mat}
        position={[0, -0.04, 0.1]}
        rotation={[0.4, 0, 0]}
      />
    </group>
  );
}

const HAIR_COMPONENTS: Record<string, typeof HairBuzz> = {
  buzz: HairBuzz,
  short: HairShort,
  medium: HairMedium,
  long: HairLong,
  curly: HairCurly,
  bun: HairBun,
  ponytail: HairPonytail,
};

// ══════════════════════════════════════════════════════════════════════════════
// CHARACTER EYE — sclera + iris + pupil
// ══════════════════════════════════════════════════════════════════════════════

function CharacterEye({
  position,
  irisMat,
  scale = 1,
}: {
  position: [number, number, number];
  irisMat: THREE.Material;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh geometry={SCLERA_GEO} material={SCLERA_MAT} />
      <mesh geometry={IRIS_GEO} material={irisMat} position={[0, 0, -0.014]} />
      <mesh geometry={PUPIL_GEO} material={PUPIL_MAT} position={[0, 0, -0.021]} />
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHARACTER FACE — all facial features assembled relative to head center
// ══════════════════════════════════════════════════════════════════════════════

function CharacterFace({
  face,
  skinMat,
  hairMat,
  irisMat,
  lipMat,
  glasses,
  beardStyle,
}: {
  face: FaceConfig;
  skinMat: THREE.Material;
  hairMat: THREE.Material;
  irisMat: THREE.Material;
  lipMat: THREE.Material;
  glasses: boolean;
  beardStyle: string;
}) {
  const faceZ = -0.095; // depth into the head sphere for face features

  return (
    <group>
      {/* Left eye */}
      <CharacterEye
        position={[-face.eyeSpacing, face.eyeY, faceZ]}
        irisMat={irisMat}
        scale={face.eyeScale}
      />
      {/* Right eye */}
      <CharacterEye
        position={[face.eyeSpacing, face.eyeY, faceZ]}
        irisMat={irisMat}
        scale={face.eyeScale}
      />

      {/* Left eyebrow */}
      <mesh
        geometry={EYEBROW_GEO}
        material={hairMat}
        position={[-face.eyeSpacing, face.eyeY + 0.032, faceZ + 0.005]}
        rotation={[0, 0, 0.08]}
      />
      {/* Right eyebrow */}
      <mesh
        geometry={EYEBROW_GEO}
        material={hairMat}
        position={[face.eyeSpacing, face.eyeY + 0.032, faceZ + 0.005]}
        rotation={[0, 0, -0.08]}
      />

      {/* Nose */}
      <mesh
        geometry={NOSE_GEO}
        material={skinMat}
        position={[0, face.noseY, -0.11]}
        scale={[face.noseScale, face.noseScale * 1.2, face.noseScale * 1.3]}
      />

      {/* Mouth line */}
      <mesh
        geometry={MOUTH_LINE_GEO}
        material={MOUTH_LINE_MAT}
        position={[0, face.mouthY, -0.107]}
        scale={[face.mouthWidth, 1, 1]}
      />
      {/* Upper lip */}
      <mesh
        geometry={UPPER_LIP_GEO}
        material={lipMat}
        position={[0, face.mouthY + 0.006, -0.105]}
        scale={[face.mouthWidth * 1.4, 0.5, 0.6]}
      />
      {/* Lower lip */}
      <mesh
        geometry={LOWER_LIP_GEO}
        material={lipMat}
        position={[0, face.mouthY - 0.006, -0.103]}
        scale={[face.mouthWidth * 1.3, 0.55, 0.6]}
      />

      {/* Left ear */}
      <mesh
        geometry={EAR_GEO}
        material={skinMat}
        position={[-0.12, 0.0, 0]}
        scale={[0.6, 1.0, 0.7]}
      />
      {/* Right ear */}
      <mesh
        geometry={EAR_GEO}
        material={skinMat}
        position={[0.12, 0.0, 0]}
        scale={[0.6, 1.0, 0.7]}
      />

      {/* Glasses (optional) */}
      {glasses && (
        <group position={[0, face.eyeY, faceZ - 0.012]}>
          <mesh
            geometry={GLASSES_FRAME_GEO}
            material={GLASSES_MAT}
            position={[-face.eyeSpacing, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={GLASSES_FRAME_GEO}
            material={GLASSES_MAT}
            position={[face.eyeSpacing, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={GLASSES_BRIDGE_GEO}
            material={GLASSES_MAT}
            position={[0, 0.002, 0.003]}
          />
          <mesh
            geometry={GLASSES_ARM_GEO}
            material={GLASSES_MAT}
            position={[-face.eyeSpacing - 0.022, 0, 0.04]}
          />
          <mesh
            geometry={GLASSES_ARM_GEO}
            material={GLASSES_MAT}
            position={[face.eyeSpacing + 0.022, 0, 0.04]}
          />
        </group>
      )}

      {/* Beard (optional) */}
      {beardStyle !== "none" && (
        <mesh
          geometry={BEARD_GEO}
          material={hairMat}
          position={[0, face.mouthY - 0.02, -0.06]}
          scale={
            beardStyle === "stubble"
              ? [0.6, 0.3, 0.5]
              : beardStyle === "short"
                ? [0.7, 0.45, 0.55]
                : [0.85, 0.6, 0.6]
          }
        />
      )}
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHARACTER HEAD — skull + face + hair
// ══════════════════════════════════════════════════════════════════════════════

function CharacterHead({
  appearance,
  skinMat,
  hairMat,
  irisMat,
  lipMat,
}: {
  appearance: AgentAppearance;
  skinMat: THREE.Material;
  hairMat: THREE.Material;
  irisMat: THREE.Material;
  lipMat: THREE.Material;
}) {
  const face = FACE_CONFIGS[appearance.faceShape] ?? FACE_CONFIGS.oval;
  const HairComponent = HAIR_COMPONENTS[appearance.hairStyle] ?? HairShort;

  return (
    <group position={[0, POS.head, 0]}>
      {/* Skull */}
      <mesh
        geometry={HEAD_GEO}
        material={skinMat}
        scale={face.headScale}
        castShadow
      />

      {/* Face features */}
      <CharacterFace
        face={face}
        skinMat={skinMat}
        hairMat={hairMat}
        irisMat={irisMat}
        lipMat={lipMat}
        glasses={appearance.glasses}
        beardStyle={appearance.beardStyle}
      />

      {/* Hair */}
      <HairComponent mat={hairMat} />
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHARACTER BODY — torso, arms, legs, hands, feet
// ══════════════════════════════════════════════════════════════════════════════

function CharacterBody({
  bodyType,
  skinMat,
  shirtMat,
  pantsMat,
  shoeMat,
}: {
  bodyType: "male" | "female";
  skinMat: THREE.Material;
  shirtMat: THREE.Material;
  pantsMat: THREE.Material;
  shoeMat: THREE.Material;
}) {
  const body = BODY_CONFIGS[bodyType];
  const armX = body.shoulderX + 0.03;

  return (
    <group>
      {/* Neck */}
      <mesh geometry={NECK_GEO} material={skinMat} position={[0, POS.neck, 0]} />

      {/* Torso */}
      <mesh
        geometry={TORSO_GEO}
        material={shirtMat}
        position={[0, POS.torso, 0]}
        scale={[body.torsoScaleX, 1, body.torsoScaleZ]}
        castShadow
      />

      {/* Shoulders */}
      <mesh
        geometry={SHOULDER_GEO}
        material={shirtMat}
        position={[-body.shoulderX, POS.shoulder, 0]}
      />
      <mesh
        geometry={SHOULDER_GEO}
        material={shirtMat}
        position={[body.shoulderX, POS.shoulder, 0]}
      />

      {/* Upper arms */}
      <mesh
        geometry={UPPER_ARM_GEO}
        material={shirtMat}
        position={[-armX, POS.upperArm, 0]}
        scale={body.armScale}
      />
      <mesh
        geometry={UPPER_ARM_GEO}
        material={shirtMat}
        position={[armX, POS.upperArm, 0]}
        scale={body.armScale}
      />

      {/* Lower arms (skin) */}
      <mesh
        geometry={LOWER_ARM_GEO}
        material={skinMat}
        position={[-armX - 0.005, POS.lowerArm, 0]}
        scale={body.armScale}
      />
      <mesh
        geometry={LOWER_ARM_GEO}
        material={skinMat}
        position={[armX + 0.005, POS.lowerArm, 0]}
        scale={body.armScale}
      />

      {/* Hands */}
      <mesh
        geometry={HAND_GEO}
        material={skinMat}
        position={[-armX - 0.008, POS.hand, 0]}
      />
      <mesh
        geometry={HAND_GEO}
        material={skinMat}
        position={[armX + 0.008, POS.hand, 0]}
      />

      {/* Upper legs */}
      <mesh
        geometry={UPPER_LEG_GEO}
        material={pantsMat}
        position={[-POS.legX, POS.upperLeg, 0]}
        scale={body.legScale}
        castShadow
      />
      <mesh
        geometry={UPPER_LEG_GEO}
        material={pantsMat}
        position={[POS.legX, POS.upperLeg, 0]}
        scale={body.legScale}
        castShadow
      />

      {/* Lower legs */}
      <mesh
        geometry={LOWER_LEG_GEO}
        material={pantsMat}
        position={[-POS.legX, POS.lowerLeg, 0]}
        scale={body.legScale}
      />
      <mesh
        geometry={LOWER_LEG_GEO}
        material={pantsMat}
        position={[POS.legX, POS.lowerLeg, 0]}
        scale={body.legScale}
      />

      {/* Feet */}
      <mesh
        geometry={FOOT_GEO}
        material={shoeMat}
        position={[-POS.legX, POS.foot, 0.02]}
      />
      <mesh
        geometry={FOOT_GEO}
        material={shoeMat}
        position={[POS.legX, POS.foot, 0.02]}
      />
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT APPEARANCE — used as fallback
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_APPEARANCE: AgentAppearance = {
  skinColor: "#e8b89a",
  hairColor: "#3a2520",
  shirtColor: "#2c3e6b",
  pantsColor: "#34404f",
  shoeColor: "#1a1a2e",
  hairStyle: "short",
  eyeColor: "#4a6741",
  glasses: false,
  beardStyle: "none",
  height: 1.0,
  faceShape: "oval",
};

// ══════════════════════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════════════════════

export interface HumanAvatarProps {
  appearance: AgentAppearance;
  bodyType: "male" | "female";
  position: [number, number, number];
  rotation?: number;
  animation: AvatarAnimation;
  selected?: boolean;
  onClick?: () => void;
  name?: string;
  role?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function HumanAvatar({
  appearance,
  bodyType,
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
  const time = useRef(0);
  const [hovered, setHovered] = useState(false);

  const heightScale = appearance.height;

  // ── Per-agent materials (memoized on appearance colors) ──

  const materials = useMemo(() => {
    const lipHex = lipColorFromSkin(appearance.skinColor);
    return {
      skin: new THREE.MeshStandardMaterial({
        color: appearance.skinColor,
        roughness: 0.7,
        metalness: 0.02,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: appearance.hairColor,
        roughness: 0.8,
        metalness: 0.05,
      }),
      iris: new THREE.MeshStandardMaterial({
        color: appearance.eyeColor,
        roughness: 0.2,
        metalness: 0.1,
      }),
      lip: new THREE.MeshStandardMaterial({
        color: lipHex,
        roughness: 0.5,
      }),
      shirt: new THREE.MeshStandardMaterial({
        color: appearance.shirtColor,
        roughness: 0.85,
      }),
      pants: new THREE.MeshStandardMaterial({
        color: appearance.pantsColor,
        roughness: 0.85,
      }),
      shoes: new THREE.MeshStandardMaterial({
        color: appearance.shoeColor,
        roughness: 0.6,
        metalness: 0.1,
      }),
    };
  }, [
    appearance.skinColor,
    appearance.hairColor,
    appearance.eyeColor,
    appearance.shirtColor,
    appearance.pantsColor,
    appearance.shoeColor,
  ]);

  // ── Per-frame animation ──

  const SEATED_DROP = -0.20;

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const body = bodyRef.current;
    if (!body) return;

    const isSeated = animation === "sit" || animation === "type";

    if (animation === "idle") {
      const breath = 1 + Math.sin(t * 1.6) * 0.005;
      body.scale.set(1, breath, 1);
      body.position.y = Math.sin(t * 1.6) * 0.004;
      body.position.x = Math.sin(t * 0.35) * 0.005;
      body.rotation.y = Math.sin(t * 0.4) * 0.015;
      body.rotation.x = 0;
    } else if (animation === "walk") {
      body.scale.set(1, 1, 1);
      body.position.y = Math.abs(Math.sin(t * 4.5)) * 0.02;
      body.position.x = Math.sin(t * 2.25) * 0.008;
      body.rotation.y = Math.sin(t * 4.5) * 0.035;
      body.rotation.x = 0;
    } else if (isSeated) {
      const breath = 1 + Math.sin(t * 1.4) * 0.003;
      body.scale.set(1, breath, 1);
      body.position.y = SEATED_DROP;
      body.position.x = 0;
      body.rotation.x = -0.05;

      if (animation === "type") {
        body.position.y = SEATED_DROP + Math.sin(t * 1.8) * 0.002;
        body.position.x = Math.sin(t * 0.5) * 0.002;
      }

      body.rotation.y = 0;
    }
  });

  // ── Hover scale ──

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const ts = hovered ? 1.02 : 1.0;
    const s = heightScale * ts;
    groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), dt * 8);
  });

  // ── Character height for name tag ──
  const totalHeight = 1.65;

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
      <mesh
        geometry={RING_GEO}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
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
        <mesh
          geometry={SELECT_RING_GEO}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, 0]}
        >
          <meshStandardMaterial
            color="#c8b0ff"
            emissive="#c8b0ff"
            emissiveIntensity={2.5}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Animated body group */}
      <group ref={bodyRef}>
        {/* Head (skull + face + hair) */}
        <CharacterHead
          appearance={appearance}
          skinMat={materials.skin}
          hairMat={materials.hair}
          irisMat={materials.iris}
          lipMat={materials.lip}
        />

        {/* Body (torso + limbs) */}
        <CharacterBody
          bodyType={bodyType}
          skinMat={materials.skin}
          shirtMat={materials.shirt}
          pantsMat={materials.pants}
          shoeMat={materials.shoes}
        />
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
