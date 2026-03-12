// ══════════════════════════════════════════════════════════════════════════════
// AvatarGroup — renders multiple HumanAvatar instances on a floor plane.
//
// Maps agents (with position, appearance, and animation state) to HumanAvatar
// components. Handles click selection and provides a ground plane.
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE, type HumanAvatarAppearance } from "./HumanAvatar";
import type { AvatarAnimation } from "./AvatarAnimations";

// ── Agent type for this group ──

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  /** Optional custom appearance — falls back to defaults derived from role */
  appearance?: Partial<HumanAvatarAppearance>;
  /** Optional explicit position — auto-generated if not provided */
  position?: [number, number, number];
}

// ── Props ──

export interface AvatarGroupProps {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  selectedId: string | null;
}

// ── Status to animation mapping ──

function statusToAnimation(status: string): AvatarAnimation {
  switch (status) {
    case "coding":
    case "typing":
      return "type";
    case "reviewing":
    case "sitting":
      return "sit";
    case "spawning":
    case "walking":
      return "walk";
    case "thinking":
    case "idle":
    case "messaging":
    case "active":
    case "complete":
    case "error":
    default:
      return "idle";
  }
}

// ── Auto-position grid ──

function generateGridPositions(count: number): [number, number, number][] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const spacing = 2.8;
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push([
      (col - (cols - 1) / 2) * spacing,
      0,
      row * spacing - 2,
    ]);
  }
  return positions;
}

// ── Role-based default appearances ──
// Gives each role a distinct visual identity when no custom appearance is set.

const ROLE_APPEARANCES: Record<string, Partial<HumanAvatarAppearance>> = {
  architect: {
    shirtColor: "#1a3a5c",
    pantsColor: "#152a40",
    hairStyle: "short",
    hairColor: "#2a1a10",
    bodyType: "male",
    height: 1.05,
  },
  "design-authority": {
    shirtColor: "#e05590",
    pantsColor: "#383050",
    hairStyle: "long",
    hairColor: "#6a3a50",
    bodyType: "female",
    height: 0.95,
  },
  "web-engineer": {
    shirtColor: "#7c5cbf",
    pantsColor: "#3d3450",
    hairStyle: "curly",
    hairColor: "#302030",
    bodyType: "male",
    height: 1.0,
  },
  "backend-engineer": {
    shirtColor: "#2ecc71",
    pantsColor: "#2c3e50",
    hairStyle: "buzz",
    hairColor: "#2a1a10",
    bodyType: "male",
    height: 1.02,
  },
  "ai-engineer": {
    shirtColor: "#d4933a",
    pantsColor: "#5a4a3a",
    hairStyle: "short",
    hairColor: "#4a3020",
    bodyType: "female",
    height: 0.97,
  },
  tester: {
    shirtColor: "#c0392b",
    pantsColor: "#34404f",
    hairStyle: "ponytail",
    hairColor: "#3a2820",
    bodyType: "female",
    height: 0.96,
  },
  researcher: {
    shirtColor: "#2980b9",
    pantsColor: "#1a2a3c",
    hairStyle: "bun",
    hairColor: "#1a1018",
    bodyType: "female",
    height: 0.98,
  },
  devsecops: {
    shirtColor: "#34495e",
    pantsColor: "#1c1c28",
    hairStyle: "buzz",
    hairColor: "#111111",
    bodyType: "male",
    height: 1.04,
  },
  "mobile-wrapper": {
    shirtColor: "#16a085",
    pantsColor: "#2c3e50",
    hairStyle: "short",
    hairColor: "#4a3528",
    bodyType: "male",
    height: 0.99,
  },
};

// Skin tone palette — cycle through for variety
const SKIN_TONES = [
  "#f5e0c8", // light
  "#e8c8a0", // medium-light
  "#d4a574", // medium
  "#c08050", // medium-dark
  "#a67c52", // tan
  "#8a6038", // brown
];

function resolveAppearance(
  agent: Agent,
  index: number,
): HumanAvatarAppearance {
  const roleDefaults = ROLE_APPEARANCES[agent.role.toLowerCase()] ?? {};
  const skinTone = SKIN_TONES[index % SKIN_TONES.length];

  return {
    ...DEFAULT_HUMAN_APPEARANCE,
    skinTone,
    ...roleDefaults,
    ...agent.appearance,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function AvatarGroup({ agents, onSelectAgent, selectedId }: AvatarGroupProps) {
  const positions = useMemo(() => generateGridPositions(agents.length), [agents.length]);

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#ede5f8" roughness={0.95} metalness={0} />
      </mesh>

      {/* Grid lines on floor for spatial reference */}
      <gridHelper
        args={[40, 20, "#d8d0e8", "#e0d8f0"]}
        position={[0, 0.002, 0]}
      />

      {/* Avatars */}
      {agents.map((agent, i) => {
        const pos = agent.position ?? positions[i];
        const anim = statusToAnimation(agent.status);
        const appearance = resolveAppearance(agent, i);

        return (
          <HumanAvatar
            key={agent.id}
            appearance={appearance}
            position={pos}
            animation={anim}
            selected={selectedId === agent.id}
            onClick={() => onSelectAgent(agent.id)}
            name={agent.name}
            role={agent.role}
          />
        );
      })}
    </>
  );
}

export default AvatarGroup;
