// ══════════════════════════════════════════════════════════════════════════════
// AvatarAnimations — procedural animation utilities for realistic human avatars.
//
// Each hook returns per-frame bone/group position & rotation updates.
// Designed to be driven by useFrame in React Three Fiber.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const sin = Math.sin;
const PI = Math.PI;

// ── Shared refs type for limb groups ──

export interface AvatarLimbRefs {
  body: React.RefObject<THREE.Group | null>;
  head: React.RefObject<THREE.Group | null>;
  torso: React.RefObject<THREE.Group | null>;
  leftUpperArm: React.RefObject<THREE.Group | null>;
  leftForearm: React.RefObject<THREE.Group | null>;
  rightUpperArm: React.RefObject<THREE.Group | null>;
  rightForearm: React.RefObject<THREE.Group | null>;
  leftThigh: React.RefObject<THREE.Group | null>;
  leftCalf: React.RefObject<THREE.Group | null>;
  rightThigh: React.RefObject<THREE.Group | null>;
  rightCalf: React.RefObject<THREE.Group | null>;
}

// ── Smoothed value helper ──

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. IDLE ANIMATION — subtle breathing, gentle sway, micro head movements
// ══════════════════════════════════════════════════════════════════════════════

export function useIdleAnimation(refs: AvatarLimbRefs) {
  const time = useRef(0);
  const smooth = useRef({
    bodyY: 0, bodySway: 0, breathScale: 1,
    headX: 0, headY: 0, headZ: 0,
    laX: 0, raX: 0, laZ: 0, raZ: 0,
  });

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const s = smooth.current;
    const f = Math.min(1, dt * 5);

    // Breathing — torso scale oscillation
    const breathTarget = 1 + sin(t * 1.6) * 0.008;
    s.breathScale = lerp(s.breathScale, breathTarget, f);

    // Body vertical bob from breathing
    s.bodyY = lerp(s.bodyY, sin(t * 1.6) * 0.004, f);

    // Gentle lateral sway — weight shifting
    s.bodySway = lerp(s.bodySway, sin(t * 0.35) * 0.006, f);

    // Head micro-movements — looking around subtly
    s.headX = lerp(s.headX, sin(t * 0.6) * 0.025, f);
    s.headY = lerp(s.headY, sin(t * 0.4 + 0.7) * 0.03, f);
    s.headZ = lerp(s.headZ, sin(t * 0.5 + 1.3) * 0.015, f);

    // Arms — very subtle pendulum
    s.laX = lerp(s.laX, sin(t * 0.45) * 0.02, f);
    s.raX = lerp(s.raX, sin(t * 0.45 + 0.8) * 0.02, f);
    s.laZ = lerp(s.laZ, 0, f);
    s.raZ = lerp(s.raZ, 0, f);

    // Apply
    if (refs.body.current) {
      refs.body.current.position.y += s.bodyY;
      refs.body.current.position.x += s.bodySway;
    }
    if (refs.torso.current) {
      refs.torso.current.scale.x = s.breathScale;
      refs.torso.current.scale.z = s.breathScale;
    }
    if (refs.head.current) {
      refs.head.current.rotation.x = s.headX;
      refs.head.current.rotation.y = s.headY;
      refs.head.current.rotation.z = s.headZ;
    }
    if (refs.leftUpperArm.current) {
      refs.leftUpperArm.current.rotation.x = s.laX;
      refs.leftUpperArm.current.rotation.z = s.laZ;
    }
    if (refs.rightUpperArm.current) {
      refs.rightUpperArm.current.rotation.x = s.raX;
      refs.rightUpperArm.current.rotation.z = s.raZ;
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. WALK ANIMATION — arm & leg swing, body bob, head stability
// ══════════════════════════════════════════════════════════════════════════════

export function useWalkAnimation(refs: AvatarLimbRefs) {
  const time = useRef(0);
  const smooth = useRef({
    bodyY: 0, bodySway: 0,
    headX: 0,
    laX: 0, raX: 0,
    llX: 0, rlX: 0,
    llCalfX: 0, rlCalfX: 0,
    laForeX: 0, raForeX: 0,
  });

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const s = smooth.current;
    const f = Math.min(1, dt * 6);
    const walkSpeed = 4.5;

    // Vertical bob — up at mid-stride, down at foot plant
    s.bodyY = lerp(s.bodyY, Math.abs(sin(t * walkSpeed)) * 0.025, f);

    // Lateral sway — shift weight side to side
    s.bodySway = lerp(s.bodySway, sin(t * walkSpeed * 0.5) * 0.012, f);

    // Head counteracts body motion slightly for stability
    s.headX = lerp(s.headX, -sin(t * walkSpeed) * 0.015, f);

    // Arms swing opposite to legs (natural gait)
    const armSwing = 0.35;
    s.laX = lerp(s.laX, sin(t * walkSpeed) * armSwing, f);
    s.raX = lerp(s.raX, sin(t * walkSpeed + PI) * armSwing, f);

    // Forearms bend during backswing
    s.laForeX = lerp(s.laForeX, Math.max(0, -sin(t * walkSpeed)) * 0.4, f);
    s.raForeX = lerp(s.raForeX, Math.max(0, sin(t * walkSpeed)) * 0.4, f);

    // Legs — primary stride
    const legSwing = 0.4;
    s.llX = lerp(s.llX, sin(t * walkSpeed + PI) * legSwing, f);
    s.rlX = lerp(s.rlX, sin(t * walkSpeed) * legSwing, f);

    // Calves — knee bend on backswing
    s.llCalfX = lerp(s.llCalfX, Math.max(0, sin(t * walkSpeed + PI)) * 0.6, f);
    s.rlCalfX = lerp(s.rlCalfX, Math.max(0, sin(t * walkSpeed)) * 0.6, f);

    // Apply
    if (refs.body.current) {
      refs.body.current.position.y += s.bodyY;
      refs.body.current.position.x += s.bodySway;
    }
    if (refs.head.current) {
      refs.head.current.rotation.x = s.headX;
    }
    if (refs.leftUpperArm.current) refs.leftUpperArm.current.rotation.x = s.laX;
    if (refs.rightUpperArm.current) refs.rightUpperArm.current.rotation.x = s.raX;
    if (refs.leftForearm.current) refs.leftForearm.current.rotation.x = -s.laForeX;
    if (refs.rightForearm.current) refs.rightForearm.current.rotation.x = -s.raForeX;
    if (refs.leftThigh.current) refs.leftThigh.current.rotation.x = s.llX;
    if (refs.rightThigh.current) refs.rightThigh.current.rotation.x = s.rlX;
    if (refs.leftCalf.current) refs.leftCalf.current.rotation.x = s.llCalfX;
    if (refs.rightCalf.current) refs.rightCalf.current.rotation.x = s.rlCalfX;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SIT ANIMATION — seated pose with subtle breathing and head movement
// ══════════════════════════════════════════════════════════════════════════════

export function useSitAnimation(refs: AvatarLimbRefs) {
  const time = useRef(0);
  const smooth = useRef({
    breathScale: 1,
    headX: 0, headY: 0, headZ: 0,
    laX: 0, raX: 0,
  });

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const s = smooth.current;
    const f = Math.min(1, dt * 4);

    // Breathing
    s.breathScale = lerp(s.breathScale, 1 + sin(t * 1.4) * 0.006, f);

    // Head — looking around while seated
    s.headX = lerp(s.headX, sin(t * 0.5) * 0.04 - 0.06, f); // slight downward gaze
    s.headY = lerp(s.headY, sin(t * 0.35) * 0.05, f);
    s.headZ = lerp(s.headZ, sin(t * 0.45 + 1.0) * 0.02, f);

    // Arms rest on thighs with micro-movement
    s.laX = lerp(s.laX, -PI / 2.2 + sin(t * 0.6) * 0.02, f);
    s.raX = lerp(s.raX, -PI / 2.2 + sin(t * 0.6 + 0.5) * 0.02, f);

    // Apply static seated pose + micro-animation
    if (refs.torso.current) {
      refs.torso.current.scale.x = s.breathScale;
      refs.torso.current.scale.z = s.breathScale;
    }
    if (refs.head.current) {
      refs.head.current.rotation.x = s.headX;
      refs.head.current.rotation.y = s.headY;
      refs.head.current.rotation.z = s.headZ;
    }

    // Thighs bent forward for sitting
    if (refs.leftThigh.current) refs.leftThigh.current.rotation.x = -PI / 2;
    if (refs.rightThigh.current) refs.rightThigh.current.rotation.x = -PI / 2;

    // Calves hang down
    if (refs.leftCalf.current) refs.leftCalf.current.rotation.x = PI / 2;
    if (refs.rightCalf.current) refs.rightCalf.current.rotation.x = PI / 2;

    // Arms resting
    if (refs.leftUpperArm.current) refs.leftUpperArm.current.rotation.x = s.laX;
    if (refs.rightUpperArm.current) refs.rightUpperArm.current.rotation.x = s.raX;
    if (refs.leftForearm.current) refs.leftForearm.current.rotation.x = -PI / 4;
    if (refs.rightForearm.current) refs.rightForearm.current.rotation.x = -PI / 4;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. TYPE ANIMATION — hands actively typing, head looks at screen
// ══════════════════════════════════════════════════════════════════════════════

export function useTypeAnimation(refs: AvatarLimbRefs) {
  const time = useRef(0);
  const smooth = useRef({
    breathScale: 1,
    headX: 0, headZ: 0,
    laX: 0, raX: 0,
    laForeX: 0, raForeX: 0,
  });

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const s = smooth.current;
    const f = Math.min(1, dt * 5);

    // Breathing — very subtle during focused work
    s.breathScale = lerp(s.breathScale, 1 + sin(t * 1.8) * 0.005, f);

    // Head — looking down at keyboard/screen, slight side-to-side as reading
    s.headX = lerp(s.headX, -0.12 + sin(t * 1.2) * 0.03, f);
    s.headZ = lerp(s.headZ, sin(t * 0.8) * 0.02, f);

    // Arms — held forward for typing
    s.laX = lerp(s.laX, -0.65 + sin(t * 5.5) * 0.06, f);
    s.raX = lerp(s.raX, -0.65 + sin(t * 5.5 + 1.2) * 0.06, f);

    // Forearms — rapid small movements (typing)
    s.laForeX = lerp(s.laForeX, -0.8 + sin(t * 8) * 0.08, f);
    s.raForeX = lerp(s.raForeX, -0.8 + sin(t * 8 + 1.8) * 0.08, f);

    // Apply
    if (refs.torso.current) {
      refs.torso.current.scale.x = s.breathScale;
      refs.torso.current.scale.z = s.breathScale;
    }
    if (refs.head.current) {
      refs.head.current.rotation.x = s.headX;
      refs.head.current.rotation.z = s.headZ;
    }
    if (refs.leftUpperArm.current) refs.leftUpperArm.current.rotation.x = s.laX;
    if (refs.rightUpperArm.current) refs.rightUpperArm.current.rotation.x = s.raX;
    if (refs.leftForearm.current) refs.leftForearm.current.rotation.x = s.laForeX;
    if (refs.rightForearm.current) refs.rightForearm.current.rotation.x = s.raForeX;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Animation type union (for HumanAvatar's animation prop)
// ══════════════════════════════════════════════════════════════════════════════

export type AvatarAnimation = "idle" | "walk" | "sit" | "type";

/**
 * Master hook that delegates to the correct animation based on the animation prop.
 * Only one animation runs at a time per avatar instance.
 */
export function useAvatarAnimationDispatch(
  animation: AvatarAnimation,
  refs: AvatarLimbRefs
) {
  // We run all hooks unconditionally (React hook rules) but only apply the active one.
  // Instead, we use a single useFrame that contains all animation logic inline.
  const time = useRef(0);
  const smooth = useRef({
    bodyY: 0, bodySway: 0, breathScale: 1,
    headX: 0, headY: 0, headZ: 0,
    laX: 0, raX: 0, laZ: 0, raZ: 0,
    laForeX: 0, raForeX: 0,
    llX: 0, rlX: 0,
    llCalfX: 0, rlCalfX: 0,
  });

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const s = smooth.current;
    const f = Math.min(1, dt * 5);

    // Reset positions each frame (accumulation is done by the smooth refs)
    let bodyDY = 0;
    let bodyDX = 0;

    // Seated body drop: when sitting/typing, the whole body lowers so the hip
    // (at local Y=0.675) lands on the chair seat (at Y≈0.45).
    // Drop amount = 0.675 - 0.45 = 0.225
    const SEATED_DROP = -0.225;

    if (animation === "idle") {
      // Breathing
      s.breathScale = lerp(s.breathScale, 1 + sin(t * 1.6) * 0.008, f);
      bodyDY = sin(t * 1.6) * 0.004;
      bodyDX = sin(t * 0.35) * 0.006;
      s.headX = lerp(s.headX, sin(t * 0.6) * 0.025, f);
      s.headY = lerp(s.headY, sin(t * 0.4 + 0.7) * 0.03, f);
      s.headZ = lerp(s.headZ, sin(t * 0.5 + 1.3) * 0.015, f);
      s.laX = lerp(s.laX, sin(t * 0.45) * 0.02, f);
      s.raX = lerp(s.raX, sin(t * 0.45 + 0.8) * 0.02, f);
      s.laZ = lerp(s.laZ, 0, f);
      s.raZ = lerp(s.raZ, 0, f);
      s.laForeX = lerp(s.laForeX, 0, f);
      s.raForeX = lerp(s.raForeX, 0, f);
      s.llX = lerp(s.llX, 0, f);
      s.rlX = lerp(s.rlX, 0, f);
      s.llCalfX = lerp(s.llCalfX, 0, f);
      s.rlCalfX = lerp(s.rlCalfX, 0, f);
    } else if (animation === "walk") {
      const ws = 4.5;
      bodyDY = Math.abs(sin(t * ws)) * 0.025;
      bodyDX = sin(t * ws * 0.5) * 0.012;
      s.breathScale = lerp(s.breathScale, 1, f);
      s.headX = lerp(s.headX, -sin(t * ws) * 0.015, f);
      s.headY = lerp(s.headY, 0, f);
      s.headZ = lerp(s.headZ, 0, f);
      s.laX = lerp(s.laX, sin(t * ws) * 0.35, f);
      s.raX = lerp(s.raX, sin(t * ws + PI) * 0.35, f);
      s.laZ = lerp(s.laZ, 0, f);
      s.raZ = lerp(s.raZ, 0, f);
      s.laForeX = lerp(s.laForeX, -Math.max(0, -sin(t * ws)) * 0.4, f);
      s.raForeX = lerp(s.raForeX, -Math.max(0, sin(t * ws)) * 0.4, f);
      s.llX = lerp(s.llX, sin(t * ws + PI) * 0.4, f);
      s.rlX = lerp(s.rlX, sin(t * ws) * 0.4, f);
      s.llCalfX = lerp(s.llCalfX, Math.max(0, sin(t * ws + PI)) * 0.6, f);
      s.rlCalfX = lerp(s.rlCalfX, Math.max(0, sin(t * ws)) * 0.6, f);
    } else if (animation === "sit") {
      s.breathScale = lerp(s.breathScale, 1 + sin(t * 1.4) * 0.006, f);
      // Drop body so butt is on the chair seat
      bodyDY = SEATED_DROP;
      bodyDX = 0;
      s.headX = lerp(s.headX, sin(t * 0.5) * 0.04 - 0.06, f);
      s.headY = lerp(s.headY, sin(t * 0.35) * 0.05, f);
      s.headZ = lerp(s.headZ, sin(t * 0.45 + 1.0) * 0.02, f);
      s.laX = lerp(s.laX, -PI / 2.2 + sin(t * 0.6) * 0.02, f);
      s.raX = lerp(s.raX, -PI / 2.2 + sin(t * 0.6 + 0.5) * 0.02, f);
      s.laZ = lerp(s.laZ, 0, f);
      s.raZ = lerp(s.raZ, 0, f);
      s.laForeX = lerp(s.laForeX, -PI / 4, f);
      s.raForeX = lerp(s.raForeX, -PI / 4, f);
      s.llX = lerp(s.llX, -PI / 2, f);
      s.rlX = lerp(s.rlX, -PI / 2, f);
      s.llCalfX = lerp(s.llCalfX, PI / 2, f);
      s.rlCalfX = lerp(s.rlCalfX, PI / 2, f);
    } else if (animation === "type") {
      s.breathScale = lerp(s.breathScale, 1 + sin(t * 1.8) * 0.005, f);
      // Drop body so butt is on the chair seat + subtle breathing bob
      bodyDY = SEATED_DROP + sin(t * 1.8) * 0.002;
      bodyDX = sin(t * 0.5) * 0.002;
      s.headX = lerp(s.headX, -0.12 + sin(t * 1.2) * 0.03, f);
      s.headY = lerp(s.headY, 0, f);
      s.headZ = lerp(s.headZ, sin(t * 0.8) * 0.02, f);
      s.laX = lerp(s.laX, -0.65 + sin(t * 5.5) * 0.06, f);
      s.raX = lerp(s.raX, -0.65 + sin(t * 5.5 + 1.2) * 0.06, f);
      s.laZ = lerp(s.laZ, 0.15, f);
      s.raZ = lerp(s.raZ, -0.15, f);
      s.laForeX = lerp(s.laForeX, -0.8 + sin(t * 8) * 0.08, f);
      s.raForeX = lerp(s.raForeX, -0.8 + sin(t * 8 + 1.8) * 0.08, f);
      // Legs in seated position for typing too
      s.llX = lerp(s.llX, -PI / 2, f);
      s.rlX = lerp(s.rlX, -PI / 2, f);
      s.llCalfX = lerp(s.llCalfX, PI / 2, f);
      s.rlCalfX = lerp(s.rlCalfX, PI / 2, f);
    }

    // Apply smoothed values to refs
    if (refs.body.current) {
      // We don't set position directly — the parent handles base position.
      // We offset Y and X for animation bounce/sway (and seated drop for sit/type).
      refs.body.current.position.y = bodyDY;
      refs.body.current.position.x = bodyDX;
    }
    if (refs.torso.current) {
      refs.torso.current.scale.x = s.breathScale;
      refs.torso.current.scale.z = s.breathScale;
    }
    if (refs.head.current) {
      refs.head.current.rotation.x = s.headX;
      refs.head.current.rotation.y = s.headY;
      refs.head.current.rotation.z = s.headZ;
    }
    if (refs.leftUpperArm.current) {
      refs.leftUpperArm.current.rotation.x = s.laX;
      refs.leftUpperArm.current.rotation.z = s.laZ;
    }
    if (refs.rightUpperArm.current) {
      refs.rightUpperArm.current.rotation.x = s.raX;
      refs.rightUpperArm.current.rotation.z = s.raZ;
    }
    if (refs.leftForearm.current) refs.leftForearm.current.rotation.x = s.laForeX;
    if (refs.rightForearm.current) refs.rightForearm.current.rotation.x = s.raForeX;
    if (refs.leftThigh.current) refs.leftThigh.current.rotation.x = s.llX;
    if (refs.rightThigh.current) refs.rightThigh.current.rotation.x = s.rlX;
    if (refs.leftCalf.current) refs.leftCalf.current.rotation.x = s.llCalfX;
    if (refs.rightCalf.current) refs.rightCalf.current.rotation.x = s.rlCalfX;
  });
}
