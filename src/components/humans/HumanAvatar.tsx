// ══════════════════════════════════════════════════════════════════════════════
// HumanAvatar — Realistic procedural 3D human avatar built entirely from
// Three.js geometry. No GLB models required.
//
// Anatomically proportioned (head = ~1/7.5 of total height, shoulders ~2 head
// widths). Uses LatheGeometry for organic shapes, smooth MeshStandardMaterial
// with proper skin roughness. Supports multiple hair styles, clothing colors,
// skin tones, and idle/walk/sit/type animations.
//
// ~7,500 triangles per instance with shared static geometry.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import {
  type AvatarAnimation,
  type AvatarLimbRefs,
  useAvatarAnimationDispatch,
} from "./AvatarAnimations";

// Re-export the animation type for external use
export type { AvatarAnimation } from "./AvatarAnimations";

// ── AvatarAppearance for this system ──

export interface HumanAvatarAppearance {
  /** Skin color hex — realistic skin tones */
  skinTone: string;
  /** Hair color hex */
  hairColor: string;
  /** Hair style */
  hairStyle: "short" | "medium" | "long" | "bun" | "buzz" | "ponytail" | "curly";
  /** Eye color hex */
  eyeColor: string;
  /** Shirt / top color */
  shirtColor: string;
  /** Pants / bottom color */
  pantsColor: string;
  /** Shoe color */
  shoeColor: string;
  /** Height multiplier (1.0 = ~1.75m world units) */
  height: number;
  /** Gender body shape */
  bodyType: "male" | "female";
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
};

// ── Props ──

export interface HumanAvatarProps {
  appearance: HumanAvatarAppearance;
  position: [number, number, number];
  rotation?: number;
  animation: AvatarAnimation;
  selected?: boolean;
  onClick?: () => void;
  /** Name label above head */
  name?: string;
  /** Role subtitle */
  role?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED GEOMETRIES — created once at module level, reused by all instances.
// Anatomically correct proportions for a ~1.75m human.
// ══════════════════════════════════════════════════════════════════════════════

// ── HEAD — LatheGeometry cranium with refined egg-shaped profile ──
// Total head height ~0.25 units. Narrower at jaw, wider at cranium — egg shape.
// The LatheGeometry is then scaled (scaleX ~0.88, scaleY ~1.15) for a realistic
// elongated head rather than a watermelon sphere.
const HEAD_PROFILE_PTS = [
  new THREE.Vector2(0, 0),            // chin point (narrowest)
  new THREE.Vector2(0.016, 0.004),    // chin edge — narrower
  new THREE.Vector2(0.035, 0.014),    // lower jaw — narrower for defined chin
  new THREE.Vector2(0.054, 0.028),    // jaw angle — pulled inward
  new THREE.Vector2(0.070, 0.046),    // lower cheek
  new THREE.Vector2(0.082, 0.065),    // mid cheek
  new THREE.Vector2(0.092, 0.085),    // cheekbone
  new THREE.Vector2(0.099, 0.105),    // temple
  new THREE.Vector2(0.103, 0.125),    // widest — temporal bone
  new THREE.Vector2(0.102, 0.145),    // upper temple
  new THREE.Vector2(0.098, 0.163),    // parietal
  new THREE.Vector2(0.092, 0.180),    // upper parietal
  new THREE.Vector2(0.083, 0.196),    // forehead
  new THREE.Vector2(0.072, 0.210),    // upper forehead
  new THREE.Vector2(0.058, 0.222),    // crown curve
  new THREE.Vector2(0.040, 0.232),    // crown
  new THREE.Vector2(0.020, 0.238),    // near apex
  new THREE.Vector2(0, 0.242),        // top of skull
];
const HEAD_GEO = new THREE.LatheGeometry(HEAD_PROFILE_PTS, 32);

// ── CHIN DEFINITION — extra geometry for prominent chin ──
const CHIN_PROMINENCE_GEO = new THREE.SphereGeometry(0.022, 10, 8);

// ── FACE FEATURES — small geometries for realistic facial detail ──
const NOSE_BRIDGE_GEO = new THREE.CapsuleGeometry(0.014, 0.035, 5, 8); // slightly larger nose
const NOSE_TIP_GEO = new THREE.SphereGeometry(0.019, 10, 8); // more prominent nose tip
const NOSTRIL_GEO = new THREE.SphereGeometry(0.007, 6, 5);
const BROW_GEO = new THREE.CapsuleGeometry(0.008, 0.028, 4, 6); // brow ridge (skin-colored)
const EYEBROW_GEO = new THREE.BoxGeometry(0.032, 0.005, 0.008); // visible dark eyebrow
const EYE_SOCKET_GEO = new THREE.SphereGeometry(0.016, 10, 8); // slightly larger socket
const EYEBALL_GEO = new THREE.SphereGeometry(0.014, 10, 8); // larger eyeball
const PUPIL_GEO = new THREE.SphereGeometry(0.007, 8, 6); // slightly larger pupil
const IRIS_GEO = new THREE.SphereGeometry(0.011, 8, 6); // slightly larger iris
const UPPER_LIP_GEO = new THREE.CapsuleGeometry(0.005, 0.018, 3, 5);
const LOWER_LIP_GEO = new THREE.CapsuleGeometry(0.006, 0.020, 3, 5);
const EAR_GEO = new THREE.SphereGeometry(0.018, 8, 6);
const CHIN_GEO = new THREE.SphereGeometry(0.028, 10, 8);
const JAW_GEO = new THREE.BoxGeometry(0.10, 0.015, 0.06, 2, 1, 2);

// ── NECK ──
const NECK_GEO = new THREE.CapsuleGeometry(0.042, 0.055, 8, 12);

// ── TORSO — LatheGeometry for organic shape ──

// Upper torso (chest to shoulders) — shirt area
const UPPER_TORSO_PTS = [
  new THREE.Vector2(0.110, 0),        // waist
  new THREE.Vector2(0.108, 0.030),    // above waist
  new THREE.Vector2(0.115, 0.070),    // lower ribs
  new THREE.Vector2(0.130, 0.120),    // mid ribs
  new THREE.Vector2(0.150, 0.175),    // lower chest
  new THREE.Vector2(0.170, 0.225),    // upper chest
  new THREE.Vector2(0.185, 0.270),    // shoulder approach
  new THREE.Vector2(0.195, 0.305),    // acromion widest
  new THREE.Vector2(0.188, 0.325),    // inner shoulder
  new THREE.Vector2(0.155, 0.345),    // trapezius
  new THREE.Vector2(0.115, 0.365),    // mid trap
  new THREE.Vector2(0.075, 0.380),    // neck base
];
const UPPER_TORSO_GEO = new THREE.LatheGeometry(UPPER_TORSO_PTS, 24);

// Female upper torso — slightly narrower shoulders, more chest curve
const UPPER_TORSO_F_PTS = [
  new THREE.Vector2(0.105, 0),
  new THREE.Vector2(0.100, 0.030),
  new THREE.Vector2(0.108, 0.070),
  new THREE.Vector2(0.125, 0.120),
  new THREE.Vector2(0.148, 0.175),
  new THREE.Vector2(0.162, 0.225),
  new THREE.Vector2(0.172, 0.270),
  new THREE.Vector2(0.178, 0.305),
  new THREE.Vector2(0.172, 0.325),
  new THREE.Vector2(0.140, 0.345),
  new THREE.Vector2(0.105, 0.365),
  new THREE.Vector2(0.070, 0.380),
];
const UPPER_TORSO_F_GEO = new THREE.LatheGeometry(UPPER_TORSO_F_PTS, 24);

// Lower torso (waist to hips) — pants area
const LOWER_TORSO_PTS = [
  new THREE.Vector2(0.050, 0),        // crotch
  new THREE.Vector2(0.090, 0.020),    // inner hip
  new THREE.Vector2(0.130, 0.055),    // hip widening
  new THREE.Vector2(0.145, 0.090),    // iliac crest
  new THREE.Vector2(0.140, 0.130),    // upper hip
  new THREE.Vector2(0.130, 0.165),    // hip-waist transition
  new THREE.Vector2(0.118, 0.200),    // lower waist
  new THREE.Vector2(0.110, 0.230),    // waist top
];
const LOWER_TORSO_GEO = new THREE.LatheGeometry(LOWER_TORSO_PTS, 20);

// Female lower torso — wider hips
const LOWER_TORSO_F_PTS = [
  new THREE.Vector2(0.048, 0),
  new THREE.Vector2(0.095, 0.020),
  new THREE.Vector2(0.142, 0.055),
  new THREE.Vector2(0.158, 0.090),
  new THREE.Vector2(0.150, 0.130),
  new THREE.Vector2(0.135, 0.165),
  new THREE.Vector2(0.118, 0.200),
  new THREE.Vector2(0.105, 0.230),
];
const LOWER_TORSO_F_GEO = new THREE.LatheGeometry(LOWER_TORSO_F_PTS, 20);

// ── SHOULDER CAPS ──
const SHOULDER_GEO = new THREE.SphereGeometry(0.055, 14, 10);

// ── ARMS — tapered from upper to lower ──
const UPPER_ARM_GEO = new THREE.CapsuleGeometry(0.038, 0.175, 8, 12);
const ELBOW_GEO = new THREE.SphereGeometry(0.035, 10, 8);
const FOREARM_GEO = new THREE.CapsuleGeometry(0.030, 0.155, 8, 12);
const WRIST_GEO = new THREE.SphereGeometry(0.024, 8, 6);

// ── HANDS — palm + fingers + thumb ──
const PALM_GEO = new THREE.BoxGeometry(0.046, 0.016, 0.036, 2, 1, 2);
const FINGER_SHORT_GEO = new THREE.CapsuleGeometry(0.005, 0.022, 3, 4);
const FINGER_MID_GEO = new THREE.CapsuleGeometry(0.005, 0.028, 3, 4);
const FINGER_LONG_GEO = new THREE.CapsuleGeometry(0.005, 0.032, 3, 4);
const THUMB_GEO = new THREE.CapsuleGeometry(0.006, 0.018, 3, 4);

// ── HIPS — smooth torso-to-leg transition ──
const HIP_JOINT_GEO = new THREE.SphereGeometry(0.058, 12, 10);

// ── LEGS — muscular taper ──
const THIGH_GEO = new THREE.CapsuleGeometry(0.054, 0.210, 8, 12);
const KNEE_GEO = new THREE.SphereGeometry(0.050, 10, 8);
const CALF_GEO = new THREE.CapsuleGeometry(0.042, 0.195, 8, 12);
const ANKLE_GEO = new THREE.SphereGeometry(0.035, 8, 6);

// ── FEET — shoe shape ──
const FOOT_UPPER_GEO = new THREE.CapsuleGeometry(0.035, 0.050, 6, 10);
const FOOT_SOLE_GEO = new THREE.BoxGeometry(0.060, 0.013, 0.110, 2, 1, 2);
const FOOT_TOE_GEO = new THREE.SphereGeometry(0.025, 8, 6);

// ── HAIR GEOMETRIES ──
// Short hair — cap on top of skull
const HAIR_SHORT_GEO = new THREE.SphereGeometry(0.108, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
// Buzz cut — tighter cap
const HAIR_BUZZ_GEO = new THREE.SphereGeometry(0.106, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
// Long hair — elongated ellipsoid flowing down
const HAIR_LONG_BACK_GEO = new THREE.CapsuleGeometry(0.095, 0.14, 8, 14);
const HAIR_LONG_TOP_GEO = new THREE.SphereGeometry(0.110, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
// Bun — sphere on back of head
const HAIR_BUN_BASE_GEO = new THREE.SphereGeometry(0.106, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
const HAIR_BUN_GEO = new THREE.SphereGeometry(0.045, 12, 10);
// Ponytail — top cap + tail cylinder
const HAIR_PONY_TOP_GEO = new THREE.SphereGeometry(0.108, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
const HAIR_PONY_TAIL_GEO = new THREE.CapsuleGeometry(0.025, 0.12, 6, 8);
// Curly — slightly larger bumpy cap
const HAIR_CURLY_GEO = new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);

// ── CLOTHING COLLAR ──
const COLLAR_GEO = new THREE.TorusGeometry(0.055, 0.012, 8, 16);

// ── UI elements ──
const RING_GEO = new THREE.RingGeometry(0.32, 0.38, 28);
const SELECT_RING_GEO = new THREE.RingGeometry(0.42, 0.52, 28);

// ══════════════════════════════════════════════════════════════════════════════
// Material cache — shared across all avatar instances
// ══════════════════════════════════════════════════════════════════════════════

const matCache = new Map<string, THREE.MeshStandardMaterial>();

function skinMaterial(color: string): THREE.MeshStandardMaterial {
  const key = `skin_${color}`;
  if (matCache.has(key)) return matCache.get(key)!;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
  });
  matCache.set(key, m);
  return m;
}

function clothMaterial(color: string): THREE.MeshStandardMaterial {
  const key = `cloth_${color}`;
  if (matCache.has(key)) return matCache.get(key)!;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
  });
  matCache.set(key, m);
  return m;
}

function hairMaterial(color: string): THREE.MeshStandardMaterial {
  const key = `hair_${color}`;
  if (matCache.has(key)) return matCache.get(key)!;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.65,
    metalness: 0.05,
  });
  matCache.set(key, m);
  return m;
}

function shoeMaterial(color: string): THREE.MeshStandardMaterial {
  const key = `shoe_${color}`;
  if (matCache.has(key)) return matCache.get(key)!;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
  });
  matCache.set(key, m);
  return m;
}

const WHITE_MAT = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.3,
  metalness: 0.0,
});
const BLACK_MAT = new THREE.MeshStandardMaterial({
  color: "#111111",
  roughness: 0.6,
  metalness: 0.0,
});
const MOUTH_MAT = new THREE.MeshStandardMaterial({
  color: "#8a4a4a",
  roughness: 0.8,
  metalness: 0.0,
});

// Eyebrow material — dark but matches hair broadly
const EYEBROW_MAT = new THREE.MeshStandardMaterial({
  color: "#2a2015",
  roughness: 0.85,
  metalness: 0.0,
});

// ══════════════════════════════════════════════════════════════════════════════
// HAIR RENDERER — sub-component for each hair style
// ══════════════════════════════════════════════════════════════════════════════

// Hair scale matches the egg-shaped head: narrower X, taller Y, slightly compressed Z
const HAIR_SCALE: [number, number, number] = [0.88, 1.12, 0.92];

function HairMesh({
  style,
  mat,
}: {
  style: HumanAvatarAppearance["hairStyle"];
  mat: THREE.MeshStandardMaterial;
}) {
  // Hair Y positions are raised slightly to account for the taller head (scaleY 1.15)
  switch (style) {
    case "short":
      return (
        <mesh geometry={HAIR_SHORT_GEO} material={mat} position={[0, 0.135, -0.008]} scale={HAIR_SCALE} />
      );
    case "buzz":
      return (
        <mesh geometry={HAIR_BUZZ_GEO} material={mat} position={[0, 0.138, -0.005]} scale={HAIR_SCALE} />
      );
    case "long":
      return (
        <group>
          <mesh geometry={HAIR_LONG_TOP_GEO} material={mat} position={[0, 0.138, -0.008]} scale={HAIR_SCALE} />
          <mesh geometry={HAIR_LONG_BACK_GEO} material={mat} position={[0, 0.030, -0.055]} scale={[0.88, 1.0, 0.90]} />
        </group>
      );
    case "bun":
      return (
        <group>
          <mesh geometry={HAIR_BUN_BASE_GEO} material={mat} position={[0, 0.138, -0.005]} scale={HAIR_SCALE} />
          <mesh geometry={HAIR_BUN_GEO} material={mat} position={[0, 0.210, -0.055]} />
        </group>
      );
    case "ponytail":
      return (
        <group>
          <mesh geometry={HAIR_PONY_TOP_GEO} material={mat} position={[0, 0.140, -0.005]} scale={HAIR_SCALE} />
          <mesh geometry={HAIR_PONY_TAIL_GEO} material={mat} position={[0, 0.130, -0.095]} rotation={[0.4, 0, 0]} />
        </group>
      );
    case "curly":
      return (
        <mesh geometry={HAIR_CURLY_GEO} material={mat} position={[0, 0.128, -0.005]} scale={HAIR_SCALE} />
      );
    default:
      return (
        <mesh geometry={HAIR_SHORT_GEO} material={mat} position={[0, 0.135, -0.008]} scale={HAIR_SCALE} />
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HAND sub-component — palm + 4 fingers + thumb
// ══════════════════════════════════════════════════════════════════════════════

function Hand({
  side,
  skinMat: sm,
}: {
  side: "left" | "right";
  skinMat: THREE.MeshStandardMaterial;
}) {
  const mirror = side === "left" ? -1 : 1;
  return (
    <group>
      <mesh geometry={PALM_GEO} material={sm} />
      {/* Index finger */}
      <mesh geometry={FINGER_MID_GEO} material={sm} position={[-0.013 * mirror, -0.026, 0]} />
      {/* Middle finger — longest */}
      <mesh geometry={FINGER_LONG_GEO} material={sm} position={[-0.004 * mirror, -0.028, 0]} />
      {/* Ring finger */}
      <mesh geometry={FINGER_MID_GEO} material={sm} position={[0.005 * mirror, -0.026, 0]} />
      {/* Pinky */}
      <mesh geometry={FINGER_SHORT_GEO} material={sm} position={[0.013 * mirror, -0.022, 0]} />
      {/* Thumb — angled outward */}
      <mesh
        geometry={THUMB_GEO}
        material={sm}
        position={[-0.026 * mirror, -0.005, 0.008]}
        rotation={[0, 0, 0.5 * mirror]}
      />
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
  const bodyGroupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Group>(null);
  const leftCalfRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const rightCalfRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Build the limb refs object for the animation system
  const limbRefs: AvatarLimbRefs = useMemo(
    () => ({
      body: bodyGroupRef,
      head: headRef,
      torso: torsoRef,
      leftUpperArm: leftUpperArmRef,
      leftForearm: leftForearmRef,
      rightUpperArm: rightUpperArmRef,
      rightForearm: rightForearmRef,
      leftThigh: leftThighRef,
      leftCalf: leftCalfRef,
      rightThigh: rightThighRef,
      rightCalf: rightCalfRef,
    }),
    []
  );

  // Run the animation dispatch hook
  useAvatarAnimationDispatch(animation, limbRefs);

  // Resolve materials from appearance
  const skinMat = useMemo(() => skinMaterial(appearance.skinTone), [appearance.skinTone]);
  const shirtMat = useMemo(() => clothMaterial(appearance.shirtColor), [appearance.shirtColor]);
  const pantsMat = useMemo(() => clothMaterial(appearance.pantsColor), [appearance.pantsColor]);
  const shoesMat = useMemo(() => shoeMaterial(appearance.shoeColor), [appearance.shoeColor]);
  const hairMat = useMemo(() => hairMaterial(appearance.hairColor), [appearance.hairColor]);
  const irisMat = useMemo(() => {
    const key = `iris_${appearance.eyeColor}`;
    if (matCache.has(key)) return matCache.get(key)!;
    const m = new THREE.MeshStandardMaterial({
      color: appearance.eyeColor,
      roughness: 0.3,
      metalness: 0.1,
    });
    matCache.set(key, m);
    return m;
  }, [appearance.eyeColor]);

  // Height scale: base avatar is ~1.75 world units, appearance.height multiplies
  const heightScale = appearance.height;
  const isFemale = appearance.bodyType === "female";

  // Select torso geometries based on body type
  const upperTorsoGeo = isFemale ? UPPER_TORSO_F_GEO : UPPER_TORSO_GEO;
  const lowerTorsoGeo = isFemale ? LOWER_TORSO_F_GEO : LOWER_TORSO_GEO;

  // Shoulder width offset — male shoulders are wider
  const shoulderX = isFemale ? 0.185 : 0.200;
  const hipX = isFemale ? 0.082 : 0.075;

  // Hover scale animation
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const ts = hovered ? 1.02 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(ts * heightScale, ts * heightScale, ts * heightScale),
      dt * 8
    );
  });

  // ── Y-positions for body segments (from feet up) ──
  // Foot bottom = 0
  // Foot height: ~0.035
  // Ankle: 0.065
  // Calf: 0.18
  // Knee: 0.355
  // Thigh: 0.47
  // Hip joint: 0.675
  // Lower torso base: 0.675
  // Lower torso top (waist): 0.905
  // Upper torso base: 0.905
  // Upper torso top: ~1.285
  // Neck: 1.32
  // Head base: 1.40
  // Head top: ~1.68 (with egg-shape scaleY 1.15)
  // Total: ~1.68 (human average proportions at 1.75m scale)

  const totalHeight = 1.68;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      scale={[heightScale, heightScale, heightScale]}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={onClick ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={onClick ? () => { setHovered(false); document.body.style.cursor = "auto"; } : undefined}
    >
      {/* ── Ground ring ── */}
      <mesh geometry={RING_GEO} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshStandardMaterial
          color="#7c5cbf"
          emissive="#7c5cbf"
          emissiveIntensity={1.2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* ── Selection highlight ring ── */}
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

      {/* ── BODY GROUP — animated position (bob/sway) ── */}
      <group ref={bodyGroupRef}>
        {/* ══ LOWER BODY (pants area) ══ */}

        {/* Lower torso — hips to waist */}
        <mesh geometry={lowerTorsoGeo} material={pantsMat} position={[0, 0.675, 0]} scale={[1.0, 1.0, 0.85]} />

        {/* ══ LEFT LEG ══ */}
        <group ref={leftThighRef} position={[-hipX, 0.675, 0]}>
          <mesh geometry={HIP_JOINT_GEO} material={pantsMat} />
          <mesh geometry={THIGH_GEO} material={pantsMat} position={[0, -0.175, 0]} />
          <mesh geometry={KNEE_GEO} material={pantsMat} position={[0, -0.315, 0]} />

          {/* Calf — separate ref for knee bend */}
          <group ref={leftCalfRef} position={[0, -0.315, 0]}>
            <mesh geometry={CALF_GEO} material={pantsMat} position={[0, -0.160, 0]} />
            <mesh geometry={ANKLE_GEO} material={pantsMat} position={[0, -0.290, 0]} />
            {/* Foot */}
            <group position={[0, -0.320, 0.030]}>
              <mesh geometry={FOOT_UPPER_GEO} material={shoesMat} scale={[0.85, 0.55, 1.3]} />
              <mesh geometry={FOOT_SOLE_GEO} material={shoesMat} position={[0, -0.016, 0.010]} />
              <mesh geometry={FOOT_TOE_GEO} material={shoesMat} position={[0, -0.008, 0.058]} scale={[1.2, 0.5, 0.8]} />
            </group>
          </group>
        </group>

        {/* ══ RIGHT LEG ══ */}
        <group ref={rightThighRef} position={[hipX, 0.675, 0]}>
          <mesh geometry={HIP_JOINT_GEO} material={pantsMat} />
          <mesh geometry={THIGH_GEO} material={pantsMat} position={[0, -0.175, 0]} />
          <mesh geometry={KNEE_GEO} material={pantsMat} position={[0, -0.315, 0]} />

          <group ref={rightCalfRef} position={[0, -0.315, 0]}>
            <mesh geometry={CALF_GEO} material={pantsMat} position={[0, -0.160, 0]} />
            <mesh geometry={ANKLE_GEO} material={pantsMat} position={[0, -0.290, 0]} />
            <group position={[0, -0.320, 0.030]}>
              <mesh geometry={FOOT_UPPER_GEO} material={shoesMat} scale={[0.85, 0.55, 1.3]} />
              <mesh geometry={FOOT_SOLE_GEO} material={shoesMat} position={[0, -0.016, 0.010]} />
              <mesh geometry={FOOT_TOE_GEO} material={shoesMat} position={[0, -0.008, 0.058]} scale={[1.2, 0.5, 0.8]} />
            </group>
          </group>
        </group>

        {/* ══ UPPER BODY (shirt/torso area) ══ */}
        <group ref={torsoRef}>
          {/* Upper torso — waist to shoulders */}
          <mesh geometry={upperTorsoGeo} material={shirtMat} position={[0, 0.905, 0]} scale={[1.0, 1.0, 0.85]} />

          {/* Collar */}
          <mesh geometry={COLLAR_GEO} material={shirtMat} position={[0, 1.285, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* Neck */}
          <mesh geometry={NECK_GEO} material={skinMat} position={[0, 1.340, 0]} />
        </group>

        {/* ══ LEFT ARM ══ */}
        <group ref={leftUpperArmRef} position={[-shoulderX, 1.245, 0]}>
          {/* Shoulder cap */}
          <mesh geometry={SHOULDER_GEO} material={shirtMat} scale={[1.05, 0.8, 0.9]} position={[0.015, 0.008, 0]} />
          {/* Upper arm (shirt) */}
          <mesh geometry={UPPER_ARM_GEO} material={shirtMat} position={[0, -0.140, 0]} />
          {/* Elbow */}
          <mesh geometry={ELBOW_GEO} material={skinMat} position={[0, -0.260, 0]} />

          {/* Forearm — separate ref for elbow bend */}
          <group ref={leftForearmRef} position={[0, -0.260, 0]}>
            <mesh geometry={FOREARM_GEO} material={skinMat} position={[0, -0.125, 0]} />
            <mesh geometry={WRIST_GEO} material={skinMat} position={[0, -0.230, 0]} />
            {/* Hand */}
            <group position={[0, -0.268, 0]}>
              <Hand side="left" skinMat={skinMat} />
            </group>
          </group>
        </group>

        {/* ══ RIGHT ARM ══ */}
        <group ref={rightUpperArmRef} position={[shoulderX, 1.245, 0]}>
          <mesh geometry={SHOULDER_GEO} material={shirtMat} scale={[1.05, 0.8, 0.9]} position={[-0.015, 0.008, 0]} />
          <mesh geometry={UPPER_ARM_GEO} material={shirtMat} position={[0, -0.140, 0]} />
          <mesh geometry={ELBOW_GEO} material={skinMat} position={[0, -0.260, 0]} />

          <group ref={rightForearmRef} position={[0, -0.260, 0]}>
            <mesh geometry={FOREARM_GEO} material={skinMat} position={[0, -0.125, 0]} />
            <mesh geometry={WRIST_GEO} material={skinMat} position={[0, -0.230, 0]} />
            <group position={[0, -0.268, 0]}>
              <Hand side="right" skinMat={skinMat} />
            </group>
          </group>
        </group>

        {/* ══ HEAD ══ */}
        <group ref={headRef} position={[0, 1.400, 0]}>
          {/* Cranium — egg-shaped: taller (scaleY 1.15), narrower (scaleX 0.88),
              compressed front-to-back (scaleZ 0.90) for realistic human head */}
          <mesh geometry={HEAD_GEO} material={skinMat} position={[0, -0.105, 0]} scale={[0.88, 1.15, 0.90]} />

          {/* Chin/jaw definition — more prominent for realistic look */}
          <mesh geometry={CHIN_GEO} material={skinMat} position={[0, -0.112, 0.042]} scale={[1.1, 0.55, 0.85]} />
          <mesh geometry={CHIN_PROMINENCE_GEO} material={skinMat} position={[0, -0.118, 0.050]} scale={[0.9, 0.6, 0.7]} />
          <mesh geometry={JAW_GEO} material={skinMat} position={[0, -0.095, 0.010]} />

          {/* ── FACE ── */}

          {/* Brow ridges (skin colored — structural) */}
          <mesh geometry={BROW_GEO} material={skinMat} position={[-0.030, 0.028, 0.075]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={BROW_GEO} material={skinMat} position={[0.030, 0.028, 0.075]} rotation={[0, 0, Math.PI / 2]} />

          {/* Eyebrows — dark, visible thin boxes above the brow ridge */}
          <mesh geometry={EYEBROW_GEO} material={EYEBROW_MAT} position={[-0.030, 0.036, 0.078]} rotation={[0.15, 0, 0.06]} />
          <mesh geometry={EYEBROW_GEO} material={EYEBROW_MAT} position={[0.030, 0.036, 0.078]} rotation={[0.15, 0, -0.06]} />

          {/* Eye sockets */}
          <mesh geometry={EYE_SOCKET_GEO} material={skinMat} position={[-0.032, 0.010, 0.076]} scale={[1.2, 0.85, 0.6]} />
          <mesh geometry={EYE_SOCKET_GEO} material={skinMat} position={[0.032, 0.010, 0.076]} scale={[1.2, 0.85, 0.6]} />

          {/* Eyeballs — white, larger for visibility */}
          <mesh geometry={EYEBALL_GEO} material={WHITE_MAT} position={[-0.032, 0.010, 0.082]} />
          <mesh geometry={EYEBALL_GEO} material={WHITE_MAT} position={[0.032, 0.010, 0.082]} />

          {/* Irises — larger */}
          <mesh geometry={IRIS_GEO} material={irisMat} position={[-0.032, 0.010, 0.094]} scale={[1, 1, 0.3]} />
          <mesh geometry={IRIS_GEO} material={irisMat} position={[0.032, 0.010, 0.094]} scale={[1, 1, 0.3]} />

          {/* Pupils — black, larger */}
          <mesh geometry={PUPIL_GEO} material={BLACK_MAT} position={[-0.032, 0.010, 0.096]} scale={[1, 1, 0.25]} />
          <mesh geometry={PUPIL_GEO} material={BLACK_MAT} position={[0.032, 0.010, 0.096]} scale={[1, 1, 0.25]} />

          {/* Nose — more prominent */}
          <mesh geometry={NOSE_BRIDGE_GEO} material={skinMat} position={[0, -0.002, 0.092]} />
          <mesh geometry={NOSE_TIP_GEO} material={skinMat} position={[0, -0.030, 0.100]} scale={[1, 0.65, 0.85]} />
          {/* Nostrils */}
          <mesh geometry={NOSTRIL_GEO} material={skinMat} position={[-0.011, -0.035, 0.094]} scale={[0.8, 0.5, 0.6]} />
          <mesh geometry={NOSTRIL_GEO} material={skinMat} position={[0.011, -0.035, 0.094]} scale={[0.8, 0.5, 0.6]} />

          {/* Lips */}
          <mesh geometry={UPPER_LIP_GEO} material={MOUTH_MAT} position={[0, -0.056, 0.072]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={LOWER_LIP_GEO} material={MOUTH_MAT} position={[0, -0.066, 0.070]} rotation={[0, 0, Math.PI / 2]} />

          {/* Ears — adjusted for narrower head */}
          <mesh geometry={EAR_GEO} material={skinMat} position={[-0.092, -0.002, -0.010]} scale={[0.38, 0.85, 0.55]} />
          <mesh geometry={EAR_GEO} material={skinMat} position={[0.092, -0.002, -0.010]} scale={[0.38, 0.85, 0.55]} />

          {/* ── HAIR ── */}
          <HairMesh style={appearance.hairStyle} mat={hairMat} />
        </group>
      </group>

      {/* ── NAME TAG ── */}
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
