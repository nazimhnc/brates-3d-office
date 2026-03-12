// ══════════════════════════════════════════════════════════════════════════════
// AvatarAnimations — type exports for the GLB-based avatar system.
//
// The old procedural bone-animation hooks have been removed. Animations are now
// handled inside HumanAvatar.tsx via simple group transforms on the cloned GLB
// scene (Y offset, subtle rotation, breathing scale).
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Animation states supported by the avatar system.
 */
export type AvatarAnimation = "idle" | "walk" | "sit" | "type";
