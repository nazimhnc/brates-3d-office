// MannequinAvatar — thin wrapper that adapts the MainScene's expected API
// to the HumanAvatar component.

import { HumanAvatar, type HumanAvatarAppearance } from "../humans/HumanAvatar";

export interface MannequinAvatarProps {
  name: string;
  role: string;
  appearance: Partial<HumanAvatarAppearance>;
  status: string;
  targetPosition: { x: number; y: number; z: number };
  spawnOrder: number;
  onClick: () => void;
  selected: boolean;
}

const STATUS_TO_ANIM: Record<string, "idle" | "walk" | "sit" | "type"> = {
  idle: "idle",
  spawning: "walk",
  thinking: "idle",
  coding: "type",
  reviewing: "sit",
  messaging: "type",
  complete: "idle",
  error: "idle",
};

const DEFAULT_APPEARANCE: HumanAvatarAppearance = {
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

export function MannequinAvatar({
  name,
  role,
  appearance,
  status,
  targetPosition,
  onClick,
  selected,
}: MannequinAvatarProps) {
  const merged: HumanAvatarAppearance = { ...DEFAULT_APPEARANCE, ...appearance };
  const anim = STATUS_TO_ANIM[status] ?? "idle";

  return (
    <HumanAvatar
      appearance={merged}
      position={[targetPosition.x, targetPosition.y, targetPosition.z]}
      animation={anim}
      selected={selected}
      onClick={onClick}
      name={name}
      role={role}
    />
  );
}

export default MannequinAvatar;
