// ══════════════════════════════════════════════════════════════════════════════
// HumanAvatar — GLB-model-based 3D avatar (mannequin style).
//
// Loads pre-made mannequin GLB files via useGLTF, clones the scene per
// instance using SkeletonUtils.clone (critical for proper skeleton rebinding),
// and applies per-agent materials (shirt, pants, skin, hair, shoes).
// Falls back to a simple colored box if the GLB fails to load.
//
// Supports male/female model selection, seated/standing poses, and subtle
// idle animation (breathing, sway).
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarAnimation } from "./AvatarAnimations";

// Re-export the animation type for external use
export type { AvatarAnimation } from "./AvatarAnimations";

// ── Model paths (mannequin style) ──

const MODEL_MALE = "/models/mannequin-male.glb";
const MODEL_FEMALE = "/models/mannequin-female-new.glb";
const MODEL_FALLBACK = "/models/mannequin-cc0.glb";

// ── Preload all models ──

useGLTF.preload(MODEL_MALE);
useGLTF.preload(MODEL_FEMALE);
useGLTF.preload(MODEL_FALLBACK);

// ── AvatarAppearance for this system ──

export interface HumanAvatarAppearance {
  /** Skin color hex -- realistic skin tones */
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

// ── UI geometries (shared) ──

const RING_GEO = new THREE.RingGeometry(0.32, 0.38, 28);
const SELECT_RING_GEO = new THREE.RingGeometry(0.42, 0.52, 28);

// ── Material factory ──
// Each agent gets its own material instances so mutations don't leak between avatars.

function makeMaterial(
  color: string,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// ── Mesh classification heuristics ──

type MeshZone = "skin" | "shirt" | "pants" | "hair" | "shoes" | "unknown";

function classifyMeshByName(name: string): MeshZone {
  const n = name.toLowerCase();

  // Hair
  if (n.includes("hair") || n.includes("scalp")) return "hair";

  // Shoes / feet
  if (n.includes("shoe") || n.includes("foot") || n.includes("feet") || n.includes("boot"))
    return "shoes";

  // Pants / lower body
  if (
    n.includes("pant") ||
    n.includes("trouser") ||
    n.includes("leg") ||
    n.includes("lower") ||
    n.includes("bottom")
  )
    return "pants";

  // Shirt / upper body
  if (
    n.includes("shirt") ||
    n.includes("top") ||
    n.includes("torso") ||
    n.includes("chest") ||
    n.includes("upper") ||
    n.includes("sleeve") ||
    n.includes("jacket") ||
    n.includes("cloth")
  )
    return "shirt";

  // Skin / body
  if (
    n.includes("skin") ||
    n.includes("body") ||
    n.includes("head") ||
    n.includes("face") ||
    n.includes("hand") ||
    n.includes("arm") ||
    n.includes("neck")
  )
    return "skin";

  return "unknown";
}

/** For models that have a single mesh (no named parts), classify by Y position. */
function classifyMeshByPosition(
  mesh: THREE.Mesh,
  modelBounds: THREE.Box3,
): MeshZone {
  const totalHeight = modelBounds.max.y - modelBounds.min.y;
  if (totalHeight <= 0) return "skin";

  const meshBounds = new THREE.Box3().setFromObject(mesh);
  const meshCenterY = (meshBounds.min.y + meshBounds.max.y) / 2;
  const relativeY = (meshCenterY - modelBounds.min.y) / totalHeight;

  if (relativeY > 0.85) return "hair";
  if (relativeY > 0.55) return "shirt";
  if (relativeY > 0.25) return "pants";
  if (relativeY <= 0.1) return "shoes";
  return "skin";
}

// ══════════════════════════════════════════════════════════════════════════════
// GLB Avatar Inner — loaded inside Suspense
// ══════════════════════════════════════════════════════════════════════════════

function GLBModelInner({
  appearance,
  animation,
}: {
  appearance: HumanAvatarAppearance;
  animation: AvatarAnimation;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  // Select model path based on body type
  const modelPath = appearance.bodyType === "female" ? MODEL_FEMALE : MODEL_MALE;

  // Load the GLB (useGLTF caches internally)
  const gltf = useGLTF(modelPath);

  // Clone the scene using SkeletonUtils for proper skeleton rebinding.
  // Standard clone(true) shares the skeleton, causing all instances to
  // render at the same world-space position.
  const clonedScene = useMemo(() => {
    const clone = skeletonClone(gltf.scene);

    // Reset root transform so positioning is controlled by the parent group
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    // Compute overall bounding box for positional classification
    const bounds = new THREE.Box3().setFromObject(clone);

    // Create per-agent materials
    const skinMat = makeMaterial(appearance.skinTone, 0.72, 0.02);
    const shirtMat = makeMaterial(appearance.shirtColor, 0.85, 0.0);
    const pantsMat = makeMaterial(appearance.pantsColor, 0.85, 0.0);
    const hairMat = makeMaterial(appearance.hairColor, 0.65, 0.05);
    const shoeMat = makeMaterial(appearance.shoeColor, 0.55, 0.08);

    // Count meshes to detect single-mesh vs multi-mesh models
    let meshCount = 0;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshCount++;
    });

    const isSingleMesh = meshCount <= 1;

    // Apply materials based on mesh classification
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      let zone: MeshZone;

      if (isSingleMesh) {
        // Single-mesh model: use position-based zone classification
        // so the mannequin still gets shirt/pants/shoe color zones
        zone = classifyMeshByPosition(mesh, bounds);
      } else {
        // Try name-based classification first
        zone = classifyMeshByName(mesh.name);
        if (zone === "unknown") {
          zone = classifyMeshByPosition(mesh, bounds);
        }
      }

      switch (zone) {
        case "skin":
          mesh.material = skinMat;
          break;
        case "shirt":
          mesh.material = shirtMat;
          break;
        case "pants":
          mesh.material = pantsMat;
          break;
        case "hair":
          mesh.material = hairMat;
          break;
        case "shoes":
          mesh.material = shoeMat;
          break;
        default:
          mesh.material = skinMat;
          break;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return clone;
  }, [
    gltf.scene,
    appearance.skinTone,
    appearance.shirtColor,
    appearance.pantsColor,
    appearance.hairColor,
    appearance.shoeColor,
  ]);

  // Compute bounding box to normalize scale and position the model on the ground
  const { scale: modelScale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Target height is ~1.68 world units
    const targetHeight = 1.68;
    const currentHeight = size.y;
    const s = currentHeight > 0 ? targetHeight / currentHeight : 1;

    // yOffset so feet are at Y=0
    const yOff = -box.min.y * s;

    return { scale: s, yOffset: yOff };
  }, [clonedScene]);

  // Per-frame animation
  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const group = modelRef.current;
    if (!group) return;

    const isSeated = animation === "sit" || animation === "type";
    const SEATED_DROP = -0.225;

    if (animation === "idle") {
      const breathScale = 1 + Math.sin(t * 1.6) * 0.005;
      group.scale.set(
        modelScale * breathScale,
        modelScale * breathScale,
        modelScale * breathScale,
      );
      group.position.y = yOffset + Math.sin(t * 1.6) * 0.004;
      group.position.x = Math.sin(t * 0.35) * 0.006;
      group.rotation.y = Math.sin(t * 0.4) * 0.02;
    } else if (animation === "walk") {
      group.scale.set(modelScale, modelScale, modelScale);
      group.position.y = yOffset + Math.abs(Math.sin(t * 4.5)) * 0.02;
      group.position.x = Math.sin(t * 2.25) * 0.01;
      group.rotation.y = Math.sin(t * 4.5) * 0.04;
    } else if (isSeated) {
      const breathScale = 1 + Math.sin(t * 1.4) * 0.003;
      group.scale.set(
        modelScale * breathScale,
        modelScale * breathScale,
        modelScale * breathScale,
      );
      group.position.y = yOffset + SEATED_DROP;

      if (animation === "type") {
        group.position.y += Math.sin(t * 1.8) * 0.002;
        group.position.x = Math.sin(t * 0.5) * 0.002;
      }

      group.rotation.x = -0.05;
      group.rotation.y = 0;
    }
  });

  return (
    <group ref={modelRef} scale={[modelScale, modelScale, modelScale]} position={[0, yOffset, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Fallback — simple colored box shown when GLB fails to load
// ══════════════════════════════════════════════════════════════════════════════

function FallbackAvatar({ appearance }: { appearance: HumanAvatarAppearance }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.4, 1.0, 0.25]} />
        <meshStandardMaterial color={appearance.shirtColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color={appearance.skinTone} roughness={0.7} />
      </mesh>
      <mesh position={[-0.1, 0.0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.15]} />
        <meshStandardMaterial color={appearance.pantsColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.15]} />
        <meshStandardMaterial color={appearance.pantsColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Error Boundary for GLB loading failures
// ══════════════════════════════════════════════════════════════════════════════

import { Component, type ReactNode, type ErrorInfo } from "react";

interface GLBErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface GLBErrorBoundaryState {
  hasError: boolean;
}

class GLBErrorBoundary extends Component<GLBErrorBoundaryProps, GLBErrorBoundaryState> {
  constructor(props: GLBErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GLBErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("[HumanAvatar] GLB load failed, using fallback:", error.message, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
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
  const [hovered, setHovered] = useState(false);

  const heightScale = appearance.height;
  const totalHeight = 1.68;

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const ts = hovered ? 1.02 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(ts * heightScale, ts * heightScale, ts * heightScale),
      dt * 8,
    );
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

      {/* Selection highlight ring */}
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

      {/* GLB model with fallback */}
      <GLBErrorBoundary fallback={<FallbackAvatar appearance={appearance} />}>
        <Suspense fallback={<FallbackAvatar appearance={appearance} />}>
          <GLBModelInner appearance={appearance} animation={animation} />
        </Suspense>
      </GLBErrorBoundary>

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
