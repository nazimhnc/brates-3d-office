import { useMemo, useCallback } from "react";
import { Environment, AdaptiveDpr, AdaptiveEvents, ContactShadows } from "@react-three/drei";

import { useOfficeStore } from "../../stores/officeStore";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE } from "../humans/HumanAvatar";
import { UserAvatarComponent } from "../humans/UserAvatar";
import { CameraController } from "./CameraController";
import { ClickHandler } from "./ClickHandler";
import { PostProcessing } from "./PostProcessing";
import { SceneLighting } from "./SceneLighting";
import { BuildingShell } from "./BuildingShell";
import { FloorContent } from "./FloorContent";
import { useSimulation } from "../../hooks/useSimulation";
import { useMovement } from "../../hooks/useMovement";
import { useUserControls } from "../../hooks/useUserControls";
import type { Agent, AgentStatus } from "../../types";
import type { AvatarAnimation } from "../humans/AvatarAnimations";

// ── Constants ────────────────────────────────────────────────────────────────

const FLOOR_SIZE = 20;
const FLOOR_HEIGHT = 4;

// ── Status -> Animation mapping ─────────────────────────────────────────────

function statusToAnimation(status: AgentStatus, isWalking: boolean): AvatarAnimation {
  if (isWalking) return "walk";
  switch (status) {
    case "working": return "type";
    case "meeting": return "idle";
    case "break":   return "idle";
    case "idle":
    default:        return "idle";
  }
}

// ── Agent Layer ─────────────────────────────────────────────────────────────

function AgentLayer({ agents, floorY }: { agents: Agent[]; floorY: number }) {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  const handleAgentClick = useCallback(
    (agentId: string) => {
      selectAgent(selectedAgentId === agentId ? null : agentId);
    },
    [selectedAgentId, selectAgent],
  );

  return (
    <group>
      {agents.map((agent) => (
        <HumanAvatar
          key={agent.id}
          appearance={{
            ...DEFAULT_HUMAN_APPEARANCE,
            bodyType: agent.gender,
            skinTone: agent.appearance.skinColor,
            hairColor: agent.appearance.hairColor,
            hairStyle: agent.appearance.hairStyle === "medium" ? "short" : agent.appearance.hairStyle,
            shirtColor: agent.appearance.shirtColor,
            pantsColor: agent.appearance.pantsColor,
            shoeColor: agent.appearance.shoeColor,
            height: agent.appearance.height,
            eyeColor: agent.appearance.eyeColor,
          }}
          position={[agent.position[0], floorY, agent.position[2]]}
          rotation={agent.facingAngle}
          animation={statusToAnimation(agent.status, agent.movementState === 'walking')}
          name={agent.name}
          role={agent.role}
          selected={selectedAgentId === agent.id}
          onClick={() => handleAgentClick(agent.id)}
        />
      ))}
    </group>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MainScene — Slim compositor. Under 100 lines of JSX.
// ══════════════════════════════════════════════════════════════════════════════

export function MainScene() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const selectedFloorId = useOfficeStore((s) => s.selectedFloorId);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const viewMode = useOfficeStore((s) => s.viewMode);

  // Simulation systems (called once — drive the office life)
  useSimulation();
  useMovement();
  useUserControls();

  const activeFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId) ?? floors[0],
    [floors, selectedFloorId],
  );

  const floorAgents = useMemo(
    () => agents.filter((a) => a.floorId === activeFloor?.id),
    [agents, activeFloor],
  );

  const floorY = viewingFloorLevel * FLOOR_HEIGHT;

  return (
    <>
      {/* Performance adapters */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* Atmosphere */}
      <fog attach="fog" args={["#e8e0f5", viewMode === "interior" ? 50 : 30, viewMode === "interior" ? 150 : 80]} />
      <color attach="background" args={["#f0eaf8"]} />
      <Environment preset="city" background={false} />

      {/* Lighting */}
      <SceneLighting floorY={floorY} />

      {/* Contact shadows (exterior only) */}
      {viewMode !== "interior" && (
        <ContactShadows
          position={[0, floorY + 0.01, 0]}
          opacity={0.3}
          scale={FLOOR_SIZE}
          blur={2}
          far={4}
          resolution={256}
          color="#3a2060"
        />
      )}

      {/* Building structure */}
      <BuildingShell floors={floors} activeFloorId={selectedFloorId} viewMode={viewMode} />

      {/* Furniture for active floor */}
      {activeFloor && <FloorContent floor={activeFloor} yOffset={floorY} />}

      {/* Agents on active floor */}
      <AgentLayer agents={floorAgents} floorY={floorY} />

      {/* User avatar */}
      <UserAvatarComponent />

      {/* Interaction */}
      <ClickHandler />
      <CameraController />

      {/* Post-processing (disabled by default) */}
      <PostProcessing enabled={false} />
    </>
  );
}

export default MainScene;
