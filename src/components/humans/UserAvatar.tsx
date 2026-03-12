// ══════════════════════════════════════════════════════════════════════════════
// UserAvatar — Renders the user's own avatar in the 3D office scene.
//
// - Visible when userAvatar.enabled is true
// - Hidden in first-person mode (camera IS the user's eyes)
// - Shown in third-person and orbit modes
// - Name tag: "You" in gold
// - Walking animation when moving, idle when stationary
// ══════════════════════════════════════════════════════════════════════════════

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useOfficeStore } from "../../stores/officeStore";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE } from "./HumanAvatar";
import type { AvatarAnimation } from "./AvatarAnimations";

// ── Constants ────────────────────────────────────────────────────────────────

const MOVE_THRESHOLD = 0.001; // minimum position delta to count as "moving"

// ── Component ────────────────────────────────────────────────────────────────

export function UserAvatarComponent() {
  const enabled = useOfficeStore((s) => s.userAvatar.enabled);
  const position = useOfficeStore((s) => s.userAvatar.position);
  const rotation = useOfficeStore((s) => s.userAvatar.rotation);
  const cameraMode = useOfficeStore((s) => s.userAvatar.cameraMode);
  const appearance = useOfficeStore((s) => s.userAvatar.appearance);

  // Track previous position to detect movement
  const prevPos = useRef<[number, number, number]>([...position]);
  const movingRef = useRef(false);
  const animRef = useRef<AvatarAnimation>("idle");

  // Per-frame movement detection (no allocations)
  useFrame(() => {
    const dx = position[0] - prevPos.current[0];
    const dz = position[2] - prevPos.current[2];
    const distSq = dx * dx + dz * dz;

    movingRef.current = distSq > MOVE_THRESHOLD;
    animRef.current = movingRef.current ? "walk" : "idle";

    prevPos.current[0] = position[0];
    prevPos.current[1] = position[1];
    prevPos.current[2] = position[2];
  });

  // Don't render if disabled
  if (!enabled) return null;

  // In first-person mode, the camera IS the user's eyes — no visible body
  if (cameraMode === "first-person") return null;

  // Build avatar appearance from store (AgentAppearance -> HumanAvatarAppearance)
  const avatarAppearance = {
    ...DEFAULT_HUMAN_APPEARANCE,
    skinTone: appearance.skinColor,
    hairColor: appearance.hairColor,
    hairStyle: appearance.hairStyle === "medium" ? "short" as const : appearance.hairStyle,
    shirtColor: appearance.shirtColor,
    pantsColor: appearance.pantsColor,
    shoeColor: appearance.shoeColor,
    height: appearance.height,
    bodyType: "male" as const,
  };

  return (
    <HumanAvatar
      appearance={avatarAppearance}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
      animation={animRef.current}
      name="You"
      role="Explorer"
    />
  );
}

export default UserAvatarComponent;
