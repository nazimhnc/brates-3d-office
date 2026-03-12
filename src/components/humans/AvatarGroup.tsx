// ══════════════════════════════════════════════════════════════════════════════
// AvatarGroup — renders multiple HumanAvatar instances on a floor plane.
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { HumanAvatar, DEFAULT_APPEARANCE } from "./HumanAvatar";
import type { AvatarAnimation } from "./AvatarAnimations";
import type { AgentAppearance } from "../../types";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  gender?: "male" | "female";
  appearance?: Partial<AgentAppearance>;
  position?: [number, number, number];
}

export interface AvatarGroupProps {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  selectedId: string | null;
}

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
    default:
      return "idle";
  }
}

function generateGridPositions(count: number): [number, number, number][] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const spacing = 2.8;
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push([(col - (cols - 1) / 2) * spacing, 0, row * spacing - 2]);
  }
  return positions;
}

export function AvatarGroup({
  agents,
  onSelectAgent,
  selectedId,
}: AvatarGroupProps) {
  const positions = useMemo(
    () => generateGridPositions(agents.length),
    [agents.length],
  );

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#ede5f8" roughness={0.95} metalness={0} />
      </mesh>
      <gridHelper
        args={[40, 20, "#d8d0e8", "#e0d8f0"]}
        position={[0, 0.002, 0]}
      />

      {agents.map((agent, i) => {
        const pos = agent.position ?? positions[i];
        const anim = statusToAnimation(agent.status);
        const appearance: AgentAppearance = {
          ...DEFAULT_APPEARANCE,
          ...agent.appearance,
        };

        return (
          <HumanAvatar
            key={agent.id}
            appearance={appearance}
            bodyType={agent.gender ?? "male"}
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
